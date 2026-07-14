/**
 * waveforms — shapes the emulator's raw GPIO edge trace into per-pin step
 * series for the oscilloscope panel. Pure, so windowing and initial-level
 * reconstruction are unit-testable without a running board.
 */
import type { TraceEdge } from '@/simulation/avr/AVRRunner';

export interface ScopePoint {
  /** Milliseconds from the left edge of the window. */
  t: number;
  /** 0 or 1. */
  level: number;
}

export interface ScopeTrace {
  pin: number;
  points: ScopePoint[];
}

/**
 * Build one step series per pin over the trailing `windowMs` of the trace.
 * The level at the window's left edge comes from the pin's last transition
 * before the window; pins with no edges anywhere are omitted.
 */
export function buildScopeTraces(
  edges: TraceEdge[],
  nowCycles: number,
  clockHz: number,
  windowMs: number,
): ScopeTrace[] {
  const windowCycles = (windowMs / 1000) * clockHz;
  const startCycles = nowCycles - windowCycles;
  const toMs = (cycles: number) => ((cycles - startCycles) / clockHz) * 1000;

  const traces = new Map<number, { startLevel: number | null; points: ScopePoint[]; lastLevel: number }>();

  for (const edge of edges) {
    let trace = traces.get(edge.pin);
    if (!trace) {
      trace = { startLevel: null, points: [], lastLevel: 0 };
      traces.set(edge.pin, trace);
    }
    const level = edge.level ? 1 : 0;
    if (edge.cycles <= startCycles) {
      trace.startLevel = level; // last pre-window transition wins
    } else {
      if (trace.startLevel === null && trace.points.length === 0) {
        // First edge ever seen for this pin lands inside the window: the
        // level before it was the opposite of what it switched to.
        trace.startLevel = level === 1 ? 0 : 1;
      }
      trace.points.push({ t: toMs(edge.cycles), level });
    }
    trace.lastLevel = level;
  }

  const result: ScopeTrace[] = [];
  for (const [pin, trace] of traces) {
    const startLevel = trace.startLevel ?? trace.lastLevel;
    const points: ScopePoint[] = [{ t: 0, level: startLevel }, ...trace.points];
    // Extend the final level to the window's right edge for the step plot.
    points.push({ t: windowMs, level: points[points.length - 1].level });
    result.push({ pin, points });
  }
  return result.sort((a, b) => a.pin - b.pin);
}

/** Display label for an Arduino pin number (D13, A0, ...). */
export function pinLabel(pin: number, analogBase: number): string {
  return pin >= analogBase ? `A${pin - analogBase}` : `D${pin}`;
}
