import { describe, it, expect } from 'vitest';
import { buildScopeTraces, pinLabel } from './waveforms';

const CLOCK = 16_000_000;
const MS = CLOCK / 1000;

describe('buildScopeTraces', () => {
  it('windows edges and reconstructs the initial level', () => {
    // A 10ms window ends at `now`. Pin 13 went high 15ms ago (before the
    // window opens), low 8ms ago (2ms into it), and high again 4ms ago.
    const now = 100 * MS;
    const edges = [
      { cycles: now - 15 * MS, pin: 13, level: true },
      { cycles: now - 8 * MS, pin: 13, level: false },
      { cycles: now - 4 * MS, pin: 13, level: true },
    ];
    const [trace] = buildScopeTraces(edges, now, CLOCK, 10);
    expect(trace.pin).toBe(13);
    // The pre-window edge sets the level the window opens at: high.
    expect(trace.points[0]).toEqual({ t: 0, level: 1 });
    expect(trace.points[1].t).toBeCloseTo(2, 5);
    expect(trace.points[1].level).toBe(0);
    expect(trace.points[2].t).toBeCloseTo(6, 5);
    expect(trace.points[2].level).toBe(1);
    expect(trace.points[3]).toEqual({ t: 10, level: 1 }); // extended to the edge
  });

  it('derives the pre-edge level when the first-ever edge is in-window', () => {
    const now = 10 * MS;
    const edges = [{ cycles: now - 2 * MS, pin: 5, level: false }];
    const [trace] = buildScopeTraces(edges, now, CLOCK, 10);
    expect(trace.points[0]).toEqual({ t: 0, level: 1 }); // was high before falling
  });

  it('separates pins and sorts them', () => {
    const now = 10 * MS;
    const edges = [
      { cycles: now - 1 * MS, pin: 9, level: true },
      { cycles: now - 2 * MS, pin: 2, level: true },
    ];
    const traces = buildScopeTraces(edges, now, CLOCK, 10);
    expect(traces.map((t) => t.pin)).toEqual([2, 9]);
  });

  it('a pin whose edges all pre-date the window still shows its held level', () => {
    const now = 1000 * MS;
    const edges = [{ cycles: 5 * MS, pin: 4, level: true }];
    const [trace] = buildScopeTraces(edges, now, CLOCK, 10);
    expect(trace.points).toEqual([
      { t: 0, level: 1 },
      { t: 10, level: 1 },
    ]);
  });
});

describe('pinLabel', () => {
  it('names digital and analog pins', () => {
    expect(pinLabel(13, 14)).toBe('D13');
    expect(pinLabel(14, 14)).toBe('A0');
    expect(pinLabel(19, 14)).toBe('A5');
  });
});
