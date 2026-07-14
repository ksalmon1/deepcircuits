import { describe, it, expect } from 'vitest';
import { StepperDecoder, phaseIndex, type CoilLevels } from './StepperDecoder';
import { IRReceiver, necBits } from './IRReceiver';
import { HX711Responder, HX711_COUNTS_PER_GRAM, gramsFrom } from './HX711Responder';
import { KeypadMatrix, KEYPAD_KEYS } from './KeypadMatrix';
import { CYCLES_PER_US, type GpioHostOps } from './GpioHostOps';

/** Deterministic emulated clock (same shape as the gpioDecoders suite). */
class FakeOps implements GpioHostOps {
  cycles = 0;
  drives: Array<[number, number, boolean]> = [];
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

describe('StepperDecoder', () => {
  // Full-step sequence: A+, B+, A-, B- (phases 0, 2, 4, 6 of the ring).
  const FULL_STEP: CoilLevels[] = [
    [true, false, false, false], // A+ energized
    [false, false, true, false], // B+
    [false, true, false, false], // A-
    [false, false, false, true], // B-
  ];

  it('maps coil patterns onto the half-step phase ring', () => {
    expect(phaseIndex([true, false, false, false])).toBe(0); // A+
    expect(phaseIndex([true, false, true, false])).toBe(1); // A+ B+
    expect(phaseIndex([false, false, true, false])).toBe(2); // B+
    expect(phaseIndex([false, false, false, false])).toBeNull(); // de-energized
  });

  it('advances 1.8° per full step forward', () => {
    let angle = 0;
    const stepper = new StepperDecoder((deg) => (angle = deg));
    for (const coils of FULL_STEP) stepper.update(coils);
    // First pattern only sets the reference, so three steps of motion:
    // each full step = 2 half-steps = 1.8°.
    expect(angle).toBeCloseTo(5.4, 5);
    expect(stepper.halfSteps).toBe(6);
  });

  it('reverses direction when the sequence runs backwards', () => {
    let angle = 0;
    const stepper = new StepperDecoder((deg) => (angle = deg));
    for (const coils of FULL_STEP) stepper.update(coils);
    for (const coils of [...FULL_STEP].reverse().slice(1)) stepper.update(coils);
    expect(stepper.halfSteps).toBe(0); // back where it started
    expect(angle).toBeCloseTo(0, 5);
  });

  it('holds position while the pattern is unchanged or de-energized', () => {
    const stepper = new StepperDecoder(() => {});
    stepper.update(FULL_STEP[0]);
    stepper.update(FULL_STEP[1]);
    const before = stepper.halfSteps;
    stepper.update(FULL_STEP[1]); // same pattern
    stepper.update([false, false, false, false]); // coils off
    expect(stepper.halfSteps).toBe(before);
  });

  it('a full revolution is 200 full steps', () => {
    let angle = 0;
    const stepper = new StepperDecoder((deg) => (angle = deg));
    stepper.update(FULL_STEP[0]);
    for (let i = 1; i <= 200; i++) stepper.update(FULL_STEP[i % 4]);
    expect(stepper.halfSteps).toBe(400);
    expect(angle).toBeCloseTo(0, 5); // wrapped exactly to 360°
  });
});

describe('IRReceiver', () => {
  it('encodes NEC bits LSB-first with inverted bytes', () => {
    const bits = necBits(0x00, 0x45);
    expect(bits).toHaveLength(32);
    // Command byte 0x45 = 0100_0101 → LSB-first: 1,0,1,0,0,0,1,0
    expect(bits.slice(16, 24)).toEqual([1, 0, 1, 0, 0, 0, 1, 0]);
    // ~command is the bitwise inverse.
    expect(bits.slice(24, 32)).toEqual([0, 1, 0, 1, 1, 1, 0, 1]);
  });

  it('idles high and transmits an inverted-envelope NEC frame', () => {
    const ops = new FakeOps();
    const ir = new IRReceiver(ops, 3);
    expect(ops.drives).toEqual([[0, 3, true]]); // idle high at construction

    ir.send(0x00, 0x45);
    expect(ir.transmitting).toBe(true);
    ops.advanceUs(80_000);
    expect(ir.transmitting).toBe(false);

    // Decode the envelope back: mark = low, and the space that follows each
    // 560µs bit mark encodes the bit.
    const edges = ops.drives.slice(1); // drop the idle-high
    const leaderMark = edges[1][0] - edges[0][0];
    expect(edges[0][2]).toBe(false); // leader is a mark (low)
    expect(leaderMark / CYCLES_PER_US).toBe(9000);
    expect((edges[2][0] - edges[1][0]) / CYCLES_PER_US).toBe(4500); // leader space

    const bits: number[] = [];
    for (let i = 2; i + 1 < edges.length - 1; i += 2) {
      const spaceUs = (edges[i + 2]?.[0] - edges[i + 1][0]) / CYCLES_PER_US;
      if (Number.isFinite(spaceUs)) bits.push(spaceUs > 1000 ? 1 : 0);
    }
    expect(bits.slice(0, 32)).toEqual(necBits(0x00, 0x45));
  });

  it('ignores a second send while a frame is in flight', () => {
    const ops = new FakeOps();
    const ir = new IRReceiver(ops, 3);

    // One frame's worth of transitions, for comparison.
    ir.send(0, 0x10);
    ops.advanceUs(80_000);
    const oneFrame = ops.drives.length;

    // Now start a frame and try to send another mid-flight.
    ops.drives.length = 0;
    ir.send(0, 0x10);
    ops.advanceUs(5_000); // still transmitting the leader
    expect(ir.transmitting).toBe(true);
    ir.send(0, 0x20); // must be dropped
    ops.advanceUs(80_000);
    expect(ir.transmitting).toBe(false);
    // Exactly one frame was emitted, minus the idle-high from construction.
    expect(ops.drives.length).toBe(oneFrame - 1);
  });
});

describe('HX711Responder', () => {
  /** Clock 25 SCK pulses and rebuild the 24-bit value the chip presented. */
  function readValue(hx: HX711Responder, ops: FakeOps, dtPin: number): number {
    let value = 0;
    for (let i = 0; i < 24; i++) {
      ops.advanceUs(1);
      hx.sckEdge(true);
      const last = ops.drives.filter(([, pin]) => pin === dtPin).pop()!;
      value = (value << 1) | (last[2] ? 1 : 0);
      ops.advanceUs(1);
      hx.sckEdge(false);
    }
    ops.advanceUs(1);
    hx.sckEdge(true); // 25th pulse: gain select
    hx.sckEdge(false);
    return value;
  }

  it('signals ready (DT low) and clocks out weight as 24-bit counts', () => {
    const ops = new FakeOps();
    const hx = new HX711Responder(ops, 6, () => 100); // 100 g
    expect(ops.drives[0]).toEqual([0, 6, false]); // DT low = data ready

    const value = readValue(hx, ops, 6);
    expect(value).toBe(100 * HX711_COUNTS_PER_GRAM);
  });

  it('picks up a new weight for the next conversion', () => {
    const ops = new FakeOps();
    let grams = 50;
    const hx = new HX711Responder(ops, 6, () => grams);
    expect(readValue(hx, ops, 6)).toBe(50 * HX711_COUNTS_PER_GRAM);

    grams = 250;
    ops.advanceUs(120_000); // the 10Hz conversion lands
    expect(readValue(hx, ops, 6)).toBe(250 * HX711_COUNTS_PER_GRAM);
  });

  it('reads the injectable weight attribute', () => {
    expect(gramsFrom(undefined)).toBe(0);
    expect(gramsFrom({ weight: '1250' })).toBe(1250);
  });
});

describe('KeypadMatrix', () => {
  /** Board pins: rows 2-5, cols 6-9. */
  const rowPins = [2, 3, 4, 5];
  const colPins = [6, 7, 8, 9];

  function makeMatrix() {
    const rowLevels = new Map<number, boolean>(rowPins.map((p) => [p, true]));
    const colLevels = new Map<number, boolean>();
    const matrix = new KeypadMatrix(
      {
        readPin: (pin) => rowLevels.get(pin) ?? true,
        drive: (pin, level) => colLevels.set(pin, level),
      },
      rowPins,
      colPins,
    );
    /** Scan a row: drive it low, refresh, read the columns. */
    const scanRow = (row: number) => {
      rowPins.forEach((p, i) => rowLevels.set(p, i !== row));
      matrix.refresh();
      return colPins.map((p) => colLevels.get(p) ?? true);
    };
    return { matrix, scanRow };
  }

  it('reads all columns high when no key is held', () => {
    const { scanRow } = makeMatrix();
    for (let row = 0; row < 4; row++) {
      expect(scanRow(row)).toEqual([true, true, true, true]);
    }
  });

  it('pulls the column of a held key low only on its own row', () => {
    const { matrix, scanRow } = makeMatrix();
    matrix.setKey('5', true); // index 5 → row 1, col 1
    expect(scanRow(0)).toEqual([true, true, true, true]);
    expect(scanRow(1)).toEqual([true, false, true, true]);
    expect(scanRow(2)).toEqual([true, true, true, true]);
  });

  it('releasing the key restores the column', () => {
    const { matrix, scanRow } = makeMatrix();
    matrix.setKey('#', true); // index 14 → row 3, col 2
    expect(scanRow(3)).toEqual([true, true, false, true]);
    matrix.setKey('#', false);
    expect(scanRow(3)).toEqual([true, true, true, true]);
  });

  it('supports multiple held keys', () => {
    const { matrix, scanRow } = makeMatrix();
    matrix.setKey('1', true); // row 0, col 0
    matrix.setKey('D', true); // index 15 → row 3, col 3
    expect(scanRow(0)).toEqual([false, true, true, true]);
    expect(scanRow(3)).toEqual([true, true, true, false]);
  });

  it('labels cover the standard 4x4 layout', () => {
    expect(KEYPAD_KEYS).toHaveLength(16);
    expect(KEYPAD_KEYS[0]).toBe('1');
    expect(KEYPAD_KEYS[13]).toBe('0');
  });
});
