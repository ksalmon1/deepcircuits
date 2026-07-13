/**
 * Per-chip descriptions that let one avr8js-backed runner drive several
 * ATmega boards. avr8js already ships every port config we need (portA..portL
 * for the ATmega2560, plus the 328p's B/C/D), and the shared peripherals
 * (timer0/1/2, USART0, ADC) sit at register addresses that are compatible
 * across the 328p and the 2560 — so a board is fully described by data:
 *
 *  - which ports exist and their avr8js config,
 *  - its flash and SRAM sizes,
 *  - the Arduino digital-pin -> (port, bit) map from its variant pins_arduino.h,
 *  - where its analog channels begin,
 *  - the peripheral interrupt-vector addresses (these differ per chip), and
 *  - which arduino-cli FQBN compiles for it.
 *
 * No emulator code is written here; this is configuration for avr8js.
 */
import {
  AVRIOPort,
  type AVRPortConfig,
  portAConfig,
  portBConfig,
  portCConfig,
  portDConfig,
  portEConfig,
  portFConfig,
  portGConfig,
  portHConfig,
  portJConfig,
  portKConfig,
  portLConfig,
  timer0Config,
  timer1Config,
  timer2Config,
  usart0Config,
  adcConfig,
} from 'avr8js';
import { LOGIC_FAMILIES, type LogicFamily } from '@/simulation/logic/logicFamilies';

type TimerConfig = typeof timer0Config;
type USARTConfig = typeof usart0Config;
type ADCConfig = typeof adcConfig;

/** Where an Arduino pin number lands on the AVR: a port letter and bit. */
export interface PinPort {
  port: string;
  bit: number;
}

export interface BoardProfile {
  /** Library component type, e.g. 'arduino-uno'. */
  type: string;
  /** arduino-cli fully-qualified board name used to compile the sketch. */
  fqbn: string;
  /** Program flash size in bytes (sizes the emulator's flash array). */
  flashBytes: number;
  /**
   * SRAM size passed to avr8js's CPU. avr8js allocates its data space as
   * `sramBytes + 0x100` (registers + low I/O), and the AVR stack starts at
   * RAMEND, so this must be at least `RAMEND + 1 - 0x100`. The 2560's stack
   * lives at 0x21FF; under-sizing this silently corrupts every push/return.
   */
  sramBytes: number;
  /** Total Arduino pin slots (digital + analog), i.e. snapshot length. */
  pinCount: number;
  /** Highest usable digital pin number (13 on the Uno, 53 on the Mega). */
  maxDigitalPin: number;
  /** Arduino pin number of A0 (14 on the 328p boards, 54 on the Mega). */
  analogBase: number;
  /** Number of analog channels (A0..A[n-1]). */
  analogChannels: number;
  /** Port configs to instantiate, keyed by port letter. */
  ports: Array<{ letter: string; config: Readonly<AVRPortConfig> }>;
  /**
   * Arduino pin -> port/bit, indexed by pin number. `null` marks an
   * ADC-only pad (the Nano's A6/A7) with no GPIO register.
   */
  pinMapping: Array<PinPort | null>;
  /**
   * Timer0/1/2, USART0, and ADC peripheral configs. avr8js ships these with
   * ATmega328p interrupt-vector addresses; the 2560's shared registers live
   * at the same addresses but its vectors are laid out differently, so the
   * Mega supplies configs with the corrected vector addresses.
   */
  timerConfigs: [TimerConfig, TimerConfig, TimerConfig];
  usartConfig: USARTConfig;
  adcConfig: ADCConfig;
  /** Input thresholds of the chip's GPIO (drives digitalRead co-simulation). */
  logicFamily: LogicFamily;
}

export function makeIOPorts(profile: BoardProfile, cpu: ConstructorParameters<typeof AVRIOPort>[0]): Record<string, AVRIOPort> {
  const ports: Record<string, AVRIOPort> = {};
  for (const { letter, config } of profile.ports) {
    ports[letter] = new AVRIOPort(cpu, config);
  }
  return ports;
}

// --- ATmega328p (Uno / Nano) -------------------------------------------------
// Digital 0-7 = PORTD0-7, 8-13 = PORTB0-5, A0-A5 (14-19) = PORTC0-5.
// The Nano additionally exposes A6/A7 as ADC-only pads (pins 20/21, no GPIO).

function atmega328pMapping(analogOnlyPads: number): Array<PinPort | null> {
  const map: Array<PinPort | null> = [];
  for (let pin = 0; pin < 8; pin++) map[pin] = { port: 'D', bit: pin };
  for (let pin = 8; pin < 14; pin++) map[pin] = { port: 'B', bit: pin - 8 };
  for (let pin = 14; pin < 20; pin++) map[pin] = { port: 'C', bit: pin - 14 };
  for (let i = 0; i < analogOnlyPads; i++) map[20 + i] = null; // A6/A7
  return map;
}

const PORTS_328P = [
  { letter: 'B', config: portBConfig },
  { letter: 'C', config: portCConfig },
  { letter: 'D', config: portDConfig },
];

// The 328p uses avr8js's peripheral configs unchanged (their vector
// addresses are already the ATmega328p's).
const PERIPHERALS_328P = {
  timerConfigs: [timer0Config, timer1Config, timer2Config] as [TimerConfig, TimerConfig, TimerConfig],
  usartConfig: usart0Config,
  adcConfig,
};

// The 328p's stack tops out at RAMEND 0x08FF; avr8js's default data space is
// larger, but pin this to the real value so every profile is explicit.
const SRAM_328P = 0x08ff + 1 - 0x100; // 0x800 (2KB)

const UNO_PROFILE: BoardProfile = {
  type: 'arduino-uno',
  fqbn: 'arduino:avr:uno',
  logicFamily: LOGIC_FAMILIES.AVR_5V,
  flashBytes: 0x8000, // 32KB
  sramBytes: SRAM_328P,
  pinCount: 20,
  maxDigitalPin: 13,
  analogBase: 14,
  analogChannels: 6,
  ports: PORTS_328P,
  pinMapping: atmega328pMapping(0),
  ...PERIPHERALS_328P,
};

const NANO_PROFILE: BoardProfile = {
  ...UNO_PROFILE,
  type: 'arduino-nano',
  fqbn: 'arduino:avr:nano',
  pinCount: 22, // includes the ADC-only A6/A7 pads
  analogChannels: 8,
  pinMapping: atmega328pMapping(2),
};

// --- ATmega2560 (Mega) -------------------------------------------------------
// The canonical Arduino Mega digital/analog map from the 'mega' variant's
// pins_arduino.h. Analog A0-A15 (pins 54-69) also work as digital I/O.
const MEGA_MAPPING: Array<PinPort | null> = (() => {
  const p = (port: string, bit: number): PinPort => ({ port, bit });
  return [
    p('E', 0), p('E', 1), p('E', 4), p('E', 5), p('G', 5), p('E', 3), // 0-5
    p('H', 3), p('H', 4), p('H', 5), p('H', 6), // 6-9
    p('B', 4), p('B', 5), p('B', 6), p('B', 7), // 10-13
    p('J', 1), p('J', 0), p('H', 1), p('H', 0), // 14-17
    p('D', 3), p('D', 2), p('D', 1), p('D', 0), // 18-21
    p('A', 0), p('A', 1), p('A', 2), p('A', 3), p('A', 4), p('A', 5), p('A', 6), p('A', 7), // 22-29
    p('C', 7), p('C', 6), p('C', 5), p('C', 4), p('C', 3), p('C', 2), p('C', 1), p('C', 0), // 30-37
    p('D', 7), p('G', 2), p('G', 1), p('G', 0), // 38-41
    p('L', 7), p('L', 6), p('L', 5), p('L', 4), p('L', 3), p('L', 2), p('L', 1), p('L', 0), // 42-49
    p('B', 3), p('B', 2), p('B', 1), p('B', 0), // 50-53
    p('F', 0), p('F', 1), p('F', 2), p('F', 3), p('F', 4), p('F', 5), p('F', 6), p('F', 7), // A0-A7 (54-61)
    p('K', 0), p('K', 1), p('K', 2), p('K', 3), p('K', 4), p('K', 5), p('K', 6), p('K', 7), // A8-A15 (62-69)
  ];
})();

// ATmega2560 peripheral configs: same registers as the 328p (avr8js already
// has them right) but the interrupt-vector *addresses* differ. These are the
// 2560 vector word-addresses (vector index * 2, since the 2560 uses 2-word
// JMP vectors) from its datasheet's Reset/Interrupt Vectors table. Without
// them the Arduino core's timer0 millis() interrupt fires into the wrong slot
// and the chip reset-loops before setup() ever runs.
const MEGA_PERIPHERALS = {
  timerConfigs: [
    { ...timer0Config, compAInterrupt: 0x2a, compBInterrupt: 0x2c, ovfInterrupt: 0x2e },
    { ...timer1Config, captureInterrupt: 0x20, compAInterrupt: 0x22, compBInterrupt: 0x24, compCInterrupt: 0x26, ovfInterrupt: 0x28 },
    { ...timer2Config, compAInterrupt: 0x1a, compBInterrupt: 0x1c, ovfInterrupt: 0x1e },
  ] as [TimerConfig, TimerConfig, TimerConfig],
  usartConfig: { ...usart0Config, rxCompleteInterrupt: 0x32, dataRegisterEmptyInterrupt: 0x34, txCompleteInterrupt: 0x36 },
  adcConfig: { ...adcConfig, adcInterrupt: 0x3a },
};

const MEGA_PROFILE: BoardProfile = {
  type: 'arduino-mega',
  fqbn: 'arduino:avr:mega',
  logicFamily: LOGIC_FAMILIES.AVR_5V,
  flashBytes: 0x40000, // 256KB
  // 2560 RAMEND = 0x21FF; avr8js data space = sramBytes + 0x100, so this must
  // cover the stack. 0x2200 - 0x100 = 0x2100 (8448 bytes / 8KB SRAM).
  sramBytes: 0x21ff + 1 - 0x100,
  pinCount: 70,
  maxDigitalPin: 53,
  analogBase: 54,
  analogChannels: 16,
  ...MEGA_PERIPHERALS,
  ports: [
    { letter: 'A', config: portAConfig },
    { letter: 'B', config: portBConfig },
    { letter: 'C', config: portCConfig },
    { letter: 'D', config: portDConfig },
    { letter: 'E', config: portEConfig },
    { letter: 'F', config: portFConfig },
    { letter: 'G', config: portGConfig },
    { letter: 'H', config: portHConfig },
    { letter: 'J', config: portJConfig },
    { letter: 'K', config: portKConfig },
    { letter: 'L', config: portLConfig },
  ],
  pinMapping: MEGA_MAPPING,
};

const PROFILES: Record<string, BoardProfile> = {
  [UNO_PROFILE.type]: UNO_PROFILE,
  [NANO_PROFILE.type]: NANO_PROFILE,
  [MEGA_PROFILE.type]: MEGA_PROFILE,
};

/** Board part types backed by an avr8js profile (accepts a 'wokwi-' prefix). */
export function boardProfileType(componentType: string): string {
  return componentType.toLowerCase().replace(/^wokwi-/, '');
}

export function getBoardProfile(componentType: string): BoardProfile | null {
  return PROFILES[boardProfileType(componentType)] ?? null;
}

export function isBoardType(componentType: string): boolean {
  return getBoardProfile(componentType) !== null;
}
