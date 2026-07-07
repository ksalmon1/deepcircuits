import { test, expect } from '@playwright/test';
import { CircuitBuilder, wire, login, createCircuitProject, runSimulation } from './utils/circuit';

/**
 * Element-rendered parts suite: library parts render through @wokwi/elements
 * web components (internal detail) while simulating with ngspice models.
 * These tests check both halves: the analytic numbers and the live
 * custom-element visuals.
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

test('wokwi LED + wokwi resistor on 9V: forward drop and glowing element', async ({ page }) => {
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

  const projectId = await createCircuitProject(page, 'E2E wokwi led', [bat, r, led], wires);
  const results = await runSimulation(page, projectId);

  // Same diode model as the plain LED: ~1.7-1.9V drop at ~7mA.
  expectNode(results.voltages, 9);
  const anodeVoltage = Object.values(results.voltages).find((v) => v > 1 && v < 3);
  expect(anodeVoltage, `LED anode between 1V and 3V in ${JSON.stringify(results.voltages)}`).toBeDefined();

  const current = sourceCurrent(results.currents);
  const expectedCurrent = (9 - (anodeVoltage as number)) / 1000;
  expect(Math.abs(current - expectedCurrent)).toBeLessThanOrEqual(0.0003);

  // Both parts must be on the canvas as web components.
  await expect(page.locator('.react-flow wokwi-resistor')).toBeVisible();
  await expect(page.locator('.react-flow wokwi-led')).toBeVisible();

  // The LED element's 'value' property drives its glow; the state rule
  // 'on: voltage > 1.5' must have switched it on.
  await expect
    .poll(async () => page.locator('.react-flow wokwi-led').evaluate((el) => (el as HTMLElement & { value: boolean }).value), {
      timeout: 15_000,
    })
    .toBe(true);
});

test('wokwi pushbutton: open blocks current, double-click presses the button', async ({ page }) => {
  const b = new CircuitBuilder();
  await b.load(page.request);

  const bat = b.place('voltagesource', { top: 100, left: 100 });
  const r = b.place('resistor', { top: 100, left: 300 }, { resistance: '1k' });
  const btn = b.place('pushbutton', { top: 100, left: 500 });

  const wires = [
    wire(bat, 0, r, 0),
    wire(r, 1, btn, 0),
    wire(btn, 1, bat, 1),
  ];

  const projectId = await createCircuitProject(page, 'E2E wokwi button open', [bat, r, btn], wires);
  const results = await runSimulation(page, projectId);

  // Open switch models as 1G ohm: effectively no current.
  expect(sourceCurrent(results.currents)).toBeLessThanOrEqual(1e-6);

  // Double-clicking the node toggles 'closed', which presses the button visual.
  const pressed = () =>
    page.locator('.react-flow wokwi-pushbutton').evaluate((el) => (el as HTMLElement & { pressed: boolean }).pressed);
  expect(await pressed()).toBe(false);
  await page.locator(`.react-flow__node[data-id="${btn.id}"]`).dblclick();
  await expect.poll(pressed).toBe(true);
});

test('wokwi pushbutton closed: full current flows', async ({ page }) => {
  const b = new CircuitBuilder();
  await b.load(page.request);

  const bat = b.place('voltagesource', { top: 100, left: 100 });
  const r = b.place('resistor', { top: 100, left: 300 }, { resistance: '1k' });
  const btn = b.place('pushbutton', { top: 100, left: 500 }, { closed: true });

  const wires = [
    wire(bat, 0, r, 0),
    wire(r, 1, btn, 0),
    wire(btn, 1, bat, 1),
  ];

  const projectId = await createCircuitProject(page, 'E2E wokwi button closed', [bat, r, btn], wires);
  const results = await runSimulation(page, projectId);

  // Closed switch is ~0 ohms: I = 9V / 1k = 9mA.
  expectNode(results.voltages, 9);
  expect(Math.abs(sourceCurrent(results.currents) - 0.009)).toBeLessThanOrEqual(0.0002);
});

test('a pin labeled GND on a passive part is not force-grounded', async ({ page }) => {
  // Ground detection must key off pin_type/signals, not display names.
  // Wire the pot as a rheostat with its 'A (GND)' pin mid-circuit: if the
  // name were still magic, that node would be clamped to 0V and no current
  // could flow through the load resistor.
  const b = new CircuitBuilder();
  await b.load(page.request);

  const bat = b.place('voltagesource', { top: 100, left: 100 });
  const pot = b.place('potentiometer', { top: 100, left: 300 }, { position: 0.5 });
  const r = b.place('resistor', { top: 100, left: 500 }, { resistance: '1k' });

  const wires = [
    wire(bat, 0, pot, 2), // + -> B (VCC)
    wire(pot, 0, r, 0), // A (GND) -> load resistor (mid-circuit, NOT ground)
    wire(r, 1, bat, 1), // load -> battery negative
  ];

  const projectId = await createCircuitProject(page, 'E2E rheostat', [bat, pot, r], wires);
  const results = await runSimulation(page, projectId);

  // Full 10k track in series with 1k: I = 9/11k ~ 0.818mA, and the
  // 'A (GND)' node sits at I * 1k ~ 0.82V above ground.
  expectNode(results.voltages, 9);
  expectNode(results.voltages, 0.818, 0.01);
  expect(Math.abs(sourceCurrent(results.currents) - 0.000818)).toBeLessThanOrEqual(0.00002);
});

test('wokwi library pins stay aligned with the elements own pinInfo', async ({ page }) => {
  // The seeded pin coordinates are static copies of each element's pinInfo,
  // so a @wokwi/elements upgrade that moves the artwork must fail here
  // rather than silently detach wire handles from the drawn legs.
  const projectId = await createCircuitProject(page, 'E2E wokwi pins', [], []);
  await page.goto(`/circuit-editor/${projectId}`);
  await expect(page.locator('.react-flow')).toBeVisible();

  const res = await page.request.get('/api/components');
  expect(res.ok()).toBeTruthy();
  const items: Array<{ type: string; pins: Array<{ name: string; x: number; y: number }> }> = await res.json();

  // Element-rendered parts are those whose type maps to a registered
  // 'wokwi-<type>' custom element (an internal detail, never shown in the UI).
  const wokwiItems: typeof items = [];
  for (const item of items) {
    const isElement = await page.evaluate((tag) => Boolean(customElements.get(tag)), `wokwi-${item.type}`);
    if (isElement) wokwiItems.push(item);
  }
  expect(wokwiItems.length).toBeGreaterThanOrEqual(50);

  for (const item of wokwiItems) {
    const pinInfo = await page.evaluate(async (tag) => {
      await customElements.whenDefined(tag);
      const el = document.createElement(tag) as HTMLElement & {
        pinInfo?: Array<{ name: string; x: number; y: number }>;
      };
      return (el.pinInfo ?? []).map(({ name, x, y }) => ({ name, x, y }));
    }, `wokwi-${item.type}`);

    for (const pin of item.pins) {
      const aligned = pinInfo.some((p) => Math.abs(p.x - pin.x) < 0.01 && Math.abs(p.y - pin.y) < 0.01);
      expect(
        aligned,
        `${item.type} pin '${pin.name}' (${pin.x}, ${pin.y}) has no matching leg in pinInfo ${JSON.stringify(pinInfo)}`,
      ).toBeTruthy();
    }
  }
});

test('wokwi potentiometer at 50%: wiper sits at half the supply', async ({ page }) => {
  const b = new CircuitBuilder();
  await b.load(page.request);

  const bat = b.place('voltagesource', { top: 100, left: 100 });
  const pot = b.place('potentiometer', { top: 100, left: 400 }, { position: 0.5 });
  // Load resistor from wiper to ground keeps the wiper node observable.
  const r = b.place('resistor', { top: 250, left: 400 }, { resistance: '1Meg' });

  const wires = [
    wire(bat, 0, pot, 2), // + -> B (VCC)
    wire(pot, 0, bat, 1), // A (GND) -> battery negative
    wire(pot, 1, r, 0), // wiper -> load
    wire(r, 1, bat, 1),
  ];

  const projectId = await createCircuitProject(page, 'E2E wokwi pot', [bat, pot, r], wires);
  const results = await runSimulation(page, projectId);

  // 10k track split 50/50, 1Meg load barely disturbs it: wiper ~4.49V.
  expectNode(results.voltages, 9);
  expectNode(results.voltages, 4.5, 0.05);
  await expect(page.locator('.react-flow wokwi-potentiometer')).toBeVisible();
});
