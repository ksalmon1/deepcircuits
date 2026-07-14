import { test, expect, Page } from '@playwright/test';
import { CircuitBuilder, login, PlacedComponent, Wire } from './utils/circuit';

/**
 * Detect sensors + voltage-driven displays: PIR toggled live from the
 * Sensor panel, and 7-segment / LED bar-graph elements lit from the solved
 * pin voltages the board drives.
 */

test.beforeEach(async ({ page }) => {
  await login(page);
});

let wireCounter = 0;

function pinHandle(part: PlacedComponent, name: string): string {
  const pin = part.pins.find((p) => p.name === name || p.name.replace(/\.\d+$/, '') === name);
  expect(pin, `pin '${name}' on ${part.type}: ${JSON.stringify(part.pins.map((p) => p.name))}`).toBeTruthy();
  return pin!.handle_id ?? `pin-${part.pins.indexOf(pin!)}`;
}

function connect(from: PlacedComponent, fromPin: string, to: PlacedComponent, toPin: string): Wire {
  const fromHandle = pinHandle(from, fromPin);
  const toHandle = pinHandle(to, toPin);
  const idx = (h: string) => parseInt(h.replace('pin-', ''), 10) || 0;
  return {
    id: `e2e-sen-wire-${++wireCounter}`,
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
  expect(created.ok(), `create project: ${created.status()}`).toBeTruthy();
  const project = await created.json();
  const saved = await page.request.put(`/projects/${project.id}`, {
    data: { name, components, wires, code },
    headers,
  });
  expect(saved.ok(), `save project: ${saved.status()}`).toBeTruthy();
  return project.id;
}

async function runProject(page: Page, projectId: string): Promise<void> {
  await page.goto(`/circuit-editor/${projectId}`);
  await expect(page.locator('.react-flow')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Run' })).toBeEnabled();
  await page.getByRole('button', { name: 'Run' }).click();
  await page.getByRole('button', { name: 'Serial' }).click();
}

const PIR_SKETCH = `
void setup() {
  pinMode(2, INPUT);
  Serial.begin(115200);
}

void loop() {
  Serial.print("MOTION=");
  Serial.println(digitalRead(2));
  delay(300);
}
`;

// Drive the digit '7' (segments A, B, C) on a common-cathode display.
const SEG_SKETCH = `
const int SEGS[8] = {9, 8, 7, 6, 5, 4, 3, 2}; // A B C D E F G DP

void setup() {
  Serial.begin(115200);
  for (int i = 0; i < 8; i++) {
    pinMode(SEGS[i], OUTPUT);
    digitalWrite(SEGS[i], LOW);
  }
  digitalWrite(SEGS[0], HIGH); // A
  digitalWrite(SEGS[1], HIGH); // B
  digitalWrite(SEGS[2], HIGH); // C
  Serial.println("SEG on");
}

void loop() {}
`;

const BAR_SKETCH = `
void setup() {
  Serial.begin(115200);
  for (int pin = 2; pin <= 4; pin++) {
    pinMode(pin, OUTPUT);
    digitalWrite(pin, HIGH);
  }
  Serial.println("BAR on");
}

void loop() {}
`;

test('PIR detect state reaches digitalRead and follows the Sensor panel', async ({ page }) => {
  test.setTimeout(180_000);
  const b = new CircuitBuilder();
  await b.load(page.request);
  expect(b.has('pir-motion-sensor'), 'pir in library').toBeTruthy();

  const board = b.place('arduino-uno', { top: 380, left: 200 });
  const pir = b.place('pir-motion-sensor', { top: 140, left: 540 });
  const wires = [
    connect(board, '2', pir, 'OUT'),
    connect(board, '5V', pir, 'VCC'),
    connect(pir, 'GND', board, 'GND'),
  ];

  const projectId = await createBoardProject(page, 'E2E pir', [board, pir], wires, PIR_SKETCH);
  await runProject(page, projectId);

  await expect(page.getByText('MOTION=0').first()).toBeVisible({ timeout: 90_000 });

  await page.getByRole('button', { name: 'Sensors' }).click();
  await page.getByTestId(`sensor-${pir.id}-active`).check();
  await expect(page.getByText('MOTION=1').first()).toBeVisible({ timeout: 30_000 });
});

test('7-segment display lights the segments the sketch drives', async ({ page }) => {
  test.setTimeout(180_000);
  const b = new CircuitBuilder();
  await b.load(page.request);
  expect(b.has('7segment'), '7segment in library').toBeTruthy();

  const board = b.place('arduino-uno', { top: 400, left: 200 });
  const seg = b.place('7segment', { top: 120, left: 540 });
  const segPins = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'DP'];
  const boardPins = ['9', '8', '7', '6', '5', '4', '3', '2'];
  const wires = segPins.map((name, i) => connect(board, boardPins[i], seg, name));
  wires.push(connect(seg, 'COM.1', board, 'GND'));

  const projectId = await createBoardProject(page, 'E2E 7segment', [board, seg], wires, SEG_SKETCH);
  await runProject(page, projectId);
  await expect(page.getByText('SEG on')).toBeVisible({ timeout: 90_000 });

  const values = () =>
    page.locator('.react-flow wokwi-7segment').evaluate((el) => {
      return Array.from((el as HTMLElement & { values: number[] }).values ?? []);
    });
  await expect.poll(values, { timeout: 30_000 }).toEqual([1, 1, 1, 0, 0, 0, 0, 0]);
});

test('LED bar graph follows the driven anodes', async ({ page }) => {
  test.setTimeout(180_000);
  const b = new CircuitBuilder();
  await b.load(page.request);
  expect(b.has('led-bar-graph'), 'bar graph in library').toBeTruthy();

  const board = b.place('arduino-uno', { top: 400, left: 200 });
  const bar = b.place('led-bar-graph', { top: 120, left: 540 });
  const wires = [
    connect(board, '2', bar, 'A1'),
    connect(board, '3', bar, 'A2'),
    connect(board, '4', bar, 'A3'),
    connect(bar, 'C1', board, 'GND'),
    connect(bar, 'C2', board, 'GND'),
    connect(bar, 'C3', board, 'GND'),
  ];

  const projectId = await createBoardProject(page, 'E2E bargraph', [board, bar], wires, BAR_SKETCH);
  await runProject(page, projectId);
  await expect(page.getByText('BAR on')).toBeVisible({ timeout: 90_000 });

  const values = () =>
    page.locator('.react-flow wokwi-led-bar-graph').evaluate((el) => {
      return Array.from((el as HTMLElement & { values: number[] }).values ?? []);
    });
  await expect.poll(values, { timeout: 30_000 }).toEqual([1, 1, 1, 0, 0, 0, 0, 0, 0, 0]);
});
