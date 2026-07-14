/**
 * StepperDecoder — turns the four coil-drive lines of a bipolar stepper
 * (A+, A-, B+, B-, as driven through an H-bridge like the L298N) into a
 * shaft angle.
 *
 * The coil currents give a phase: A energized one way is 0°, B the other,
 * and so on. Rather than model magnetics, this tracks the *sequence* of
 * energized phases, which is what determines motion: each move to an
 * adjacent phase in the 8-entry half-step ring advances one half-step; the
 * direction is whichever way around the ring the drive went. A 200-step
 * motor (1.8°/step) therefore turns 0.9° per half-step.
 *
 * Only phase *changes* count, so a stationary drive pattern holds position,
 * and wave/full/half-step sequences all decode with the same table.
 */

export const HALF_STEPS_PER_REV = 400; // 200 full steps (1.8°) × 2
const DEG_PER_HALF_STEP = 360 / HALF_STEPS_PER_REV;

/** Coil levels: [aPlus, aMinus, bPlus, bMinus]. */
export type CoilLevels = [boolean, boolean, boolean, boolean];

/**
 * The half-step ring, as (A-current, B-current) sign pairs. Index n and
 * n+1 are one half-step apart; index 0 and 7 wrap.
 *  0: A+       1: A+ B+    2: B+      3: A- B+
 *  4: A-       5: A- B-    6: B-      7: A+ B-
 */
const PHASE_RING: Array<[number, number]> = [
  [1, 0],
  [1, 1],
  [0, 1],
  [-1, 1],
  [-1, 0],
  [-1, -1],
  [0, -1],
  [1, -1],
];

/** Current sign through a coil: + when the plus lead is the higher one. */
function coilSign(plus: boolean, minus: boolean): number {
  if (plus === minus) return 0; // both driven the same way: no current
  return plus ? 1 : -1;
}

/** Phase index for a coil pattern, or null when the drive is ambiguous. */
export function phaseIndex(coils: CoilLevels): number | null {
  const a = coilSign(coils[0], coils[1]);
  const b = coilSign(coils[2], coils[3]);
  if (a === 0 && b === 0) return null; // de-energized: holds position
  return PHASE_RING.findIndex(([ra, rb]) => ra === a && rb === b);
}

export class StepperDecoder {
  private lastPhase: number | null = null;
  /** Net half-steps travelled since start (signed). */
  halfSteps = 0;

  constructor(private readonly onAngle: (degrees: number, halfSteps: number) => void) {}

  /** Feed the current levels of the four coil lines. */
  update(coils: CoilLevels): void {
    const phase = phaseIndex(coils);
    if (phase === null || phase < 0) return;
    if (this.lastPhase === null) {
      this.lastPhase = phase;
      return; // first energize: establishes the reference, no motion
    }
    if (phase === this.lastPhase) return;

    // Shortest way around the 8-phase ring: +1 forward, -1 backward.
    let delta = phase - this.lastPhase;
    if (delta > 4) delta -= 8;
    if (delta < -4) delta += 8;
    this.lastPhase = phase;
    // A jump of more than one half-step is a skipped/stalled drive; count
    // it as the shortest path, which is what the shaft would actually do.
    this.halfSteps += delta;

    const angle = ((this.halfSteps * DEG_PER_HALF_STEP) % 360 + 360) % 360;
    this.onAngle(angle, this.halfSteps);
  }
}
