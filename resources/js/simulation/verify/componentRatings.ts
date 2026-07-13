/**
 * Real-world absolute-maximum ratings used by the pre-Run circuit verifier.
 * Values are datasheet-typical defaults; a component instance can override any
 * of them through its own properties (e.g. a 1W resistor, a high-power LED).
 */
import { parseSpiceNumber } from '@/simulation/spiceService';

/** A voltage source delivering more than this is almost certainly a short. */
export const SHORT_CIRCUIT_AMPS = 0.5; // 500 mA

/** Standard 5 mm indicator LED absolute-max forward current. */
export const LED_ABS_MAX_AMPS = 0.02; // 20 mA

/** A wired indicator carrying less than this reads as "not lit / no path". */
export const DEAD_INDICATOR_AMPS = 1e-6; // 1 µA

/** Default through-hole resistor power rating. */
export const RESISTOR_DEFAULT_WATTS = 0.25; // 1/4 W

interface RatingProps {
  [key: string]: unknown;
}

/** LED max forward current — instance `maxCurrent` (amps) overrides the default. */
export function ledMaxCurrent(props: RatingProps | undefined): number {
  const override = parseSpiceNumber(props?.maxCurrent, NaN);
  return Number.isFinite(override) && override > 0 ? override : LED_ABS_MAX_AMPS;
}

/** Resistor power rating in watts — instance `power` overrides the default. */
export function resistorPowerRating(props: RatingProps | undefined): number {
  const override = parseSpiceNumber(props?.power, NaN);
  return Number.isFinite(override) && override > 0 ? override : RESISTOR_DEFAULT_WATTS;
}
