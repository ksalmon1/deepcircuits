/**
 * ATmega328p (Arduino Uno) emulator built on avr8js — the open-source AVR
 * core that powers Wokwi. Executes compiled sketch hex in the browser and
 * exposes exactly what the circuit layer needs:
 *
 *  - snapshotPins(): per-pin drive state (output level, PWM duty, pull-up)
 *    used to inject the board into the SPICE netlist
 *  - setDigitalInput()/setAnalogVoltage(): SPICE node voltages fed back so
 *    digitalRead()/analogRead() see the real circuit
 *  - serial TX/RX callbacks for the Serial Monitor
 */
import {
  avrInstruction,
  AVRIOPort,
  AVRTimer,
  AVRUSART,
  AVRADC,
  CPU,
  PinState,
  adcConfig,
  portBConfig,
  portCConfig,
  portDConfig,
  timer0Config,
  timer1Config,
  timer2Config,
  usart0Config,
} from 'avr8js';
import MemoryMap from 'nrf-intel-hex';

const FLASH_BYTES = 0x8000; // 32KB
const CLOCK_HZ = 16_000_000;
// Execute in ~16ms slices so the UI thread stays responsive.
const SLICE_MS = 16;
const MAX_CYCLES_PER_SLICE = CLOCK_HZ * 0.05; // never simulate >50ms per slice

/** Arduino digital pin numbering: 0-13 digital, 14-19 = A0-A5. */
export const ARDUINO_PIN_COUNT = 20;

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

interface PortMapping {
  port: 'B' | 'C' | 'D';
  bit: number;
}

/** Map an Arduino pin number to its AVR port and bit. */
function portMapping(arduinoPin: number): PortMapping {
  if (arduinoPin < 8) return { port: 'D', bit: arduinoPin };
  if (arduinoPin < 14) return { port: 'B', bit: arduinoPin - 8 };
  return { port: 'C', bit: arduinoPin - 14 };
}

interface PinTracker {
  isHigh: boolean;
  lastChangeCycles: number;
  highCycles: number;
  transitions: number;
  windowStartCycles: number;
}

export class AVRRunner {
  readonly program = new Uint16Array(FLASH_BYTES / 2);
  readonly cpu: CPU;
  readonly timer0: AVRTimer;
  readonly timer1: AVRTimer;
  readonly timer2: AVRTimer;
  readonly portB: AVRIOPort;
  readonly portC: AVRIOPort;
  readonly portD: AVRIOPort;
  readonly usart: AVRUSART;
  readonly adc: AVRADC;

  /** Called for every byte the sketch writes to Serial. */
  onSerialByte: ((byte: number) => void) | null = null;
  /** Called whenever any GPIO pin changes (throttling is the caller's job). */
  onPinChange: (() => void) | null = null;

  private stopped = true;
  private timeoutId: ReturnType<typeof setTimeout> | null = null;
  private lastSliceWallTime = 0;
  private rxQueue: number[] = [];
  private trackers: PinTracker[] = [];

  constructor(hex: string) {
    const flash = new Uint8Array(this.program.buffer);
    for (const [address, block] of MemoryMap.fromHex(hex)) {
      flash.set(block, address);
    }
    this.cpu = new CPU(this.program);
    this.timer0 = new AVRTimer(this.cpu, timer0Config);
    this.timer1 = new AVRTimer(this.cpu, timer1Config);
    this.timer2 = new AVRTimer(this.cpu, timer2Config);
    this.portB = new AVRIOPort(this.cpu, portBConfig);
    this.portC = new AVRIOPort(this.cpu, portCConfig);
    this.portD = new AVRIOPort(this.cpu, portDConfig);
    this.usart = new AVRUSART(this.cpu, usart0Config, CLOCK_HZ);
    this.adc = new AVRADC(this.cpu, adcConfig);

    for (let pin = 0; pin < ARDUINO_PIN_COUNT; pin++) {
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

    const trackPort = (port: AVRIOPort) => {
      port.addListener(() => {
        this.updateTrackers();
        this.onPinChange?.();
      });
    };
    trackPort(this.portB);
    trackPort(this.portC);
    trackPort(this.portD);
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
    const { port, bit } = portMapping(arduinoPin);
    this.portFor(port).setPin(bit, high);
  }

  /** Current mode of a pin, without disturbing the PWM duty window. */
  getPinMode(arduinoPin: number): ArduinoPinMode {
    const { port, bit } = portMapping(arduinoPin);
    const state = this.portFor(port).pinState(bit);
    if (state === PinState.Input) return 'input';
    if (state === PinState.InputPullUp) return 'input_pullup';
    return 'output';
  }

  /** Feed an analog voltage (volts, from the solved circuit) into ADC channel 0-5. */
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
    return Array.from({ length: ARDUINO_PIN_COUNT }, (_, pin) => {
      const { port, bit } = portMapping(pin);
      const state = this.portFor(port).pinState(bit);
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

      const mode: ArduinoPinMode =
        state === PinState.Input ? 'input'
        : state === PinState.InputPullUp ? 'input_pullup'
        : 'output';
      return {
        mode,
        level: state === PinState.High,
        duty: Math.max(0, Math.min(1, duty)),
        pwm,
      };
    });
  }

  private portFor(port: 'B' | 'C' | 'D'): AVRIOPort {
    return port === 'B' ? this.portB : port === 'C' ? this.portC : this.portD;
  }

  private updateTrackers(): void {
    const now = this.cpu.cycles;
    for (let pin = 0; pin < ARDUINO_PIN_COUNT; pin++) {
      const { port, bit } = portMapping(pin);
      const isHigh = this.portFor(port).pinState(bit) === PinState.High;
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
