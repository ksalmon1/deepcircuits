import { test, expect } from '@playwright/test';
import {
  CircuitBuilder,
  wire,
  login,
  createCircuitProject,
  runSimulation,
  clearSimResults,
  waitForSimResults,
} from './utils/circuit';

/**
 * Tier 1 component suite: potentiometer, current source, zener, switch,
 * lamp, buzzer, fuse, photoresistor - each checked against analytic values
 * and, where the part has a visual state, against the rendered SVG.
 */

test.beforeEach(async ({ page }) => {
  await login(page);
});

function expectNode(voltages: Record<string, number>, expected: number, tolerance = 0.05) {
  const hit = Object.values(voltages).some((v) => Math.abs(v - expected) <= tolerance);
  expect(hit, `expected a ~${expected}V node in ${JSON.stringify(voltages)}`).toBeTruthy();
}

test('potentiometer: wiper divides the supply by its position', async ({ page }) => {
  const b = new CircuitBuilder();
  await b.load(page.request);

  const bat = b.place('voltagesource', { top: 100, left: 100 });
  const pot = b.place('potentiometer', { top: 100, left: 300 }, { position: 0.25 });

  const wires = [
    wire(bat, 0, pot, 0), // + -> A
    wire(pot, 2, bat, 1), // B -> -
  ];

  const projectId = await createCircuitProject(page, 'E2E pot', [bat, pot], wires);
  const results = await runSimulation(page, projectId);

  // position 0.25 -> R(A->W) = 2.5k, R(W->B) = 7.5k -> V(wiper) = 9 * 7.5/10 = 6.75V.
  expectNode(results.voltages, 9);
  expectNode(results.voltages, 6.75);
});

test('current source: 5mA through 1k develops 5V', async ({ page }) => {
  const b = new CircuitBuilder();
  await b.load(page.request);

  const cs = b.place('currentsource', { top: 100, left: 100 });
  const r = b.place('resistor', { top: 100, left: 300 }, { resistance: '1k' });
  const gnd = b.place('ground', { top: 250, left: 100 });

  const wires = [
    wire(cs, 0, r, 0), // + -> R
    wire(r, 1, cs, 1), // R -> return
    wire(cs, 1, gnd, 0), // return -> ground
  ];

  const projectId = await createCircuitProject(page, 'E2E isource', [cs, r, gnd], wires);
  const results = await runSimulation(page, projectId);

  // I * R = 0.005 * 1000 = 5V at the + pin.
  expectNode(results.voltages, 5, 0.01);
});

test('zener diode regulates a 9V supply down to ~5.1V', async ({ page }) => {
  const b = new CircuitBuilder();
  await b.load(page.request);

  const bat = b.place('voltagesource', { top: 100, left: 100 });
  const r = b.place('resistor', { top: 100, left: 300 }, { resistance: '1k' });
  const z = b.place('zener', { top: 100, left: 500 });

  const wires = [
    wire(bat, 0, r, 0), // + -> R
    wire(r, 1, z, 1), //  R -> cathode (reverse biased)
    wire(z, 0, bat, 1), // anode -> -
  ];

  const projectId = await createCircuitProject(page, 'E2E zener', [bat, r, z], wires);
  const results = await runSimulation(page, projectId);

  expectNode(results.voltages, 9);
  // Regulation point: ~BV, allowing for the soft breakdown knee.
  const cathode = Object.values(results.voltages).find((v) => v > 4.5 && v < 5.6);
  expect(cathode, `cathode near 5.1V in ${JSON.stringify(results.voltages)}`).toBeDefined();
  // Series resistor carries (9 - Vz) / 1k.
  const current = Math.abs(Object.values(results.currents)[0] ?? 0);
  expect(Math.abs(current - (9 - (cathode as number)) / 1000)).toBeLessThanOrEqual(0.0005);
});

test('switch: double-click closes the circuit and lights the lamp live', async ({ page }) => {
  const b = new CircuitBuilder();
  await b.load(page.request);

  const bat = b.place('voltagesource', { top: 100, left: 100 });
  const sw = b.place('switch', { top: 100, left: 300 });
  const lamp = b.place('lamp', { top: 100, left: 500 });

  const wires = [
    wire(bat, 0, sw, 0),
    wire(sw, 1, lamp, 0),
    wire(lamp, 1, bat, 1),
  ];

  const projectId = await createCircuitProject(page, 'E2E switch', [bat, sw, lamp], wires);
  const results = await runSimulation(page, projectId);

  // Switch is open: essentially no current, lamp dark, lever shown open.
  expect(Math.abs(Object.values(results.currents)[0] ?? 0)).toBeLessThanOrEqual(1e-6);
  const lampSvg = page.locator(`svg[data-component-id="${lamp.id}"]`);
  await expect(lampSvg).toHaveAttribute('data-is-on', 'false');
  await expect(page.locator(`svg[data-component-id="${sw.id}"] #sw-lever-closed`)).toHaveAttribute('opacity', '0');

  // Double-click the switch on the canvas: the simulation is live, so the
  // circuit re-runs and the lamp lights up.
  await clearSimResults(page);
  await page.locator(`.react-flow__node[data-id="${sw.id}"]`).dblclick();
  await expect(page.locator(`svg[data-component-id="${sw.id}"] #sw-lever-closed`)).toHaveAttribute('opacity', '1');

  const closedResults = await waitForSimResults(page);
  // 9V across the 100Ω lamp: 90mA.
  expect(Math.abs(Math.abs(Object.values(closedResults.currents)[0] ?? 0) - 0.09)).toBeLessThanOrEqual(0.001);
  await expect(lampSvg).toHaveAttribute('data-is-on', 'true', { timeout: 30_000 });
  await expect(page.locator(`svg[data-component-id="${lamp.id}"] #lamp-bulb`)).toHaveAttribute('fill', '#ffd93b');
});

test('buzzer activates above its 1V threshold', async ({ page }) => {
  const b = new CircuitBuilder();
  await b.load(page.request);

  const bat = b.place('voltagesource', { top: 100, left: 100 });
  const r = b.place('resistor', { top: 100, left: 300 }, { resistance: 470 });
  const buz = b.place('buzzer', { top: 100, left: 500 });

  const wires = [
    wire(bat, 0, r, 0),
    wire(r, 1, buz, 0),
    wire(buz, 1, bat, 1),
  ];

  const projectId = await createCircuitProject(page, 'E2E buzzer', [bat, r, buz], wires);
  const results = await runSimulation(page, projectId);

  // Divider: 9 * 100 / 570 = 1.58V across the buzzer -> above threshold.
  expectNode(results.voltages, 1.58, 0.02);
  const buzzerSvg = page.locator(`svg[data-component-id="${buz.id}"]`);
  await expect(buzzerSvg).toHaveAttribute('data-active-states', /on/, { timeout: 30_000 });
  await expect(page.locator(`svg[data-component-id="${buz.id}"] #buzzer-waves`)).toHaveAttribute('opacity', '1');
});

test('fuse shows blown above its 1A rating', async ({ page }) => {
  const b = new CircuitBuilder();
  await b.load(page.request);

  const bat = b.place('voltagesource', { top: 100, left: 100 });
  const fuse = b.place('fuse', { top: 100, left: 300 });

  const wires = [
    wire(bat, 0, fuse, 0),
    wire(fuse, 1, bat, 1),
  ];

  const projectId = await createCircuitProject(page, 'E2E fuse', [bat, fuse], wires);
  const results = await runSimulation(page, projectId);

  // 9V straight across the 1Ω fuse: 9A - way over the 1A rating.
  const current = Math.abs(Object.values(results.currents)[0] ?? 0);
  expect(Math.abs(current - 9)).toBeLessThanOrEqual(0.05);
  const fuseSvg = page.locator(`svg[data-component-id="${fuse.id}"]`);
  await expect(fuseSvg).toHaveAttribute('data-active-states', /blown/, { timeout: 30_000 });
  await expect(page.locator(`svg[data-component-id="${fuse.id}"] #fuse-blown`)).toHaveAttribute('opacity', '1');
});

test('photoresistor works as a divider leg (resistive family)', async ({ page }) => {
  const b = new CircuitBuilder();
  await b.load(page.request);

  const bat = b.place('voltagesource', { top: 100, left: 100 });
  const ldr = b.place('photoresistor', { top: 100, left: 300 }, { resistance: '5k' });
  const r = b.place('resistor', { top: 100, left: 500 }, { resistance: '5k' });

  const wires = [
    wire(bat, 0, ldr, 0),
    wire(ldr, 1, r, 0),
    wire(r, 1, bat, 1),
  ];

  const projectId = await createCircuitProject(page, 'E2E ldr', [bat, ldr, r], wires);
  const results = await runSimulation(page, projectId);

  // Equal 5k legs: 4.5V midpoint, 0.9mA.
  expectNode(results.voltages, 4.5, 0.01);
  const current = Math.abs(Object.values(results.currents)[0] ?? 0);
  expect(Math.abs(current - 0.0009)).toBeLessThanOrEqual(0.00005);
});
