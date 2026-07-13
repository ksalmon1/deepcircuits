/**
 * FakeSolverAdapter — returns canned results without touching ngspice. Used by
 * unit tests (e.g. the circuit verifier's fault rules) that care about how a
 * caller reacts to a solve, not about ngspice accuracy.
 */
import type { SolverPort, SolveResult } from '../SolverPort';

type ResultOrFn = SolveResult | ((netlist: string) => SolveResult);

export class FakeSolverAdapter implements SolverPort {
  /** Netlists passed to solve(), in order — handy for assertions. */
  readonly seen: string[] = [];

  constructor(private readonly result: ResultOrFn = { voltages: {}, currents: {} }) {}

  async solve(netlist: string): Promise<SolveResult> {
    this.seen.push(netlist);
    return typeof this.result === 'function' ? this.result(netlist) : this.result;
  }
}
