/**
 * circuitVerifier — a pre-Run safety check. It runs one ngspice solve against
 * the current canvas and inspects the branch currents for real-world faults:
 *
 *   - short circuit    — a voltage source delivering way more current than any
 *                        sensible circuit needs (the "5V straight to GND" bug)
 *   - LED overcurrent  — forward current over the LED's absolute-max rating
 *                        (missing / undersized series resistor)
 *   - resistor overpower — I²·R above the resistor's power rating
 *   - dead indicator   — an LED wired on both pins but carrying no current
 *
 * Faults split into blocking `errors` and non-blocking `warnings`. The check
 * is a pure function of (components, wires, solver): it takes a SolverPort so
 * the rules can be unit-tested with a FakeSolverAdapter and run in-app against
 * the real ngspice worker. It never throws — a solver failure is surfaced as
 * `solverError` and the rules are skipped.
 *
 * This is uniquely enabled by DeepCircuits' analog SPICE engine: the numbers
 * are the actual solved operating point, not a heuristic.
 */
import { buildSpiceMapping, type CircuitComponentLike, type WireLike } from '@/simulation/netlist/buildMapping';
import { generateNetlist, parseSpiceNumber } from '@/simulation/spiceService';
import { spiceIdLower } from '@/simulation/netlist/spiceId';
import type { SolverPort } from '@/simulation/netlist/SolverPort';
import {
  SHORT_CIRCUIT_AMPS,
  DEAD_INDICATOR_AMPS,
  ledMaxCurrent,
  resistorPowerRating,
} from './componentRatings';

export type Severity = 'error' | 'warning';

export interface CircuitWarning {
  severity: Severity;
  /** Stable machine code, e.g. 'short-circuit'. */
  code: string;
  message: string;
  componentId?: string;
}

export interface VerificationResult {
  errors: CircuitWarning[];
  warnings: CircuitWarning[];
  /** Set when the solver itself failed; rules were skipped. */
  solverError?: string;
}

const RESISTIVE_TYPES = new Set(['resistor', 'photoresistor', 'thermistor', 'lamp', 'buzzer', 'fuse']);

function resolveType(comp: CircuitComponentLike): string {
  const spiceType = comp.attributes?.spiceType;
  if (typeof spiceType === 'string' && spiceType) return spiceType.toLowerCase();
  return comp.type.toLowerCase();
}

function label(comp: CircuitComponentLike): string {
  const name = comp.attributes?.name;
  return typeof name === 'string' && name ? name : comp.type;
}

function fmtAmps(a: number): string {
  const abs = Math.abs(a);
  if (abs >= 1) return `${a.toFixed(2)} A`;
  return `${(a * 1000).toFixed(a < 0.001 ? 3 : 1)} mA`;
}

export async function verifyCircuit(
  components: CircuitComponentLike[],
  wires: WireLike[],
  solver: SolverPort,
): Promise<VerificationResult> {
  const errors: CircuitWarning[] = [];
  const warnings: CircuitWarning[] = [];

  let mapping: ReturnType<typeof buildSpiceMapping>;
  try {
    mapping = buildSpiceMapping(components, wires);
  } catch (err) {
    return { errors, warnings, solverError: `Could not map the circuit: ${String(err)}` };
  }
  const { componentsForSpice } = mapping;
  const netlist = generateNetlist(componentsForSpice);

  let result;
  try {
    result = await solver.solve(netlist);
  } catch (err) {
    return { errors, warnings, solverError: String(err) };
  }
  if (result.error) return { errors, warnings, solverError: result.error };

  const currents = result.currents || {};
  const spiceById = new Map(componentsForSpice.map((c) => [c.id, c] as const));

  // How many pins share each node — used to tell a wired pin from a dangling one.
  const nodeUsage = new Map<string, number>();
  for (const c of componentsForSpice) {
    for (const n of c.spiceConnections) if (n !== '0') nodeUsage.set(n, (nodeUsage.get(n) || 0) + 1);
  }
  const isWiredNode = (node: string) => node === '0' || (nodeUsage.get(node) || 0) > 1;

  for (const comp of components) {
    const type = resolveType(comp);
    const id = spiceIdLower(comp.id);
    const props = comp.attributes;

    if (type === 'voltagesource' || type === 'power') {
      const current = currents[`v${id}`];
      if (current !== undefined && Math.abs(current) > SHORT_CIRCUIT_AMPS) {
        errors.push({
          severity: 'error',
          code: 'short-circuit',
          componentId: comp.id,
          message: `${label(comp)} is delivering ${fmtAmps(Math.abs(current))} — likely a short circuit. Add a load, or check for a wire tying the supply straight to ground.`,
        });
      }
    }

    if (type === 'led') {
      const current = currents[`d${id}`];
      const forward = current === undefined ? undefined : Math.abs(current);
      const max = ledMaxCurrent(props);
      if (forward !== undefined && forward > max) {
        errors.push({
          severity: 'error',
          code: 'led-overcurrent',
          componentId: comp.id,
          message: `${label(comp)} is carrying ${fmtAmps(forward)}, over its ${fmtAmps(max)} maximum — add or increase the series resistor before it burns out.`,
        });
      } else {
        // Dead indicator: both legs wired but essentially no current.
        const legs = spiceById.get(comp.id)?.spiceConnections ?? [];
        const wired = legs.length >= 2 && legs.every(isWiredNode);
        if (wired && forward !== undefined && forward < DEAD_INDICATOR_AMPS) {
          warnings.push({
            severity: 'warning',
            code: 'dead-indicator',
            componentId: comp.id,
            message: `${label(comp)} is wired but carries no current — check its polarity, a missing power tie, or an open switch.`,
          });
        }
      }
    }

    if (RESISTIVE_TYPES.has(type)) {
      const current = currents[`r${id}`];
      const resistance = parseSpiceNumber(props?.resistance, NaN);
      if (current !== undefined && Number.isFinite(resistance) && resistance > 0) {
        const watts = current * current * resistance;
        const rating = resistorPowerRating(props);
        if (watts > rating) {
          warnings.push({
            severity: 'warning',
            code: 'resistor-overpower',
            componentId: comp.id,
            message: `${label(comp)} is dissipating ${watts.toFixed(2)} W, over its ${rating} W rating — it would overheat in a real circuit.`,
          });
        }
      }
    }
  }

  return { errors, warnings };
}
