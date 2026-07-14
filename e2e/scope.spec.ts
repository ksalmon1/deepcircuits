import { test, expect, Page } from '@playwright/test';
import { CircuitBuilder, login, PlacedComponent, Wire } from './utils/circuit';

/**
 * Scope panel: the running board's GPIO edges are captured and plotted as
 * digital step traces, one channel per toggling pin.
 */

test.beforeEach(async ({ page }) => {
  await login(page);
});

let wireCounter = 0;

function pinHandle(part: PlacedComponent, name: string): string {
  const pin = part.pins.find((p) => p.name === name || p.name.replace(/\.\d+$/, '') === name);
  expect(pin, `pin '${name}' on ${part.type}`).toBeTruthy();
  return pin!.handle_id ?? `pin-${part.pins.indexOf(pin!)}`;
}

function connect(from: PlacedComponent, fromPin: string, to: PlacedComponent, toPin: string): Wire {
  const fromHandle = pinHandle(from, fromPin);
  const toHandle = pinHandle(to, toPin);
  const idx = (h: string) => parseInt(h.replace('pin-', ''), 10) || 0;
  return {
    id: `e2e-scope-wire-${++wireCounter}`,
    source: from.id,
    target: to.id,
    sourceHandle: fromHandle,
    targetHandle: toHandle,
    type: 'customWire',
    data: { color: '#555', sourcePinIndex: idx(fromHandle), targetPinIndex: idx(toHandle) },
  };
}

async function createBoardProject(
  page: Page,
  name: string,
  components: PlacedComponent[],
  wires: Wire[],
  code: string,
): Promise<string> {
  const cookies = await page.context().cookies();
  const token = cookies.find((c) => c.name === 'XSRF-TOKEN')?.value ?? '';
  const headers = {
    'X-XSRF-TOKEN': decodeURIComponent(token),
    'X-Requested-With': 'XMLHttpRequest',
    Accept: 'application/json',
  };
  const created = await page.request.post('/projects', { data: { name }, headers });
  expect(created.ok()).toBeTruthy();
  const project = await created.json();
  const saved = await page.request.put(`/projects/${project.id}`, {
    data: { name, components, wires, code },
    headers,
  });
  expect(saved.ok()).toBeTruthy();
  return project.id;
}

// Two channels at different rates: pin 13 at ~100Hz, pin 12 at ~50Hz.
const SQUARE_SKETCH = `
void setup() {
  pinMode(13, OUTPUT);
  pinMode(12, OUTPUT);
  Serial.begin(115200);
  Serial.println("SQUARE running");
}

void loop() {
  digitalWrite(13, HIGH);
  delay(5);
  digitalWrite(13, LOW);
  digitalWrite(12, HIGH);
  delay(5);
  digitalWrite(13, HIGH);
  delay(5);
  digitalWrite(13, LOW);
  digitalWrite(12, LOW);
  delay(5);
}
`;

test('scope captures the square waves the sketch drives on two pins', async ({ page }) => {
  test.setTimeout(180_000);
  const b = new CircuitBuilder();
  await b.load(page.request);

  const board = b.place('arduino-uno', { top: 380, left: 240 });
  const r = b.place('resistor', { top: 150, left: 480 }, { resistance: 220 });
  const led = b.place('led', { top: 220, left: 640 }, { color: 'red' });
  const wires = [
    connect(board, '13', r, 'Pin 1'),
    connect(r, 'Pin 2', led, 'Anode (+)'),
    connect(led, 'Cathode (-)', board, 'GND'),
  ];

  const projectId = await createBoardProject(page, 'E2E scope', [board, r, led], wires, SQUARE_SKETCH);
  await page.goto(`/circuit-editor/${projectId}`);
  await expect(page.locator('.react-flow')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Run' })).toBeEnabled();
  await page.getByRole('button', { name: 'Run' }).click();
  await page.getByRole('button', { name: 'Serial' }).click();
  await expect(page.getByText('SQUARE running')).toBeVisible({ timeout: 90_000 });

  await page.getByRole('button', { name: 'Scope' }).click();
  const scope = page.getByTestId('scope-panel');
  await expect(scope).toBeVisible();

  // Both toggling pins get a labelled channel...
  await expect(scope.getByText('D13')).toBeVisible({ timeout: 30_000 });
  await expect(scope.getByText('D12')).toBeVisible({ timeout: 30_000 });

  // ...and the plot draws step paths for them.
  await expect
    .poll(async () => scope.locator('svg path.recharts-curve').count(), { timeout: 30_000 })
    .toBeGreaterThanOrEqual(2);

  // Pausing freezes the capture: the rendered path stops changing.
  await page.getByRole('button', { name: 'Pause capture' }).click();
  const pathOf = () =>
    scope.locator('svg path.recharts-curve').first().getAttribute('d');
  const frozen = await pathOf();
  await page.waitForTimeout(1000);
  expect(await pathOf()).toBe(frozen);
});
