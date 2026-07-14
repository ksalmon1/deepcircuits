/**
 * The slice of the emulator that GPIO-protocol responders need: the cycle
 * clock, cycle-accurate scheduling, and the ability to drive a board input
 * pin. Injected so responders are unit-testable without an AVRRunner.
 */
export interface GpioHostOps {
  /** Current CPU cycle count. */
  now(): number;
  /** Run a callback after N cycles of emulated time. */
  schedule(callback: () => void, afterCycles: number): void;
  /** Drive a board pin's input level (as the external device). */
  drive(arduinoPin: number, level: boolean): void;
}

/** 16 MHz AVR: cycles per microsecond of emulated time. */
export const CYCLES_PER_US = 16;
