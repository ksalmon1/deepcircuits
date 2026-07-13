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
 *
 * Pin-name parsing keys off the board's profile (how many digital pins it
 * has, where its analog channels start) so the same logic serves the Uno,
 * Nano, and Mega. See boardProfiles.ts.
 */
import type { ArduinoPinSnapshot } from './AVRRunner';
import type { BoardProfile } from './boardProfiles';

export { isBoardType, getBoardProfile } from './boardProfiles';

export type BoardPinRole =
  | { kind: 'io'; arduinoPin: number }
  | { kind: 'rail'; volts: number };

/**
 * Resolve a board pin's display name to its role. Digital pins are named
 * '0'..'N'; analog pins 'A0'..'A[m]'. Duplicated header/ICSP pads carry a
 * '.N' suffix (e.g. '13.2', '5V.2') and share the same electrical net as
 * their base pin. Ground pins never reach this module — their 'ground'
 * signal already maps them to SPICE node 0. Names outside the board's pin
 * range (or non-numeric like AREF/SDA) return null → a weak pulldown.
 */
export function boardPinRole(pinName: string | undefined, profile: BoardProfile): BoardPinRole | null {
  if (!pinName) return null;
  const digital = pinName.match(/^(\d{1,3})(?:\.\d+)?$/);
  if (digital) {
    const pin = parseInt(digital[1], 10);
    return pin <= profile.maxDigitalPin ? { kind: 'io', arduinoPin: pin } : null;
  }
  const analog = pinName.match(/^A(\d{1,2})(?:\.\d+)?$/);
  if (analog) {
    const channel = parseInt(analog[1], 10);
    return channel < profile.analogChannels ? { kind: 'io', arduinoPin: profile.analogBase + channel } : null;
  }
  const base = pinName.replace(/\.\d+$/, '');
  if (base === '5V') return { kind: 'rail', volts: 5 };
  if (base === '3.3V') return { kind: 'rail', volts: 3.3 };
  return null; // VIN / RESET / IOREF / AREF / SDA / SCL: weak pulldown
}

/**
 * True for ADC-only pads (the Nano's A6/A7) that have no GPIO register and
 * so must never be driven as digital inputs.
 */
export function isAnalogOnlyPin(arduinoPin: number, profile: BoardProfile): boolean {
  return !profile.pinMapping[arduinoPin];
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
export const BOARD_PULLUP_OHMS = 35_000; // ATmega internal pull-up (20k-50k)
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
  profile: BoardProfile,
): Array<BoardPinDirective | null> {
  return (pins || []).map((pin) => {
    const role = boardPinRole(pin.name, profile);
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
