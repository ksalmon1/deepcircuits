/**
 * Built-in `.subckt` macromodels for analog ICs, written from datasheet DC
 * characteristics (clean-room; no vendor model text). Library parts opt in
 * with `spiceType: 'subckt'` + `subckt: '<NAME>'`; netlist generation emits
 * one deduplicated `.subckt` block per used name and an
 * `X<id> <nodes> <name>` instance per part (see spiceService).
 *
 * The models are behavioral (ngspice B-sources) and shaped for the app's DC
 * operating-point analysis: smooth tanh transfer functions instead of hard
 * ideal switches, so Newton-Raphson converges with feedback loops around
 * them.
 *
 * Datasheet facts used:
 *  - LM358: AVOL ≈ 100 dB (1e5); output swings to ~(V+ − 1.5V) high and to
 *    within ~20 mV of V− when sinking little current; input R ≈ 2 MΩ.
 *  - LM393: open-collector output — sinks (VOL(sat) ≈ 50Ω region) when
 *    IN− > IN+, floats (µA leakage) otherwise; needs an external pull-up.
 *  - NE555: internal 3 × 5 kΩ divider sets THRESHOLD = 2/3 Vcc and
 *    TRIGGER = 1/3 Vcc; OUT high ≈ Vcc − 1.7V; DISCHARGE is an open-collector
 *    transistor, on while OUT is low; RESET is active-low (≈1V threshold).
 *    NOTE: this is a stateless DC approximation of the internal latch — it
 *    resolves the trigger/threshold comparators at the operating point but
 *    cannot oscillate (astable operation needs transient analysis).
 */

export interface SubcktDefinition {
  /** `.subckt` name, also the value of the part's `subckt` property. */
  name: string;
  /** Number of connection ports — must equal the library part's pin count. */
  ports: number;
  /** Complete `.subckt ... .ends` block. */
  body: string;
}

const LM358: SubcktDefinition = {
  name: 'LM358',
  ports: 5, // inp inn vcc vee out
  body: `.subckt LM358 inp inn vcc vee out
* Single-supply op-amp, behavioral. Output = swing-limited tanh of the
* differential input; slope at the origin is the open-loop gain (1e5).
Rinp inp 0 1e9
Rinn inn 0 1e9
Rind inp inn 2e6
* Anchors so an unwired supply pin can't leave the matrix singular.
Rvcc vcc 0 1e9
Rvee vee 0 1e9
Bamp core 0 V = 0.5*(V(vcc)-1.5+V(vee)+0.02) + 0.5*(V(vcc)-1.5-V(vee)-0.02)*tanh(2e5*(V(inp)-V(inn))/(V(vcc)-1.5-V(vee)-0.02+1e-6))
Rout core out 75
.ends LM358`,
};

const LM393: SubcktDefinition = {
  name: 'LM393',
  ports: 5, // inp inn vcc gnd out
  body: `.subckt LM393 inp inn vcc gnd out
* Comparator with open-collector output: conducts to gnd when IN- > IN+,
* floats (nA leakage) when IN+ > IN-. Wants an external pull-up resistor.
Rinp inp 0 1e9
Rinn inn 0 1e9
Rind inp inn 2e6
Rvcc vcc 0 1e8
Bsink out gnd I = V(out,gnd)*(0.5+0.5*tanh(1e4*(V(inn)-V(inp))))/50 + V(out,gnd)*1e-9
.ends LM393`,
};

const NE555: SubcktDefinition = {
  name: 'NE555',
  ports: 8, // gnd trig out reset ctrl thr dis vcc  (pins 1..8)
  body: `.subckt NE555 gnd trig out reset ctrl thr dis vcc
* DC behavioral 555. The three internal 5k resistors are the real divider
* that names the chip: ctrl = 2/3 Vcc, tri = 1/3 Vcc.
R1 vcc ctrl 5k
R2 ctrl tri 5k
R3 tri gnd 5k
* Anchors so unwired control pins can't leave the matrix singular.
Rtrig trig 0 1e9
Rthr thr 0 1e9
Rrst reset 0 1e9
Rdisa dis 0 1e9
* s in [0,1]: 1 when TRIG is below 1/3 Vcc, gated off when THR is above
* 2/3 Vcc or RESET is held low (active-low, ~1V threshold).
Bs s 0 V = (0.5+0.5*tanh(1e3*(V(tri)-V(trig)))) * (0.5-0.5*tanh(1e3*(V(thr)-V(ctrl)))) * (0.5+0.5*tanh(1e2*(V(reset,gnd)-1)))
Rs s 0 1e6
* Totem-pole output: high level is ~Vcc - 1.7V.
Bout core 0 V = V(gnd) + V(s)*(V(vcc)-V(gnd)-1.7)
Rout core out 10
* Discharge: open-collector to gnd, on while the output is low.
Bdis dis gnd I = V(dis,gnd)*(1-V(s))/25 + V(dis,gnd)*1e-9
.ends NE555`,
};

export const SUBCKT_LIBRARY: Record<string, SubcktDefinition> = {
  LM358,
  LM393,
  NE555,
};

/** Look up a subckt by the part's `subckt` property (case-insensitive). */
export function getSubckt(name: unknown): SubcktDefinition | null {
  if (typeof name !== 'string' || !name) return null;
  return SUBCKT_LIBRARY[name.toUpperCase()] ?? null;
}
