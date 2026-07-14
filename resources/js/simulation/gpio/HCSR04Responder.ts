/**
 * HCSR04Responder — virtual ultrasonic ranger, from the HC-SR04 datasheet:
 * a ≥10µs TRIG pulse fires an (invisible) 8-cycle 40kHz burst, then ECHO
 * goes high for `distance_cm × 58` microseconds. The distance comes from a
 * live supplier (the part's attributes → Sensor panel), clamped to the
 * sensor's 2-400cm range.
 */
import { CYCLES_PER_US, type GpioHostOps } from './GpioHostOps';

const MIN_TRIG_US = 5; // datasheet asks for 10µs; accept a little less
const BURST_DELAY_US = 250; // sonic burst + internal processing before ECHO
const US_PER_CM = 58;

/** Injectable distance (cm) from the part's attributes, default 100cm. */
export function distanceCmFrom(attributes: Record<string, unknown> | undefined): number {
  const raw = attributes?.distance;
  const n = typeof raw === 'string' ? parseFloat(raw) : (raw as number);
  return typeof n === 'number' && Number.isFinite(n) ? n : 100;
}

export class HCSR04Responder {
  private riseCycles: number | null = null;
  private busy = false;

  constructor(
    private readonly ops: GpioHostOps,
    private readonly echoPin: number,
    private readonly getDistanceCm: () => number,
  ) {}

  /** Feed one edge of the TRIG pin. */
  trigEdge(level: boolean): void {
    if (level) {
      this.riseCycles = this.ops.now();
      return;
    }
    if (this.riseCycles === null || this.busy) return;
    const widthUs = (this.ops.now() - this.riseCycles) / CYCLES_PER_US;
    this.riseCycles = null;
    if (widthUs < MIN_TRIG_US) return;

    const distance = Math.max(2, Math.min(400, this.getDistanceCm()));
    const echoUs = Math.round(distance * US_PER_CM);
    this.busy = true;
    this.ops.schedule(() => {
      this.ops.drive(this.echoPin, true);
      this.ops.schedule(() => {
        this.ops.drive(this.echoPin, false);
        this.busy = false;
      }, echoUs * CYCLES_PER_US);
    }, BURST_DELAY_US * CYCLES_PER_US);
  }
}
