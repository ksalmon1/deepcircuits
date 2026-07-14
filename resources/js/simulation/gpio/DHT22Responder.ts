/**
 * DHT22Responder — virtual temperature/humidity sensor speaking the DHT22
 * (AM2302) single-wire protocol from its datasheet:
 *
 *  - Host start: data line held low ≥ 800µs, then released.
 *  - Sensor response: ~30µs after release, 80µs low + 80µs high preamble,
 *    then 40 bits, each a 50µs low followed by a high of 26µs (0) or 70µs
 *    (1), MSB first; a final 50µs low releases the line.
 *  - Payload: humidity ×10 (16 bit), temperature ×10 (16 bit, sign in the
 *    top bit), and a bytewise-sum checksum.
 *
 * The sensor's own sub-100µs lows never re-trigger the start detector, so
 * feeding it every edge of the shared data line is safe.
 */
import { CYCLES_PER_US, type GpioHostOps } from './GpioHostOps';

const HOST_START_MIN_US = 800;
const BIT_LOW_US = 50;
const BIT0_HIGH_US = 26;
const BIT1_HIGH_US = 70;

export interface DhtValues {
  /** °C, -40..80 */
  temperature: number;
  /** %RH, 0..100 */
  humidity: number;
}

/** Encode the 5-byte DHT22 frame for a reading. */
export function dht22Frame(values: DhtValues): number[] {
  const humidity = Math.round(Math.max(0, Math.min(100, values.humidity)) * 10);
  const t = Math.max(-40, Math.min(80, values.temperature));
  const tempRaw = Math.round(Math.abs(t) * 10) | (t < 0 ? 0x8000 : 0);
  const bytes = [
    (humidity >> 8) & 0xff,
    humidity & 0xff,
    (tempRaw >> 8) & 0xff,
    tempRaw & 0xff,
  ];
  bytes.push((bytes[0] + bytes[1] + bytes[2] + bytes[3]) & 0xff);
  return bytes;
}

export class DHT22Responder {
  private fallCycles: number | null = null;
  private responding = false;

  constructor(
    private readonly ops: GpioHostOps,
    private readonly dataPin: number,
    private readonly getValues: () => DhtValues,
  ) {}

  /** Feed one edge of the data line. */
  dataEdge(level: boolean): void {
    if (!level) {
      this.fallCycles = this.ops.now();
      return;
    }
    if (this.fallCycles === null || this.responding) return;
    const lowUs = (this.ops.now() - this.fallCycles) / CYCLES_PER_US;
    this.fallCycles = null;
    if (lowUs < HOST_START_MIN_US) return; // our own bit lows land here

    // Build the whole response as (delay-µs, level) transitions.
    const transitions: Array<[number, boolean]> = [];
    let at = 30; // sensor responds ~20-40µs after the host releases
    const emit = (durationUs: number, level: boolean) => {
      transitions.push([at, level]);
      at += durationUs;
    };
    emit(80, false); // response preamble
    emit(80, true);
    for (const byte of dht22Frame(this.getValues())) {
      for (let bit = 7; bit >= 0; bit--) {
        emit(BIT_LOW_US, false);
        emit((byte >> bit) & 1 ? BIT1_HIGH_US : BIT0_HIGH_US, true);
      }
    }
    emit(BIT_LOW_US, false); // closing low, then release high
    transitions.push([at, true]);

    this.responding = true;
    for (const [delayUs, lineLevel] of transitions) {
      this.ops.schedule(() => this.ops.drive(this.dataPin, lineLevel), delayUs * CYCLES_PER_US);
    }
    this.ops.schedule(() => {
      this.responding = false;
    }, (at + 10) * CYCLES_PER_US);
  }
}

/** Read injectable values out of a component's attribute bag. */
export function dhtValuesFrom(attributes: Record<string, unknown> | undefined): DhtValues {
  const toNumber = (value: unknown, fallback: number): number => {
    const n = typeof value === 'string' ? parseFloat(value) : (value as number);
    return typeof n === 'number' && Number.isFinite(n) ? n : fallback;
  };
  return {
    temperature: toNumber(attributes?.temperature, 24),
    humidity: toNumber(attributes?.humidity, 40),
  };
}
