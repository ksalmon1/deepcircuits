import { describe, it, expect } from 'vitest';
import { ServoDecoder } from './ServoDecoder';
import { HCSR04Responder } from './HCSR04Responder';
import { DHT22Responder, dht22Frame, dhtValuesFrom } from './DHT22Responder';
import { WS2812Decoder, type Rgb } from './WS2812Decoder';
import { CYCLES_PER_US, type GpioHostOps } from './GpioHostOps';

/** Deterministic emulated clock: schedule() queues, tick() advances time. */
class FakeOps implements GpioHostOps {
  cycles = 0;
  drives: Array<[number, number, boolean]> = []; // [cycles, pin, level]
  private queue: Array<{ at: number; cb: () => void }> = [];

  now() {
    return this.cycles;
  }
  schedule(cb: () => void, afterCycles: number) {
    this.queue.push({ at: this.cycles + afterCycles, cb });
  }
  drive(pin: number, level: boolean) {
    this.drives.push([this.cycles, pin, level]);
  }
  /** Advance emulated time, firing due events in order. */
  advanceUs(us: number) {
    const target = this.cycles + us * CYCLES_PER_US;
    for (;;) {
      const due = this.queue.filter((e) => e.at <= target).sort((a, b) => a.at - b.at)[0];
      if (!due) break;
      this.queue.splice(this.queue.indexOf(due), 1);
      this.cycles = due.at;
      due.cb();
    }
    this.cycles = target;
  }
}

describe('ServoDecoder', () => {
  it('maps the standard 1000-2000µs band onto 0-180°', () => {
    const angles: number[] = [];
    const servo = new ServoDecoder((a) => angles.push(a));
    const pulse = (us: number, at: number) => {
      servo.edge(true, at * CYCLES_PER_US);
      servo.edge(false, (at + us) * CYCLES_PER_US);
    };
    pulse(1000, 0);
    pulse(1500, 20000);
    pulse(2000, 40000);
    pulse(2400, 60000); // over-travel clamps
    pulse(600, 80000); // under-travel clamps
    expect(angles).toEqual([0, 90, 180, 180, 0]);
  });

  it('ignores non-servo pulse widths', () => {
    const angles: number[] = [];
    const servo = new ServoDecoder((a) => angles.push(a));
    servo.edge(true, 0);
    servo.edge(false, 50 * CYCLES_PER_US); // 50µs glitch
    servo.edge(true, 1000 * CYCLES_PER_US);
    servo.edge(false, 9000 * CYCLES_PER_US); // 8ms: not a servo pulse
    expect(angles).toEqual([]);
  });
});

describe('HCSR04Responder', () => {
  it('answers a trigger with an echo pulse of distance × 58µs', () => {
    const ops = new FakeOps();
    const sonar = new HCSR04Responder(ops, 7, () => 100);
    sonar.trigEdge(true);
    ops.advanceUs(10);
    sonar.trigEdge(false);
    ops.advanceUs(10_000);

    expect(ops.drives).toHaveLength(2);
    const [[hiAt, pin, hi], [loAt, , lo]] = ops.drives;
    expect(pin).toBe(7);
    expect(hi).toBe(true);
    expect(lo).toBe(false);
    expect((loAt - hiAt) / CYCLES_PER_US).toBe(5800); // 100cm × 58µs
  });

  it('ignores sub-threshold trigger glitches', () => {
    const ops = new FakeOps();
    const sonar = new HCSR04Responder(ops, 7, () => 50);
    sonar.trigEdge(true);
    ops.advanceUs(2); // too short
    sonar.trigEdge(false);
    ops.advanceUs(10_000);
    expect(ops.drives).toHaveLength(0);
  });

  it('clamps distance to the 2-400cm sensor range', () => {
    const ops = new FakeOps();
    const sonar = new HCSR04Responder(ops, 7, () => 10_000);
    sonar.trigEdge(true);
    ops.advanceUs(10);
    sonar.trigEdge(false);
    ops.advanceUs(100_000);
    const [[hiAt], [loAt]] = ops.drives;
    expect((loAt - hiAt) / CYCLES_PER_US).toBe(400 * 58);
  });
});

describe('DHT22Responder', () => {
  it('encodes the datasheet frame with checksum', () => {
    // Datasheet example: RH 65.2%, T 35.1°C.
    expect(dht22Frame({ humidity: 65.2, temperature: 35.1 })).toEqual([0x02, 0x8c, 0x01, 0x5f, 0xee]);
    // Negative temperature sets the sign bit: -10.1°C → 0x8065.
    expect(dht22Frame({ humidity: 0, temperature: -10.1 })).toEqual([0x00, 0x00, 0x80, 0x65, 0xe5]);
  });

  it('responds to a host start with a decodable 40-bit stream', () => {
    const ops = new FakeOps();
    const dht = new DHT22Responder(ops, 4, () => ({ temperature: 35.1, humidity: 65.2 }));

    dht.dataEdge(false); // host pulls low
    ops.advanceUs(1100);
    dht.dataEdge(true); // host releases
    ops.advanceUs(10_000); // let the whole response play out

    // Decode the driven transitions back into bits: a high phase longer
    // than 40µs is a 1.
    const drives = ops.drives;
    expect(drives[0][2]).toBe(false); // preamble low first
    const bits: number[] = [];
    for (let i = 1; i < drives.length - 1; i++) {
      const [at, , level] = drives[i];
      if (!level) continue;
      const next = drives[i + 1];
      const highUs = (next[0] - at) / CYCLES_PER_US;
      bits.push(highUs > 40 ? 1 : 0);
    }
    // First high is the 80µs preamble; drop it.
    const payload = bits.slice(1, 41);
    const bytes: number[] = [];
    for (let i = 0; i < 40; i += 8) {
      bytes.push(payload.slice(i, i + 8).reduce((acc, bit) => (acc << 1) | bit, 0));
    }
    expect(bytes).toEqual([0x02, 0x8c, 0x01, 0x5f, 0xee]);
    // The line is released high at the end.
    expect(drives[drives.length - 1][2]).toBe(true);
  });

  it('does not re-trigger from its own bit lows', () => {
    const ops = new FakeOps();
    let reads = 0;
    const dht = new DHT22Responder(ops, 4, () => {
      reads++;
      return { temperature: 20, humidity: 50 };
    });
    dht.dataEdge(false);
    ops.advanceUs(1000);
    dht.dataEdge(true);
    // Replay the responder's own transitions into its edge input.
    ops.advanceUs(20_000);
    for (const [, , level] of ops.drives) dht.dataEdge(level);
    expect(reads).toBe(1);
  });

  it('reads attribute overrides with defaults', () => {
    expect(dhtValuesFrom(undefined)).toEqual({ temperature: 24, humidity: 40 });
    expect(dhtValuesFrom({ temperature: '-5.5', humidity: 80 })).toEqual({ temperature: -5.5, humidity: 80 });
  });
});

describe('WS2812Decoder', () => {
  /** Clock out one WS2812 bit: T1H 0.8µs / T0H 0.25µs, ~1.25µs period. */
  function sendBit(decoder: WS2812Decoder, ops: FakeOps, bit: number): void {
    decoder.edge(true, ops.cycles);
    ops.advanceUs(bit ? 0.8 : 0.25);
    decoder.edge(false, ops.cycles);
    ops.advanceUs(bit ? 0.45 : 1);
  }

  function sendGrb(decoder: WS2812Decoder, ops: FakeOps, g: number, r: number, b: number): void {
    for (const byte of [g, r, b]) {
      for (let i = 7; i >= 0; i--) sendBit(decoder, ops, (byte >> i) & 1);
    }
  }

  it('decodes GRB pixels and latches on the reset gap', () => {
    const ops = new FakeOps();
    const frames: Rgb[][] = [];
    const decoder = new WS2812Decoder(ops, (f) => frames.push(f));

    sendGrb(decoder, ops, 0x00, 0xff, 0x00); // red
    sendGrb(decoder, ops, 0x80, 0x00, 0x40); // g=128, b=64
    ops.advanceUs(100); // idle past the reset window → latch fires

    expect(frames).toHaveLength(1);
    expect(frames[0]).toEqual([
      { r: 0xff, g: 0x00, b: 0x00 },
      { r: 0x00, g: 0x80, b: 0x40 },
    ]);
  });

  it('a long gap between transmissions separates frames', () => {
    const ops = new FakeOps();
    const frames: Rgb[][] = [];
    const decoder = new WS2812Decoder(ops, (f) => frames.push(f));

    sendGrb(decoder, ops, 0, 255, 0);
    ops.advanceUs(100);
    sendGrb(decoder, ops, 255, 0, 0);
    ops.advanceUs(100);

    expect(frames).toHaveLength(2);
    expect(frames[0][0]).toEqual({ r: 255, g: 0, b: 0 });
    expect(frames[1][0]).toEqual({ r: 0, g: 255, b: 0 });
  });

  it('discards trailing partial pixels', () => {
    const ops = new FakeOps();
    const frames: Rgb[][] = [];
    const decoder = new WS2812Decoder(ops, (f) => frames.push(f));

    sendGrb(decoder, ops, 0, 0, 255); // one full pixel...
    for (let i = 0; i < 5; i++) sendBit(decoder, ops, 1); // ...plus 5 stray bits
    ops.advanceUs(100);

    expect(frames).toHaveLength(1);
    expect(frames[0]).toEqual([{ r: 0, g: 0, b: 255 }]);
  });
});
