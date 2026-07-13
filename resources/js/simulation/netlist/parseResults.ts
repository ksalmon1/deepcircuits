/**
 * Canonical parser for ngspice batch-mode operating-point output.
 *
 * The `.control` block (see spiceService `generateNetlist`) wraps results in
 * `--- BEGIN/END SIMULATION RESULTS ---` markers with two sections:
 *
 *   NODE VOLTAGES:
 *     v(4) = 5.000000e+00
 *   DEVICE CURRENTS:
 *     @rabc[i]  = 9.000000e-03     ← resistors / voltage sources
 *     @dabc[id] = 7.100000e-03     ← diodes / LEDs / zeners
 *     @iabc[dc] = 5.000000e-03     ← current sources
 *     i(labc)   = 1.200000e-03     ← inductors
 *
 * ngspice lowercases device names in its output, so the keys returned here
 * match the lowercased device id used by result-mapping (see `spiceIdLower`).
 *
 * This is the single source of truth for result parsing. The Web Worker keeps
 * a small inline copy (it is served un-bundled and can't import app modules);
 * it must stay behavior-compatible with this module.
 */
export interface ParsedResults {
  voltages: Record<string, number>;
  currents: Record<string, number>;
  /** Parallel arrays kept for renderer/worker compatibility. */
  t: number[];
  v: number[];
  i: number[];
  analysisType: 'op';
  rawOutput: string;
}

const NUM = String.raw`[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?`;
const VOLTAGE_RE = new RegExp(String.raw`v\(([^)]+)\)\s*=\s*(${NUM})`);
// Any bracketed measurement: [i] (R/V), [id] (diodes), [dc] (current sources).
const DEVICE_CURRENT_RE = new RegExp(String.raw`@([^[]+)\[[a-z]+\]\s*=\s*(${NUM})`);
// Inductor branch current: i(Ldev) = ...
const INDUCTOR_CURRENT_RE = new RegExp(String.raw`^i\(([^)]+)\)\s*=\s*(${NUM})`);

export function parseNgspiceResults(lines: string[]): ParsedResults {
  const t: number[] = [];
  const v: number[] = [];
  const i: number[] = [];
  const voltageNodeNames: string[] = [];
  const currentDeviceNames: string[] = [];

  let section: 'none' | 'voltages' | 'currents' = 'none';
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.includes('NODE VOLTAGES')) {
      section = 'voltages';
      continue;
    }
    if (trimmed.includes('DEVICE CURRENTS')) {
      section = 'currents';
      continue;
    }
    if (trimmed.startsWith('--- END SIMULATION RESULTS ---')) break;

    if (section === 'voltages') {
      const m = trimmed.match(VOLTAGE_RE);
      if (m) {
        voltageNodeNames.push(m[1]);
        v.push(parseFloat(m[2]));
        t.push(v.length - 1);
      }
    } else if (section === 'currents') {
      const m = trimmed.match(DEVICE_CURRENT_RE) || trimmed.match(INDUCTOR_CURRENT_RE);
      if (m) {
        currentDeviceNames.push(m[1]);
        i.push(parseFloat(m[2]));
      }
    }
  }

  const voltages: Record<string, number> = {};
  const currents: Record<string, number> = {};
  v.forEach((voltage, idx) => {
    voltages[voltageNodeNames[idx] || String(idx + 1)] = voltage;
  });
  i.forEach((current, idx) => {
    currents[currentDeviceNames[idx] || `device${idx + 1}`] = current;
  });

  return { voltages, currents, t, v, i, analysisType: 'op', rawOutput: lines.join('\n') };
}
