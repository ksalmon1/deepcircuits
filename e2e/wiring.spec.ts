import { test, expect, Page } from '@playwright/test';
import { CircuitBuilder, wire, login, createCircuitProject, runSimulation } from './utils/circuit';

/**
 * Wiring UX suite: pins hidden until hover, orthogonal auto-routed wires,
 * draggable bend points, and the energy-flow direction indicator.
 */

test.beforeEach(async ({ page }) => {
  await login(page);
});

async function buildLedCircuit(page: Page) {
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
  return { components: [bat, r, led], wires };
}

test('pins are hidden until the component is hovered', async ({ page }) => {
  const { components, wires } = await buildLedCircuit(page);
  const projectId = await createCircuitProject(page, 'E2E hidden pins', components, wires);
  await page.goto(`/circuit-editor/${projectId}`);
  await expect(page.locator('.react-flow')).toBeVisible();

  const handle = page.locator('.circuit-pin-handle').first();
  await expect(handle).toHaveCSS('opacity', '0');

  await page.locator('.react-flow__node').first().hover();
  await expect(handle).toHaveCSS('opacity', '1');
});

test('wires route orthogonally: every segment is horizontal or vertical', async ({ page }) => {
  const { components, wires } = await buildLedCircuit(page);
  const projectId = await createCircuitProject(page, 'E2E ortho wires', components, wires);
  await page.goto(`/circuit-editor/${projectId}`);
  await expect(page.locator('.react-flow')).toBeVisible();

  const paths = await page.locator('.react-flow__edge-path').all();
  expect(paths.length).toBe(3);
  for (const path of paths) {
    const d = (await path.getAttribute('d')) ?? '';
    const points = d.match(/[-\d.]+,[-\d.]+/g)?.map((pair) => {
      const [x, y] = pair.split(',').map(Number);
      return { x, y };
    }) ?? [];
    expect(points.length, `polyline points in '${d}'`).toBeGreaterThanOrEqual(2);
    for (let i = 1; i < points.length; i++) {
      const horizontal = Math.abs(points[i].y - points[i - 1].y) < 0.01;
      const vertical = Math.abs(points[i].x - points[i - 1].x) < 0.01;
      expect(horizontal || vertical, `segment ${i} of '${d}' is axis-aligned`).toBeTruthy();
    }
  }
});

test('selecting a wire shows bend dots and dragging one reshapes and persists', async ({ page }) => {
  const { components, wires } = await buildLedCircuit(page);
  const projectId = await createCircuitProject(page, 'E2E wire bends', components, wires);
  await page.goto(`/circuit-editor/${projectId}`);
  await expect(page.locator('.react-flow')).toBeVisible();

  // Select the first wire by clicking its path.
  const edgePath = page.locator('.react-flow__edge-path').first();
  const before = await edgePath.getAttribute('d');
  await edgePath.click({ force: true });
  await expect(page.locator('circle.wire-midpoint').first()).toBeVisible();
  expect(await page.locator('circle.wire-waypoint').count()).toBe(0);

  // Drag a midpoint dot to create a bend.
  const mid = page.locator('circle.wire-midpoint').first();
  const box = (await mid.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + 60, box.y + 45, { steps: 5 });
  await page.mouse.up();

  await expect(page.locator('circle.wire-waypoint')).toHaveCount(1);
  const after = await edgePath.getAttribute('d');
  expect(after).not.toBe(before);

  // Save, reload, and confirm the bend survived the round trip.
  await page.getByRole('button', { name: /save/i }).click();
  await page.waitForTimeout(800);
  await page.reload();
  await expect(page.locator('.react-flow')).toBeVisible();
  const reloaded = await page.locator('.react-flow__edge-path').first().getAttribute('d');
  expect(reloaded).toBe(after);
});

test('potentiometer wires get flow direction from per-leg track currents', async ({ page }) => {
  const b = new CircuitBuilder();
  await b.load(page.request);

  const bat = b.place('voltagesource', { top: 300, left: 100 });
  const pot = b.place('potentiometer', { top: 100, left: 300 }, { position: 0.5 });
  const r = b.place('resistor', { top: 100, left: 500 }, { resistance: '1k' });

  // Rheostat: current enters at B, leaves at A, wiper unused.
  const wires = [
    wire(bat, 0, pot, 2), // + -> B (VCC)
    wire(pot, 0, r, 0), // A -> load
    wire(r, 1, bat, 1), // load -> battery negative
  ];

  const projectId = await createCircuitProject(page, 'E2E pot flow', [bat, pot, r], wires);
  await runSimulation(page, projectId);

  // All three wires, including both potentiometer legs, know their
  // direction; as drawn the conventional current follows the wire order.
  const indicators = page.locator('.wire-flow-indicator');
  await expect(indicators).toHaveCount(3, { timeout: 15_000 });
  for (const indicator of await indicators.all()) {
    await expect(indicator).toHaveAttribute('data-flow', 'forward');
  }
});

test('dash animation speed scales with the wire current', async ({ page }) => {
  const b = new CircuitBuilder();
  await b.load(page.request);

  // Two parallel branches: 100 ohm (90mA) and 100k (0.09mA). The heavy
  // branch must animate faster, and each branch shows its own current,
  // not the shared battery total.
  const bat = b.place('voltagesource', { top: 200, left: 100 });
  const heavy = b.place('resistor', { top: 100, left: 400 }, { resistance: '100' });
  const light = b.place('resistor', { top: 300, left: 400 }, { resistance: '100k' });

  const wires = [
    wire(bat, 0, heavy, 0),
    wire(heavy, 1, bat, 1),
    wire(bat, 0, light, 0),
    wire(light, 1, bat, 1),
  ];

  const projectId = await createCircuitProject(page, 'E2E flow speed', [bat, heavy, light], wires);
  await runSimulation(page, projectId);

  const indicators = page.locator('.wire-flow-indicator');
  await expect(indicators).toHaveCount(4, { timeout: 15_000 });

  const durations = await indicators.evaluateAll((paths) =>
    paths.map((p) => parseFloat(getComputedStyle(p).animationDuration)),
  );
  // Wires 0-1 belong to the heavy branch, 2-3 to the light branch.
  expect(durations[0]).toBeCloseTo(durations[1], 5);
  expect(durations[2]).toBeCloseTo(durations[3], 5);
  expect(durations[0]).toBeLessThan(durations[2]);
});

test('inductor and current-source wires also animate flow', async ({ page }) => {
  const b = new CircuitBuilder();
  await b.load(page.request);

  // Series loop: 9V -> resistor -> inductor (a DC short) -> back.
  const bat = b.place('voltagesource', { top: 300, left: 100 });
  const r = b.place('resistor', { top: 100, left: 300 }, { resistance: '1k' });
  const l = b.place('inductor', { top: 100, left: 500 });
  const wires = [
    wire(bat, 0, r, 0),
    wire(r, 1, l, 0),
    wire(l, 1, bat, 1),
  ];
  const projectId = await createCircuitProject(page, 'E2E inductor flow', [bat, r, l], wires);
  await runSimulation(page, projectId);
  const indicators = page.locator('.wire-flow-indicator');
  await expect(indicators).toHaveCount(3, { timeout: 15_000 });
  for (const indicator of await indicators.all()) {
    await expect(indicator).toHaveAttribute('data-flow', 'forward');
  }

  // Current source loop: 5mA out of the + pin through 1k.
  const b2 = new CircuitBuilder();
  await b2.load(page.request);
  const cs = b2.place('currentsource', { top: 100, left: 100 });
  const r2 = b2.place('resistor', { top: 100, left: 300 }, { resistance: '1k' });
  const gnd = b2.place('ground', { top: 250, left: 100 });
  const wires2 = [
    wire(cs, 0, r2, 0),
    wire(r2, 1, cs, 1),
    wire(cs, 1, gnd, 0),
  ];
  const projectId2 = await createCircuitProject(page, 'E2E isource flow', [cs, r2, gnd], wires2);
  await runSimulation(page, projectId2);
  // The two loop wires flow forward as drawn (out of +, through R, back).
  await expect(page.locator('.wire-flow-indicator').nth(1)).toBeAttached({ timeout: 15_000 });
  await expect(page.locator('.wire-flow-indicator').nth(0)).toHaveAttribute('data-flow', 'forward');
  await expect(page.locator('.wire-flow-indicator').nth(1)).toHaveAttribute('data-flow', 'forward');
});

test('junction wires flow toward the branch they feed, not the bigger current', async ({ page }) => {
  const b = new CircuitBuilder();
  await b.load(page.request);

  // Battery feeds r1's input pin; a second wire chains from r1's input pin
  // to r2's input. That chained wire carries r2's current toward r2 - even
  // though r2 (100 ohm, 90mA) draws far more than r1 (100k, 0.09mA), which
  // would fool a smaller-magnitude-wins heuristic into flipping it.
  const bat = b.place('voltagesource', { top: 200, left: 100 });
  const r1 = b.place('resistor', { top: 100, left: 400 }, { resistance: '100k' });
  const r2 = b.place('resistor', { top: 300, left: 400 }, { resistance: '100' });

  const wires = [
    wire(bat, 0, r1, 0),
    wire(r1, 0, r2, 0), // junction wire: r1's input pin chains on to r2
    wire(r1, 1, bat, 1),
    wire(r2, 1, bat, 1),
  ];

  const projectId = await createCircuitProject(page, 'E2E junction flow', [bat, r1, r2], wires);
  await runSimulation(page, projectId);

  const indicators = page.locator('.wire-flow-indicator');
  await expect(indicators).toHaveCount(4, { timeout: 15_000 });
  // Wire 1 is the junction wire; it feeds r2, so flow runs source->target.
  await expect(indicators.nth(1)).toHaveAttribute('data-flow', 'forward');
  // And it carries r2's 90mA, so it animates as fast as r2's return wire.
  const durations = await indicators.evaluateAll((paths) =>
    paths.map((p) => parseFloat(getComputedStyle(p).animationDuration)),
  );
  expect(durations[1]).toBeCloseTo(durations[3], 5);
});

test('after a run, wires know which way current flows', async ({ page }) => {
  const { components, wires } = await buildLedCircuit(page);
  const projectId = await createCircuitProject(page, 'E2E wire flow', components, wires);
  await runSimulation(page, projectId);

  // All three wires carry the same series current; each must have a flow
  // indicator, and all must agree with conventional current direction as
  // drawn: battery+ -> resistor -> LED -> battery-.
  const indicators = page.locator('.wire-flow-indicator');
  await expect(indicators).toHaveCount(3, { timeout: 15_000 });
  for (const indicator of await indicators.all()) {
    await expect(indicator).toHaveAttribute('data-flow', 'forward');
  }

  // The flow must be visible during the run without hovering, and the
  // dashes must actually be animating.
  const visual = await indicators.first().evaluate((el) => {
    const cs = getComputedStyle(el);
    return { opacity: parseFloat(cs.opacity), animation: cs.animationName, playState: cs.animationPlayState };
  });
  expect(visual.opacity).toBeGreaterThanOrEqual(0.4);
  expect(visual.animation).toBe('wire-flow-dash');
  expect(visual.playState).toBe('running');
});
