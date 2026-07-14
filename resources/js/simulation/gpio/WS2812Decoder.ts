/**
 * WS2812Decoder — decodes the single-wire NeoPixel protocol from the edges
 * on the DIN line, per the WS2812/WS2812B datasheet:
 *
 *  - Each bit is a high pulse followed by a low: T0H ≈ 0.4µs, T1H ≈ 0.8µs
 *    (the low tail brings every bit to ~1.25µs). The high width alone
 *    separates 0 from 1 — the threshold here is 0.5625µs (9 cycles), midway
 *    between the two nominal widths.
 *  - 24 bits per pixel in G-R-B order, MSB first; the first 24 bits belong
 *    to the first pixel in the chain, and so on.
 *  - A low period longer than ~50µs latches the shifted data into the LEDs.
 *
 * Latch detection is scheduled in emulated time: if no edge follows a
 * falling edge within the reset window, the frame commits.
 */
import { CYCLES_PER_US, type GpioHostOps } from './GpioHostOps';

const ONE_THRESHOLD_CYCLES = 9; // 0.5625µs at 16MHz
const RESET_US = 50;
const MAX_BITS = 24 * 1024; // safety cap: 1024 pixels

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

/** Scheduling subset of GpioHostOps (the decoder never drives pins). */
export type Ws2812Ops = Pick<GpioHostOps, 'now' | 'schedule'>;

export class WS2812Decoder {
  private bits: number[] = [];
  private riseCycles: number | null = null;
  private lastEdgeCycles = 0;

  constructor(
    private readonly ops: Ws2812Ops,
    private readonly onFrame: (pixels: Rgb[]) => void,
  ) {}

  /** Feed one edge of the DIN line. */
  edge(level: boolean, cycles: number): void {
    if (level) {
      // A gap longer than the reset window before this rising edge means
      // the previous frame latched.
      if (this.bits.length > 0 && cycles - this.lastEdgeCycles > RESET_US * CYCLES_PER_US) {
        this.commit();
      }
      this.riseCycles = cycles;
    } else if (this.riseCycles !== null) {
      const width = cycles - this.riseCycles;
      this.riseCycles = null;
      if (this.bits.length < MAX_BITS) {
        this.bits.push(width > ONE_THRESHOLD_CYCLES ? 1 : 0);
      }
      // If the line stays idle past the reset window, latch.
      const stamp = cycles;
      this.ops.schedule(() => {
        if (this.lastEdgeCycles === stamp && this.bits.length > 0) this.commit();
      }, (RESET_US + 10) * CYCLES_PER_US);
    }
    this.lastEdgeCycles = cycles;
  }

  private commit(): void {
    const pixels: Rgb[] = [];
    for (let base = 0; base + 24 <= this.bits.length; base += 24) {
      const byteAt = (offset: number) =>
        this.bits.slice(base + offset, base + offset + 8).reduce((acc, bit) => (acc << 1) | bit, 0);
      pixels.push({ g: byteAt(0), r: byteAt(8), b: byteAt(16) });
    }
    this.bits = [];
    if (pixels.length > 0) this.onFrame(pixels);
  }
}
