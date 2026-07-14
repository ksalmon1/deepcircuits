/**
 * ATmega emulator built on avr8js — the open-source AVR core that powers
 * Wokwi. Executes compiled sketch hex in the browser and exposes exactly
 * what the circuit layer needs:
 *
 *  - snapshotPins(): per-pin drive state (output level, PWM duty, pull-up)
 *    used to inject the board into the SPICE netlist
 *  - setDigitalInput()/setAnalogVoltage(): SPICE node voltages fed back so
 *    digitalRead()/analogRead() see the real circuit
 *  - serial TX/RX callbacks for the Serial Monitor
 *
 * The specific chip (ATmega328p for the Uno/Nano, ATmega2560 for the Mega)
 * is supplied as a BoardProfile: avr8js already ships every port config and
 * the shared timer/USART peripherals are register-compatible, so switching
 * boards is pure configuration — no per-chip emulator code lives here.
 */
import {
  avrInstruction,
  AVRIOPort,
  AVRTimer,
  AVRUSART,
  AVRADC,
  AVRTWI,
  AVRSPI,
  CPU,
  PinState,
} from 'avr8js';
import MemoryMap from 'nrf-intel-hex';
import { BoardProfile, makeIOPorts } from './boardProfiles';
import { I2CBus } from '@/simulation/bus/I2CBus';

const CLOCK_HZ = 16_000_000;
// Execute in ~16ms slices so the UI thread stays responsive.
const SLICE_MS = 16;
const MAX_CYCLES_PER_SLICE = CLOCK_HZ * 0.05; // never simulate >50ms per slice

export type ArduinoPinMode = 'output' | 'input' | 'input_pullup';

export interface ArduinoPinSnapshot {
  mode: ArduinoPinMode;
  /** Instantaneous output level (only meaningful for outputs). */
  level: boolean;
  /**
   * Fraction of time the pin was driven high since the last snapshot.
   * For PWM pins (analogWrite) this is the duty cycle.
   */
  duty: number;
  /** True when the pin toggled fast enough to be treated as PWM. */
  pwm: boolean;
}

interface PinTracker {
  isHigh: boolean;
  lastChangeCycles: number;
  highCycles: number;
  transitions: number;
  windowStartCycles: number;
}

export class AVRRunner {
  readonly program: Uint16Array;
  readonly cpu: CPU;
  readonly timer0: AVRTimer;
  readonly timer1: AVRTimer;
  readonly timer2: AVRTimer;
  readonly ports: Record<string, AVRIOPort>;
  readonly usart: AVRUSART;
  readonly adc: AVRADC;
  readonly twi: AVRTWI;
  readonly spi: AVRSPI;
  /** Virtual I2C bus: register decoders (displays, sensors) by address. */
  readonly i2cBus: I2CBus;
  /**
   * SPI byte hook: return the MISO response for a MOSI byte. When unset the
   * transfer completes with 0xFF (an undriven MISO line).
   */
  onSpiByte: ((mosiByte: number) => number) | null = null;

  /** Called for every byte the sketch writes to Serial. */
  onSerialByte: ((byte: number) => void) | null = null;
  /** Called whenever any GPIO pin changes (throttling is the caller's job). */
  onPinChange: (() => void) | null = null;

  private readonly profile: BoardProfile;
  private stopped = true;
  private timeoutId: ReturnType<typeof setTimeout> | null = null;
  private lastSliceWallTime = 0;
  private rxQueue: number[] = [];
  private trackers: PinTracker[] = [];

  constructor(hex: string, profile: BoardProfile) {
    this.profile = profile;
    this.program = new Uint16Array(profile.flashBytes / 2);
    const flash = new Uint8Array(this.program.buffer);
    for (const [address, block] of MemoryMap.fromHex(hex)) {
      flash.set(block, address);
    }
    // Size the CPU's data space to the chip's SRAM: the AVR stack starts at
    // RAMEND, and on the 2560 that is well past avr8js's default, so an
    // under-sized data array would corrupt every push/return.
    this.cpu = new CPU(this.program, profile.sramBytes);
    const [t0, t1, t2] = profile.timerConfigs;
    this.timer0 = new AVRTimer(this.cpu, t0);
    this.timer1 = new AVRTimer(this.cpu, t1);
    this.timer2 = new AVRTimer(this.cpu, t2);
    this.ports = makeIOPorts(profile, this.cpu);
    this.usart = new AVRUSART(this.cpu, profile.usartConfig, CLOCK_HZ);
    this.adc = new AVRADC(this.cpu, profile.adcConfig);
    this.twi = new AVRTWI(this.cpu, profile.twiConfig, CLOCK_HZ);
    this.i2cBus = new I2CBus(this.twi);
    this.twi.eventHandler = this.i2cBus;
    this.spi = new AVRSPI(this.cpu, profile.spiConfig, CLOCK_HZ);
    this.spi.onByte = (value: number) => {
      const response = this.onSpiByte ? this.onSpiByte(value & 0xff) : 0xff;
      this.spi.completeTransfer(response & 0xff);
    };

    for (let pin = 0; pin < profile.pinCount; pin++) {
      this.trackers.push({
        isHigh: false,
        lastChangeCycles: 0,
        highCycles: 0,
        transitions: 0,
        windowStartCycles: 0,
      });
    }

    this.usart.onByteTransmit = (value: number) => {
      this.onSerialByte?.(value);
    };
    this.usart.onRxComplete = () => this.flushRxQueue();

    for (const port of Object.values(this.ports)) {
      port.addListener(() => {
        this.updateTrackers();
        this.onPinChange?.();
      });
    }
  }

  get isRunning(): boolean {
    return !this.stopped;
  }

  start(): void {
    if (!this.stopped) return;
    this.stopped = false;
    this.lastSliceWallTime = performance.now();
    this.scheduleSlice();
  }

  stop(): void {
    this.stopped = true;
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  /** Queue text for the sketch's Serial.read(). */
  serialWrite(text: string): void {
    for (let i = 0; i < text.length; i++) {
      this.rxQueue.push(text.charCodeAt(i) & 0xff);
    }
    this.flushRxQueue();
  }

  /** Feed a digital input level (from the solved circuit) into the chip. */
  setDigitalInput(arduinoPin: number, high: boolean): void {
    const mapping = this.profile.pinMapping[arduinoPin];
    if (!mapping) return; // ADC-only pad: no GPIO register to drive
    this.ports[mapping.port]?.setPin(mapping.bit, high);
  }

  /** Current mode of a pin, without disturbing the PWM duty window. */
  getPinMode(arduinoPin: number): ArduinoPinMode {
    const mapping = this.profile.pinMapping[arduinoPin];
    if (!mapping) return 'input';
    return this.modeFor(this.ports[mapping.port].pinState(mapping.bit));
  }

  /** Instantaneous logic level the chip is driving on a pin. */
  getPinLevel(arduinoPin: number): boolean {
    const mapping = this.profile.pinMapping[arduinoPin];
    if (!mapping) return false;
    return this.ports[mapping.port].pinState(mapping.bit) === PinState.High;
  }

  /**
   * Watch a GPIO pin at emulation speed (cycle-accurate, unlike the solved-
   * circuit cadence). Used by protocol decoders that latch on pin edges,
   * e.g. a character LCD sampling its data pins on the E strobe. Returns an
   * unsubscribe function.
   */
  watchPin(arduinoPin: number, onChange: (level: boolean) => void): () => void {
    const mapping = this.profile.pinMapping[arduinoPin];
    if (!mapping) return () => {};
    const port = this.ports[mapping.port];
    let last = port.pinState(mapping.bit) === PinState.High;
    const listener = () => {
      const level = port.pinState(mapping.bit) === PinState.High;
      if (level !== last) {
        last = level;
        onChange(level);
      }
    };
    port.addListener(listener);
    return () => port.removeListener(listener);
  }

  /** Feed an analog voltage (volts, from the solved circuit) into an ADC channel. */
  setAnalogVoltage(channel: number, volts: number): void {
    if (channel >= 0 && channel < this.adc.channelValues.length) {
      this.adc.channelValues[channel] = Math.max(0, Math.min(5, volts));
    }
  }

  /**
   * Report every pin's drive state and reset the PWM duty window.
   * Call at the SPICE rerun cadence (tens of ms) so duty averages are stable.
   */
  snapshotPins(): ArduinoPinSnapshot[] {
    this.updateTrackers();
    const now = this.cpu.cycles;
    return Array.from({ length: this.profile.pinCount }, (_, pin) => {
      const mapping = this.profile.pinMapping[pin];
      if (!mapping) {
        return { mode: 'input' as ArduinoPinMode, level: false, duty: 0, pwm: false };
      }
      const state = this.ports[mapping.port].pinState(mapping.bit);
      const tracker = this.trackers[pin];
      // Flush the currently-running level into the window before reading it.
      const sinceChange = now - tracker.lastChangeCycles;
      const highCycles = tracker.highCycles + (tracker.isHigh ? sinceChange : 0);
      const windowCycles = now - tracker.windowStartCycles;
      const duty = windowCycles > 0 ? highCycles / windowCycles : (tracker.isHigh ? 1 : 0);
      const pwm = tracker.transitions >= 4 && windowCycles > 0;
      // Reset the measurement window.
      tracker.highCycles = 0;
      tracker.transitions = 0;
      tracker.windowStartCycles = now;
      tracker.lastChangeCycles = now;

      return {
        mode: this.modeFor(state),
        level: state === PinState.High,
        duty: Math.max(0, Math.min(1, duty)),
        pwm,
      };
    });
  }

  private modeFor(state: PinState): ArduinoPinMode {
    if (state === PinState.Input) return 'input';
    if (state === PinState.InputPullUp) return 'input_pullup';
    return 'output';
  }

  private updateTrackers(): void {
    const now = this.cpu.cycles;
    for (let pin = 0; pin < this.profile.pinCount; pin++) {
      const mapping = this.profile.pinMapping[pin];
      if (!mapping) continue;
      const isHigh = this.ports[mapping.port].pinState(mapping.bit) === PinState.High;
      const tracker = this.trackers[pin];
      if (isHigh !== tracker.isHigh) {
        const sinceChange = now - tracker.lastChangeCycles;
        if (tracker.isHigh) tracker.highCycles += sinceChange;
        tracker.isHigh = isHigh;
        tracker.lastChangeCycles = now;
        tracker.transitions++;
      }
    }
  }

  private flushRxQueue(): void {
    while (this.rxQueue.length > 0 && !this.usart.rxBusy) {
      const byte = this.rxQueue[0];
      if (this.usart.writeByte(byte)) {
        this.rxQueue.shift();
      } else {
        break; // receiver not ready (RX disabled or busy); retry later
      }
    }
  }

  private scheduleSlice(): void {
    this.timeoutId = setTimeout(() => this.runSlice(), SLICE_MS);
  }

  private runSlice(): void {
    if (this.stopped) return;
    const now = performance.now();
    const elapsedMs = Math.min(now - this.lastSliceWallTime, 100);
    this.lastSliceWallTime = now;
    // Track wall-clock time so millis()/delay() run at real speed, capped so
    // a background tab doesn't produce a huge catch-up burst.
    const targetCycles = this.cpu.cycles + Math.min(
      (elapsedMs / 1000) * CLOCK_HZ,
      MAX_CYCLES_PER_SLICE,
    );
    const deadline = now + SLICE_MS * 0.75;
    while (this.cpu.cycles < targetCycles) {
      avrInstruction(this.cpu);
      this.cpu.tick();
      // Checking the wall clock is comparatively expensive; do it rarely.
      if ((this.cpu.cycles & 0xfff) === 0 && performance.now() > deadline) {
        break; // machine too slow for realtime; let the UI breathe
      }
    }
    this.flushRxQueue();
    this.scheduleSlice();
  }
}
