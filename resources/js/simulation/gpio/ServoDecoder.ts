/**
 * ServoDecoder — turns the PWM pulse train on a hobby servo's signal pin
 * into a horn angle. Standard analog-servo timing: a 1000µs pulse is 0°,
 * 1500µs is 90°, 2000µs is 180° (repeated at ~50Hz); out-of-range pulses
 * clamp, and anything far outside the servo band is ignored as noise.
 */
import { CYCLES_PER_US } from './GpioHostOps';

const MIN_PULSE_US = 400; // reject glitches / non-servo traffic
const MAX_PULSE_US = 3000;

export class ServoDecoder {
  private riseCycles: number | null = null;

  constructor(private readonly onAngle: (degrees: number) => void) {}

  /** Feed one edge of the signal pin (level after the edge + cycle stamp). */
  edge(level: boolean, cycles: number): void {
    if (level) {
      this.riseCycles = cycles;
      return;
    }
    if (this.riseCycles === null) return;
    const widthUs = (cycles - this.riseCycles) / CYCLES_PER_US;
    this.riseCycles = null;
    if (widthUs < MIN_PULSE_US || widthUs > MAX_PULSE_US) return;
    const angle = Math.max(0, Math.min(180, ((widthUs - 1000) / 1000) * 180));
    this.onAngle(Math.round(angle * 10) / 10);
  }
}
