/**
 * MixedModeScheduler — run sequencing for the mixed-mode co-simulation loop.
 *
 * The analog solver (ngspice in a worker) and the digital emulator (avr8js)
 * advance each other: GPIO edges request a re-solve, and each solved result
 * is fed back into the chip's inputs. This class owns the glue rules:
 *
 *  - **Debounce**: GPIO toggle bursts and rapid canvas edits coalesce into
 *    one solve per window.
 *  - **Run ids**: every submitted solve gets a monotonically increasing id.
 *  - **Acceptance**: a result is applied iff it is newer than the last
 *    applied one. The worker solves in submission order, so under the
 *    continuous board loop (a fresh run is always queued before the last
 *    finishes) every completed result still lands, while true stragglers —
 *    results arriving after Stop or out of order — are rejected.
 *
 * Extracted from SimulationContext so the sequencing rules are unit-testable
 * and other solver clients (scope capture, verifier re-runs) can reuse them.
 */
export class MixedModeScheduler {
  private runId = 0;
  private appliedRunId = 0;
  private debouncePending = false;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly debounceMs = 50) {}

  /**
   * Request a re-solve; `fire` runs once per debounce window no matter how
   * many requests arrive inside it.
   */
  request(fire: () => void): void {
    if (this.debouncePending) return;
    this.debouncePending = true;
    this.timer = setTimeout(() => {
      this.debouncePending = false;
      this.timer = null;
      fire();
    }, this.debounceMs);
  }

  /** Issue the id for a run being submitted to the solver. */
  begin(): number {
    return ++this.runId;
  }

  /**
   * Decide whether a completed run's result should be applied. True exactly
   * once per fresh result; false for anything stale (posted after Stop, or
   * out of order).
   */
  accept(runId: number): boolean {
    if (runId <= this.appliedRunId) return false;
    this.appliedRunId = runId;
    return true;
  }

  /**
   * Invalidate everything in flight (Stop): any result from an already-
   * submitted run will be rejected, and a pending debounced fire is dropped.
   */
  invalidate(): void {
    this.appliedRunId = ++this.runId;
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
      this.debouncePending = false;
    }
  }
}
