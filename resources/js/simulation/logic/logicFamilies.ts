/**
 * Digital logic input thresholds by logic family, taken from datasheets:
 *
 *   family    Vcc    VIL(max)  VIH(min)  source
 *   AVR_5V    5.0V   1.5V      3.0V      ATmega328P/2560 DC characteristics
 *                                        (0.3·Vcc / 0.6·Vcc)
 *   TTL       5.0V   0.8V      2.0V      74LS series
 *   HC_5V     5.0V   1.5V      3.5V      74HC @ 5V (0.3·Vcc / 0.7·Vcc)
 *   HCT       5.0V   0.8V      2.0V      74HCT (TTL-compatible inputs)
 *   LVCMOS33  3.3V   0.8V      2.0V      JEDEC LVCMOS 3.3V
 *   SCHMITT_5V 5.0V  1.4V      2.4V      74HC14 typical VT- / VT+
 *
 * A solved node voltage at or below `vilMax` reads LOW, at or above `vihMin`
 * reads HIGH. Between the two the input is undefined in the datasheet sense;
 * `PinResolver` holds the previous level there (hysteresis), which is what
 * real inputs do with a slowly-moving voltage. This replaces the old flat
 * `volts > 2.5` guess, which misread e.g. a 3.3V device driving an AVR input
 * near the boundary.
 */

export interface LogicFamily {
  /** Human-readable family name. */
  name: string;
  /** Nominal supply the thresholds are specified at. */
  vcc: number;
  /** Highest voltage guaranteed to read LOW. */
  vilMax: number;
  /** Lowest voltage guaranteed to read HIGH. */
  vihMin: number;
}

export const LOGIC_FAMILIES = {
  AVR_5V: { name: 'AVR @ 5V', vcc: 5, vilMax: 1.5, vihMin: 3.0 },
  TTL: { name: 'TTL (74LS)', vcc: 5, vilMax: 0.8, vihMin: 2.0 },
  HC_5V: { name: '74HC @ 5V', vcc: 5, vilMax: 1.5, vihMin: 3.5 },
  HCT: { name: '74HCT', vcc: 5, vilMax: 0.8, vihMin: 2.0 },
  LVCMOS33: { name: 'LVCMOS 3.3V', vcc: 3.3, vilMax: 0.8, vihMin: 2.0 },
  SCHMITT_5V: { name: 'Schmitt (74HC14) @ 5V', vcc: 5, vilMax: 1.4, vihMin: 2.4 },
} as const satisfies Record<string, LogicFamily>;

export type LogicFamilyName = keyof typeof LOGIC_FAMILIES;

/**
 * Stateless read of a voltage against a family's thresholds. In the undefined
 * region between VIL and VIH it falls back to the midpoint — use PinResolver
 * when a previous level is available.
 */
export function isLogicHigh(volts: number, family: LogicFamily): boolean {
  if (volts >= family.vihMin) return true;
  if (volts <= family.vilMax) return false;
  return volts > (family.vilMax + family.vihMin) / 2;
}

/**
 * Per-pin digital level resolver with hysteresis: a voltage inside the
 * undefined region keeps the pin's previous level instead of snapping to a
 * midpoint, so a slowly-changing analog node doesn't chatter a digital input.
 */
export class PinResolver {
  private lastLevel = new Map<string | number, boolean>();

  constructor(private readonly family: LogicFamily) {}

  resolve(pinKey: string | number, volts: number): boolean {
    let level: boolean;
    if (volts >= this.family.vihMin) {
      level = true;
    } else if (volts <= this.family.vilMax) {
      level = false;
    } else {
      level = this.lastLevel.get(pinKey) ?? isLogicHigh(volts, this.family);
    }
    this.lastLevel.set(pinKey, level);
    return level;
  }

  /** Forget all held levels (call when the board restarts). */
  reset(): void {
    this.lastLevel.clear();
  }
}
