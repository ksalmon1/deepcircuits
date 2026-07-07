import { test, expect, Page } from '@playwright/test';
import { CircuitBuilder, wire, login, createCircuitProject, runSimulation } from './utils/circuit';

/**
 * Accuracy suite: builds real circuits the way a user's save file stores
 * them, opens the editor, presses Start, and compares the ngspice results
 * against analytic values.
 */

test.beforeEach(async ({ page }) => {
  await login(page);
});

function expectNode(voltages: Record<string, number>, expected: number, tolerance = 0.02) {
  const hit = Object.values(voltages).some((v) => Math.abs(v - expected) <= tolerance);
  expect(hit, `expected a ~${expected}V node in ${JSON.stringify(voltages)}`).toBeTruthy();
}

function sourceCurrent(currents: Record<string, number>): number {
  const values = Object.values(currents);
  expect(values.length, `currents present: ${JSON.stringify(currents)}`).toBeGreaterThan(0);
  return Math.abs(values[0]);
}

/** The LED element's 'value' property drives its glow. */
function ledValue(page: Page) {
  return page.locator('.react-flow wokwi-led').evaluate((el) => (el as HTMLElement & { value: boolean }).value);
}

test('voltage divider: 9V across 1k + 2k gives 6V midpoint and 3mA', async ({ page }) => {
  const b = new CircuitBuilder();
  await b.load(page.request);

  const bat = b.place('voltagesource', { top: 100, left: 100 });
  const r1 = b.place('resistor', { top: 100, left: 300 }, { resistance: '1k' });
  const r2 = b.place('resistor', { top: 100, left: 500 }, { resistance: '2k' });

  const wires = [
    wire(bat, 0, r1, 0),
    wire(r1, 1, r2, 0),
    wire(r2, 1, bat, 1),
  ];

  const projectId = await createCircuitProject(page, 'E2E divider', [bat, r1, r2], wires);
  const results = await runSimulation(page, projectId);

  expectNode(results.voltages, 9);
  expectNode(results.voltages, 6);
  expect(Math.abs(sourceCurrent(results.currents) - 0.003)).toBeLessThanOrEqual(0.0001);
});

test('parallel resistors: two 1k in parallel with series 1k gives 3V midpoint', async ({ page }) => {
  const b = new CircuitBuilder();
  await b.load(page.request);

  const bat = b.place('voltagesource', { top: 100, left: 100 });
  const rs = b.place('resistor', { top: 100, left: 300 }, { resistance: '1k' });
  const rp1 = b.place('resistor', { top: 60, left: 500 }, { resistance: '1k' });
  const rp2 = b.place('resistor', { top: 140, left: 500 }, { resistance: '1k' });

  const wires = [
    wire(bat, 0, rs, 0),
    wire(rs, 1, rp1, 0),
    wire(rs, 1, rp2, 0),
    wire(rp1, 1, bat, 1),
    wire(rp2, 1, bat, 1),
  ];

  const projectId = await createCircuitProject(page, 'E2E parallel', [bat, rs, rp1, rp2], wires);
  const results = await runSimulation(page, projectId);

  // Midpoint: 9 * 500 / 1500 = 3V. Total current 9/1.5k = 6mA.
  expectNode(results.voltages, 9);
  expectNode(results.voltages, 3);
  expect(Math.abs(sourceCurrent(results.currents) - 0.006)).toBeLessThanOrEqual(0.0002);
});

test('LED + 1k resistor on 9V: realistic forward drop and lit LED', async ({ page }) => {
  const b = new CircuitBuilder();
  await b.load(page.request);

  const bat = b.place('voltagesource', { top: 100, left: 100 });
  const r = b.place('resistor', { top: 100, left: 300 }, { resistance: '1k' });
  const led = b.place('led', { top: 100, left: 500 });

  const wires = [
    wire(bat, 0, r, 0),
    wire(r, 1, led, 0), // resistor -> anode
    wire(led, 1, bat, 1), // cathode -> battery negative
  ];

  const projectId = await createCircuitProject(page, 'E2E led', [bat, r, led], wires);
  const results = await runSimulation(page, projectId);

  // The LED (Is=1e-18, n=1.8) drops ~1.7-1.9V at ~7mA.
  expectNode(results.voltages, 9);
  const anodeVoltage = Object.values(results.voltages).find((v) => v > 1 && v < 3);
  expect(anodeVoltage, `LED anode between 1V and 3V in ${JSON.stringify(results.voltages)}`).toBeDefined();

  const current = sourceCurrent(results.currents);
  const expectedCurrent = (9 - (anodeVoltage as number)) / 1000;
  expect(Math.abs(current - expectedCurrent)).toBeLessThanOrEqual(0.0003);

  // The LED must actually light up: state rule 'on: voltage > 1.5'.
  await expect.poll(() => ledValue(page), { timeout: 15_000 }).toBe(true);
});

test('capacitor blocks DC: no current, full supply across the cap', async ({ page }) => {
  const b = new CircuitBuilder();
  await b.load(page.request);

  const bat = b.place('voltagesource', { top: 100, left: 100 });
  const r = b.place('resistor', { top: 100, left: 300 }, { resistance: '1k' });
  const c = b.place('capacitor', { top: 100, left: 500 });

  const wires = [
    wire(bat, 0, r, 0),
    wire(r, 1, c, 0),
    wire(c, 1, bat, 1),
  ];

  const projectId = await createCircuitProject(page, 'E2E cap', [bat, r, c], wires);
  const results = await runSimulation(page, projectId);

  // No DC current -> no drop across R: the R/C node sits at 9V.
  expectNode(results.voltages, 9, 0.01);
  const midNode = Object.values(results.voltages).filter((v) => Math.abs(v - 9) <= 0.01);
  expect(midNode.length, `both nodes at 9V in ${JSON.stringify(results.voltages)}`).toBeGreaterThanOrEqual(2);
  expect(sourceCurrent(results.currents)).toBeLessThanOrEqual(1e-9);
});

test('inductor is a DC short: full current, ~0V across it', async ({ page }) => {
  const b = new CircuitBuilder();
  await b.load(page.request);

  const bat = b.place('voltagesource', { top: 100, left: 100 });
  const r = b.place('resistor', { top: 100, left: 300 }, { resistance: '1k' });
  const l = b.place('inductor', { top: 100, left: 500 });

  const wires = [
    wire(bat, 0, r, 0),
    wire(r, 1, l, 0),
    wire(l, 1, bat, 1),
  ];

  const projectId = await createCircuitProject(page, 'E2E inductor', [bat, r, l], wires);
  const results = await runSimulation(page, projectId);

  // Inductor shorts to ground at DC: midpoint ~0V, current = 9V/1k = 9mA.
  expectNode(results.voltages, 9);
  expectNode(results.voltages, 0, 0.01);
  expect(Math.abs(sourceCurrent(results.currents) - 0.009)).toBeLessThanOrEqual(0.0002);
});

test('silicon diode: ~0.55-0.75V forward drop in series with 1k on 5V', async ({ page }) => {
  const b = new CircuitBuilder();
  await b.load(page.request);

  const bat = b.place('voltagesource', { top: 100, left: 100 }, { voltage: 5 });
  const d = b.place('diode', { top: 100, left: 300 });
  const r = b.place('resistor', { top: 100, left: 500 }, { resistance: '1k' });

  const wires = [
    wire(bat, 0, d, 0), // + -> anode
    wire(d, 1, r, 0), //  cathode -> R
    wire(r, 1, bat, 1),
  ];

  const projectId = await createCircuitProject(page, 'E2E diode', [bat, d, r], wires);
  const results = await runSimulation(page, projectId);

  expectNode(results.voltages, 5);
  // Cathode node: 5V minus the forward drop.
  const cathode = Object.values(results.voltages).find((v) => v > 4 && v < 4.7);
  expect(cathode, `cathode ~4.25-4.45V in ${JSON.stringify(results.voltages)}`).toBeDefined();
  const drop = 5 - (cathode as number);
  expect(drop).toBeGreaterThanOrEqual(0.45);
  expect(drop).toBeLessThanOrEqual(0.8);

  // KCL: current through R equals cathode voltage / 1k.
  const current = sourceCurrent(results.currents);
  expect(Math.abs(current - (cathode as number) / 1000)).toBeLessThanOrEqual(0.0002);
});

test('stopping the simulation turns everything off: LED dark, no flow', async ({ page }) => {
  const b = new CircuitBuilder();
  await b.load(page.request);

  const bat = b.place('voltagesource', { top: 300, left: 150 });
  const r = b.place('resistor', { top: 100, left: 150 }, { resistance: '1k' });
  const led = b.place('led', { top: 100, left: 450 });
  const wires = [
    wire(bat, 0, r, 0),
    wire(r, 1, led, 0),
    wire(led, 1, bat, 1),
  ];

  const projectId = await createCircuitProject(page, 'E2E stop clears', [bat, r, led], wires);
  await runSimulation(page, projectId);

  await expect.poll(() => ledValue(page), { timeout: 15_000 }).toBe(true);
  await expect(page.locator('.wire-flow-indicator')).toHaveCount(3);

  // Stop: the LED must go dark (no stale window.lastCircuitSummary
  // fallback) and the flow indicators must disappear.
  await page.getByRole('button', { name: 'Stop' }).click();
  await expect.poll(() => ledValue(page), { timeout: 10_000 }).toBe(false);
  await expect(page.locator('.wire-flow-indicator')).toHaveCount(0);
});

test('a reversed LED blocks the circuit: dark LED, no current, no flow', async ({ page }) => {
  const b = new CircuitBuilder();
  await b.load(page.request);

  const bat = b.place('voltagesource', { top: 300, left: 150 });
  const r = b.place('resistor', { top: 100, left: 150 }, { resistance: '1k' });
  const led = b.place('led', { top: 100, left: 450 });

  // Backwards: resistor into the cathode, anode to battery negative.
  const wires = [
    wire(bat, 0, r, 0),
    wire(r, 1, led, 1), // resistor -> CATHODE
    wire(led, 0, bat, 1), // ANODE -> battery negative
  ];

  const projectId = await createCircuitProject(page, 'E2E reversed led', [bat, r, led], wires);
  const results = await runSimulation(page, projectId);

  // Only diode leakage flows (picoamps).
  expect(sourceCurrent(results.currents)).toBeLessThanOrEqual(1e-9);

  // The LED must stay dark - the abs-voltage summary fallback used to
  // light it - and no wire may claim energy flow.
  await expect.poll(() => ledValue(page)).toBe(false);
  await expect(page.locator('.wire-flow-indicator')).toHaveCount(0);
});

test('LED stays dark below threshold: 1V supply cannot light a 1.8V LED', async ({ page }) => {
  const b = new CircuitBuilder();
  await b.load(page.request);

  const bat = b.place('voltagesource', { top: 100, left: 100 }, { voltage: 1 });
  const r = b.place('resistor', { top: 100, left: 300 }, { resistance: '1k' });
  const led = b.place('led', { top: 100, left: 500 });

  const wires = [
    wire(bat, 0, r, 0),
    wire(r, 1, led, 0),
    wire(led, 1, bat, 1),
  ];

  const projectId = await createCircuitProject(page, 'E2E dark led', [bat, r, led], wires);
  const results = await runSimulation(page, projectId);

  expectNode(results.voltages, 1, 0.02);
  // Nearly no current flows; the LED must stay dark.
  expect(sourceCurrent(results.currents)).toBeLessThanOrEqual(0.0005);
  await expect.poll(() => ledValue(page)).toBe(false);
});
