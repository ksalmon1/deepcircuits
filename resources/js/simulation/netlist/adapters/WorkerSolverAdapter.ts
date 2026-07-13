/**
 * WorkerSolverAdapter — SolverPort over the app's SpiceWorker. It owns a
 * dedicated Worker instance, so one-shot solves (e.g. the pre-Run circuit
 * verifier) never race or coalesce with the live simulation loop's worker.
 *
 * Browser-only. The worker is spawned lazily on the first solve and kept warm
 * for subsequent ones; call dispose() to terminate it.
 */
import type { SolverPort, SolveResult } from '../SolverPort';

const WORKER_URL = '/models/SpiceWorker.js';
const SOLVE_TIMEOUT_MS = 20_000;

interface WorkerResultData {
  voltages?: Record<string, number>;
  currents?: Record<string, number>;
  rawOutput?: string;
}

export class WorkerSolverAdapter implements SolverPort {
  private worker: Worker | null = null;
  private nextRunId = 1;

  constructor(private readonly workerUrl: string = WORKER_URL) {}

  private getWorker(): Worker {
    if (!this.worker) {
      this.worker = new Worker(this.workerUrl, { type: 'module' });
    }
    return this.worker;
  }

  solve(netlist: string): Promise<SolveResult> {
    const worker = this.getWorker();
    const runId = this.nextRunId++;

    return new Promise<SolveResult>((resolve) => {
      const finish = (result: SolveResult) => {
        clearTimeout(timer);
        worker.removeEventListener('message', onMessage);
        resolve(result);
      };
      const timer = setTimeout(() => {
        finish({ voltages: {}, currents: {}, error: 'The circuit check timed out.' });
      }, SOLVE_TIMEOUT_MS);

      const onMessage = (e: MessageEvent) => {
        const msg = e.data;
        if (!msg || msg.runId !== runId) return; // 'ready' and other runs
        if (msg.type === 'result') {
          const data = (msg.data || {}) as WorkerResultData;
          finish({
            voltages: data.voltages || {},
            currents: data.currents || {},
            rawOutput: data.rawOutput,
          });
        } else if (msg.type === 'error') {
          finish({ voltages: {}, currents: {}, error: String(msg.message || 'Simulation failed.') });
        }
      };

      worker.addEventListener('message', onMessage);
      worker.postMessage({ type: 'run', runId, netlist });
    });
  }

  dispose(): void {
    this.worker?.terminate();
    this.worker = null;
  }
}
