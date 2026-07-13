import { test, expect } from '@playwright/test';
import { CircuitBuilder, wire, login, createCircuitProject, runSimulation } from './utils/circuit';

/**
 * Analog IC subckt models (LM358 op-amp, LM393 comparator, 555 timer): the
 * netlist emits .subckt macromodels and the solved operating point must
 * match the analytic values.
 */

test.beforeEach(async ({ page }) => {
  await login(page);
});

function nearestNode(voltages: Record<string, number>, expected: number, tolerance: number): number | undefined {
  return Object.values(voltages).find((v) => Math.abs(v - expected) <= tolerance);
}

test('op-amp unity-gain buffer reproduces the divider voltage at OUT', async ({ page }) => {
  const b = new CircuitBuilder();
  await b.load(page.request);
  expect(b.has('opamp'), 'opamp part seeded').toBeTruthy();

  const bat = b.place('voltagesource', { top: 300, left: 100 });
  const r1 = b.place('resistor', { top: 100, left: 300 }, { resistance: '1k' });
  const r2 = b.place('resistor', { top: 300, left: 300 }, { resistance: '1k' });
  const op = b.place('opamp', { top: 150, left: 550 });

  // Pins: 0 IN+, 1 IN-, 2 V+, 3 V-, 4 OUT.
  const wires = [
    wire(bat, 0, r1, 0),
    wire(r1, 1, r2, 0),
    wire(r2, 1, bat, 1),
    wire(r1, 1, op, 0), // divider midpoint (4.5V) -> IN+
    wire(op, 4, op, 1), // OUT -> IN- (unity gain)
    wire(bat, 0, op, 2), // V+ = 9V
    wire(op, 3, bat, 1), // V- = ground
  ];

  const projectId = await createCircuitProject(page, 'E2E opamp buffer', [bat, r1, r2, op], wires);
  const results = await runSimulation(page, projectId);

  // The buffer must hold OUT at the divider's 4.5V (within model tolerance).
  const out = nearestNode(results.voltages, 4.5, 0.1);
  expect(out, `expected ~4.5V node in ${JSON.stringify(results.voltages)}`).toBeDefined();
});

test('comparator with pull-up swings rail-to-rail around the threshold', async ({ page }) => {
  const b = new CircuitBuilder();
  await b.load(page.request);
  expect(b.has('comparator'), 'comparator part seeded').toBeTruthy();

  const bat = b.place('voltagesource', { top: 300, left: 100 });
  // IN+ = 2/3 · 9V = 6V from a 1k/2k divider; IN- = 4.5V from 1k/1k.
  const rTop = b.place('resistor', { top: 100, left: 300 }, { resistance: '1k' });
  const rBot = b.place('resistor', { top: 200, left: 300 }, { resistance: '2k' });
  const rA = b.place('resistor', { top: 300, left: 300 }, { resistance: '1k' });
  const rB = b.place('resistor', { top: 400, left: 300 }, { resistance: '1k' });
  const pull = b.place('resistor', { top: 100, left: 700 }, { resistance: '10k' });
  const cmp = b.place('comparator', { top: 250, left: 550 });

  // Pins: 0 IN+, 1 IN-, 2 VCC, 3 GND, 4 OUT.
  const wires = [
    wire(bat, 0, rTop, 0),
    wire(rTop, 1, rBot, 0),
    wire(rBot, 1, bat, 1),
    wire(bat, 0, rA, 0),
    wire(rA, 1, rB, 0),
    wire(rB, 1, bat, 1),
    wire(rTop, 1, cmp, 0), // 6V -> IN+
    wire(rA, 1, cmp, 1), // 4.5V -> IN-
    wire(bat, 0, cmp, 2), // VCC
    wire(cmp, 3, bat, 1), // GND
    wire(bat, 0, pull, 0), // pull-up to 9V
    wire(pull, 1, cmp, 4), // -> OUT
  ];

  const projectId = await createCircuitProject(
    page,
    'E2E comparator high',
    [bat, rTop, rBot, rA, rB, pull, cmp],
    wires,
  );
  const results = await runSimulation(page, projectId);

  // IN+ (6V) > IN- (4.5V): the open collector floats and the pull-up takes
  // OUT to the 9V rail.
  const out = nearestNode(results.voltages, 9, 0.2);
  expect(out, `expected OUT pulled to ~9V in ${JSON.stringify(results.voltages)}`).toBeDefined();

  // Flip the inputs: IN- (6V) > IN+ (4.5V) must sink OUT to near ground.
  const wiresLow = [
    wire(bat, 0, rTop, 0),
    wire(rTop, 1, rBot, 0),
    wire(rBot, 1, bat, 1),
    wire(bat, 0, rA, 0),
    wire(rA, 1, rB, 0),
    wire(rB, 1, bat, 1),
    wire(rTop, 1, cmp, 1), // 6V -> IN-
    wire(rA, 1, cmp, 0), // 4.5V -> IN+
    wire(bat, 0, cmp, 2),
    wire(cmp, 3, bat, 1),
    wire(bat, 0, pull, 0),
    wire(pull, 1, cmp, 4),
  ];
  const lowId = await createCircuitProject(page, 'E2E comparator low', [bat, rTop, rBot, rA, rB, pull, cmp], wiresLow);
  const low = await runSimulation(page, lowId);
  // Saturated open-collector: a few tens of mV, far below 1V.
  const sunk = Object.values(low.voltages).some((v) => v > 0 && v < 1);
  expect(sunk, `expected a sub-1V OUT node in ${JSON.stringify(low.voltages)}`).toBeTruthy();
});

test('555 timer: TRIG below 1/3 Vcc drives OUT high', async ({ page }) => {
  const b = new CircuitBuilder();
  await b.load(page.request);
  expect(b.has('timer555'), '555 part seeded').toBeTruthy();

  const bat = b.place('voltagesource', { top: 300, left: 100 });
  // TRIG = 1V from a 8k/1k divider (below 1/3 · 9V = 3V) -> OUT high.
  const rTop = b.place('resistor', { top: 100, left: 300 }, { resistance: '8k' });
  const rBot = b.place('resistor', { top: 200, left: 300 }, { resistance: '1k' });
  const load = b.place('resistor', { top: 100, left: 700 }, { resistance: '10k' });
  const t = b.place('timer555', { top: 250, left: 550 });

  // Pins: 0 GND, 1 TRIG, 2 OUT, 3 RESET, 4 CTRL, 5 THR, 6 DIS, 7 VCC.
  const wires = [
    wire(bat, 0, rTop, 0),
    wire(rTop, 1, rBot, 0),
    wire(rBot, 1, bat, 1),
    wire(rTop, 1, t, 1), // 1V -> TRIG
    wire(rTop, 1, t, 5), // 1V -> THR too (below 2/3 Vcc, latch not reset)
    wire(bat, 0, t, 7), // VCC
    wire(t, 0, bat, 1), // GND
    wire(bat, 0, t, 3), // RESET high (inactive)
    wire(t, 2, load, 0), // OUT -> load
    wire(load, 1, bat, 1),
  ];

  const projectId = await createCircuitProject(page, 'E2E 555 trigger', [bat, rTop, rBot, load, t], wires);
  const results = await runSimulation(page, projectId);

  // OUT high ≈ Vcc - 1.7 = 7.3V (datasheet totem-pole drop).
  const out = nearestNode(results.voltages, 7.3, 0.4);
  expect(out, `expected ~7.3V OUT node in ${JSON.stringify(results.voltages)}`).toBeDefined();
});
