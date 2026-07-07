/**
 * Electrical model of an emulated control board for the SPICE layer.
 *
 * The emulator (AVRRunner) reports what the chip is doing with each pin;
 * this module translates that into per-pin netlist directives the SPICE
 * netlist generator understands:
 *
 *  - driven pins become DC voltage sources (PWM becomes duty * 5V, which is
 *    exact for the DC operating-point analysis we run)
 *  - INPUT_PULLUP pins become a 35kΩ resistor to an internal 5V rail
 *  - plain inputs and unconnected pins get a weak 10MΩ pulldown so every
 *    node stays solvable
 *  - the 5V / 3.3V header pins are always-on rails while simulating
 */
import type { ArduinoPinSnapshot } from './AVRRunner';

/** Board part types that are backed by the ATmega328p emulator. */
const EMULATED_BOARD_TYPES = new Set(['arduino-uno']);

export function isBoardType(componentType: string): boolean {
  return EMULATED_BOARD_TYPES.has(componentType.toLowerCase().replace(/^wokwi-/, ''));
}

export type BoardPinRole =
  | { kind: 'io'; arduinoPin: number }
  | { kind: 'rail'; volts: number };

/**
 * Resolve a board pin's display name to its role. Digital pins are named
 * '0'..'13'; analog pins 'A0'..'A5' (duplicated header pins carry a '.2'
 * suffix and share the same channel). Ground pins never reach this module —
 * their 'ground' signal already maps them to SPICE node 0.
 */
export function boardPinRole(pinName: string | undefined): BoardPinRole | null {
  if (!pinName) return null;
  const digital = pinName.match(/^(\d{1,2})$/);
  if (digital) {
    const pin = parseInt(digital[1], 10);
    return pin <= 13 ? { kind: 'io', arduinoPin: pin } : null;
  }
  const analog = pinName.match(/^A([0-5])(?:\.\d+)?$/);
  if (analog) {
    return { kind: 'io', arduinoPin: 14 + parseInt(analog[1], 10) };
  }
  if (pinName === '5V') return { kind: 'rail', volts: 5 };
  if (pinName === '3.3V') return { kind: 'rail', volts: 3.3 };
  return null; // VIN / RESET / IOREF / AREF: weak pulldown
}

/**
 * One directive per pin index (aligned with the component's pin order).
 * Exactly one of the fields is set; a null entry means "weak pulldown".
 */
export interface BoardPinDirective {
  /** Drive the pin node at this DC voltage. */
  volts?: number;
  /** Model the internal pull-up (resistor to the 5V rail). */
  pullup?: boolean;
}

export const BOARD_SUPPLY_VOLTS = 5;
export const BOARD_PULLUP_OHMS = 35_000; // ATmega328p internal pull-up (20k-50k)
export const BOARD_WEAK_PULLDOWN_OHMS = 10_000_000;

/**
 * Compute netlist directives for every board pin. `snapshot` is the
 * emulator's pin report, or null when no sketch is running (all I/O pins
 * then read as inputs, but the power rails stay live — like a real board
 * with an empty sketch).
 */
export function computeBoardDirectives(
  pins: Array<{ name?: string }> | undefined,
  snapshot: ArduinoPinSnapshot[] | null,
): Array<BoardPinDirective | null> {
  return (pins || []).map((pin) => {
    const role = boardPinRole(pin.name);
    if (!role) return null;
    if (role.kind === 'rail') return { volts: role.volts };
    const state = snapshot?.[role.arduinoPin];
    if (!state) return null;
    if (state.mode === 'output') {
      const level = state.pwm ? state.duty : (state.level ? 1 : 0);
      return { volts: Math.round(level * BOARD_SUPPLY_VOLTS * 1000) / 1000 };
    }
    if (state.mode === 'input_pullup') return { pullup: true };
    return null;
  });
}
