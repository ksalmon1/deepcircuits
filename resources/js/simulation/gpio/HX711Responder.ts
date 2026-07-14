/**
 * HX711Responder — virtual 24-bit load-cell ADC, from the HX711 datasheet:
 *
 *  - DT (data) rests HIGH while a conversion is pending and goes LOW when a
 *    reading is ready. The host then clocks SCK 25-27 times.
 *  - On each SCK rising edge the chip presents the next bit on DT, MSB
 *    first, as a 24-bit two's-complement value.
 *  - Pulses 25-27 select the next gain (25 = channel A × 128); after the
 *    last pulse DT returns HIGH (not ready) until the next conversion.
 *
 * Weight (grams) is injectable and converted to counts with a nominal
 * scale so `reading / SCALE` in a sketch recovers the grams.
 */
import type { GpioHostOps } from './GpioHostOps';

/** Nominal counts per gram (a typical load-cell + HX711 calibration). */
export const HX711_COUNTS_PER_GRAM = 420;

/** 10Hz sample rate: the next reading is ready ~100ms after the last. */
const CONVERSION_CYCLES = 16_000_000 / 10;

export class HX711Responder {
  private bitsSent = 0;
  private value = 0;

  constructor(
    private readonly ops: GpioHostOps,
    private readonly dtPin: number,
    private readonly getGrams: () => number,
  ) {
    // A reading is available immediately (the chip free-runs at 10Hz; a
    // sketch that polls is never kept waiting long).
    this.presentReading();
  }

  /** Latch a fresh conversion and signal "data ready" by pulling DT low. */
  private presentReading(): void {
    const counts = Math.round(this.getGrams() * HX711_COUNTS_PER_GRAM);
    this.value = Math.max(-0x800000, Math.min(0x7fffff, counts)) & 0xffffff;
    this.bitsSent = 0;
    this.ops.drive(this.dtPin, false); // ready
  }

  /** Feed one edge of the SCK line. */
  sckEdge(level: boolean): void {
    if (!level) return; // data changes on the rising edge
    if (this.bitsSent < 24) {
      const bit = (this.value >> (23 - this.bitsSent)) & 1; // MSB first
      this.ops.drive(this.dtPin, bit === 1);
      this.bitsSent++;
      return;
    }
    // Gain-select pulses (25-27): DT goes high (not ready). The chip
    // free-runs at 10Hz, so the next conversion lands ~100ms later — modelled
    // by scheduling the next "ready" rather than asserting it instantly.
    this.ops.drive(this.dtPin, true);
    if (this.bitsSent === 24) {
      this.bitsSent++;
      this.ops.schedule(() => this.presentReading(), CONVERSION_CYCLES);
    }
  }
}

/** Injectable weight (grams) from the part's attributes. */
export function gramsFrom(attributes: Record<string, unknown> | undefined): number {
  const raw = attributes?.weight;
  const n = typeof raw === 'string' ? parseFloat(raw) : (raw as number);
  return typeof n === 'number' && Number.isFinite(n) ? n : 0;
}
