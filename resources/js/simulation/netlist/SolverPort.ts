/**
 * SolverPort — the seam between "we have a netlist string" and "some engine
 * solved it". Everything that needs a solve (the live worker loop, a one-shot
 * pre-Run verifier, headless unit tests) depends on this interface rather than
 * on ngspice/the Web Worker directly, so the engine can be swapped:
 *
 *   - WorkerSolverAdapter — the real ngspice WASM in a Web Worker (app runtime)
 *   - NodeSolverAdapter   — the real ngspice WASM loaded in Node (headless tests)
 *   - FakeSolverAdapter   — canned results (fast unit tests, no wasm)
 */
import type { ParsedResults } from './parseResults';

export type SolveResult = Pick<ParsedResults, 'voltages' | 'currents'> & {
  rawOutput?: string;
  error?: string;
};

export interface SolverPort {
  /** Solve a complete ngspice netlist and return node voltages + branch currents. */
  solve(netlist: string): Promise<SolveResult>;
  /** Release any held resources (worker, wasm instance). Optional. */
  dispose?(): void;
}
