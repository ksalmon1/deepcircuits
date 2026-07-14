import { test, expect, Page } from '@playwright/test';
import { CircuitBuilder, login, PlacedComponent, Wire } from './utils/circuit';

/**
 * Long-tail peripherals: stepper coil-phase decoding, NEC IR frames, the
 * HX711 load-cell bit-bang, and the membrane-keypad switch matrix. All
 * sketches use only core Arduino APIs.
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
    id: `e2e-lt-wire-${++wireCounter}`,
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

async function runProject(page: Page, projectId: string): Promise<void> {
  await page.goto(`/circuit-editor/${projectId}`);
  await expect(page.locator('.react-flow')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Run' })).toBeEnabled();
  await page.getByRole('button', { name: 'Run' }).click();
  await page.getByRole('button', { name: 'Serial' }).click();
}

// 50 full steps forward = 90°, driving an H-bridge's four inputs.
const STEPPER_SKETCH = `
const int AP = 8, AM = 9, BP = 10, BM = 11;
const int SEQ[4][4] = {
  {1, 0, 0, 0}, // A+
  {0, 0, 1, 0}, // B+
  {0, 1, 0, 0}, // A-
  {0, 0, 0, 1}, // B-
};

void setup() {
  Serial.begin(115200);
  int pins[] = {AP, AM, BP, BM};
  for (int i = 0; i < 4; i++) pinMode(pins[i], OUTPUT);
  for (int step = 0; step <= 50; step++) {
    const int *s = SEQ[step % 4];
    digitalWrite(AP, s[0]);
    digitalWrite(AM, s[1]);
    digitalWrite(BP, s[2]);
    digitalWrite(BM, s[3]);
    delay(5);
  }
  Serial.println("STEPS done");
}

void loop() {}
`;

// Decode NEC by measuring the mark/space envelope on the receiver's DAT pin.
const IR_SKETCH = `
const int DAT = 2;

void setup() {
  pinMode(DAT, INPUT);
  Serial.begin(115200);
  Serial.println("IR ready");
}

void loop() {
  // Decode by measuring only the spaces (the high gaps): each starts from a
  // low line, so consecutive pulseIn calls can never miss one. The 4.5ms
  // leader space marks the start of a frame; the 32 that follow carry the
  // bits (560us = 0, 1690us = 1), LSB first per byte.
  unsigned long space = pulseIn(DAT, HIGH, 200000UL);
  if (space < 4000 || space > 5000) return; // not the leader

  uint32_t value = 0;
  for (int i = 0; i < 32; i++) {
    unsigned long bit = pulseIn(DAT, HIGH, 20000UL);
    if (bit == 0) return; // frame broke up
    if (bit > 1000) value |= (1UL << i);
  }
  uint8_t command = (value >> 16) & 0xFF;
  Serial.print("IR=");
  Serial.println(command);
  delay(200);
}
`;

const HX711_SKETCH = `
const int DT = 3, SCK_PIN = 4;

long readCount() {
  while (digitalRead(DT) == HIGH) {}
  long value = 0;
  for (int i = 0; i < 24; i++) {
    digitalWrite(SCK_PIN, HIGH);
    delayMicroseconds(2);
    value = (value << 1) | digitalRead(DT);
    digitalWrite(SCK_PIN, LOW);
    delayMicroseconds(2);
  }
  digitalWrite(SCK_PIN, HIGH); // 25th pulse: gain select
  delayMicroseconds(2);
  digitalWrite(SCK_PIN, LOW);
  return value;
}

void setup() {
  pinMode(DT, INPUT);
  pinMode(SCK_PIN, OUTPUT);
  digitalWrite(SCK_PIN, LOW);
  Serial.begin(115200);
}

void loop() {
  long counts = readCount();
  Serial.print("GRAMS=");
  Serial.println(counts / 420);
  delay(200);
}
`;

// Classic 4x4 scan: rows driven low one at a time, columns with pull-ups.
const KEYPAD_SKETCH = `
const int ROWS[4] = {5, 6, 7, 8};
const int COLS[4] = {9, 10, 11, 12};
const char KEYS[4][4] = {
  {'1','2','3','A'},
  {'4','5','6','B'},
  {'7','8','9','C'},
  {'*','0','#','D'},
};

void setup() {
  Serial.begin(115200);
  for (int i = 0; i < 4; i++) {
    pinMode(ROWS[i], OUTPUT);
    digitalWrite(ROWS[i], HIGH);
    pinMode(COLS[i], INPUT_PULLUP);
  }
  Serial.println("KEYPAD ready");
}

void loop() {
  for (int r = 0; r < 4; r++) {
    digitalWrite(ROWS[r], LOW);
    delayMicroseconds(50);
    for (int c = 0; c < 4; c++) {
      if (digitalRead(COLS[c]) == LOW) {
        Serial.print("KEY=");
        Serial.println(KEYS[r][c]);
        delay(150);
      }
    }
    digitalWrite(ROWS[r], HIGH);
  }
  delay(10);
}
`;

test('stepper coil sequence turns the shaft 1.8° per full step', async ({ page }) => {
  test.setTimeout(180_000);
  const b = new CircuitBuilder();
  await b.load(page.request);
  expect(b.has('stepper-motor'), 'stepper in library').toBeTruthy();

  const board = b.place('arduino-uno', { top: 400, left: 200 });
  const stepper = b.place('stepper-motor', { top: 140, left: 560 });
  const wires = [
    connect(board, '8', stepper, 'A+'),
    connect(board, '9', stepper, 'A-'),
    connect(board, '10', stepper, 'B+'),
    connect(board, '11', stepper, 'B-'),
  ];

  const projectId = await createBoardProject(page, 'E2E stepper', [board, stepper], wires, STEPPER_SKETCH);
  await runProject(page, projectId);
  await expect(page.getByText('STEPS done')).toBeVisible({ timeout: 90_000 });

  // 50 full steps × 1.8° = 90°.
  const angle = () =>
    page.locator('.react-flow wokwi-stepper-motor').evaluate((el) => (el as HTMLElement & { angle: number }).angle);
  await expect.poll(angle, { timeout: 30_000 }).toBeCloseTo(90, 0);
});

test('IR receiver delivers a NEC command the sketch decodes', async ({ page }) => {
  test.setTimeout(180_000);
  const b = new CircuitBuilder();
  await b.load(page.request);
  expect(b.has('ir-receiver'), 'ir-receiver in library').toBeTruthy();

  const board = b.place('arduino-uno', { top: 380, left: 200 });
  const ir = b.place('ir-receiver', { top: 160, left: 560 });
  const wires = [
    connect(board, '2', ir, 'DAT'),
    connect(board, '5V', ir, 'VCC'),
    connect(ir, 'GND', board, 'GND'),
  ];

  const projectId = await createBoardProject(page, 'E2E ir', [board, ir], wires, IR_SKETCH);
  await runProject(page, projectId);
  await expect(page.getByText('IR ready')).toBeVisible({ timeout: 90_000 });

  // "Press" a remote key: command 69 (0x45, the classic power button).
  await page.getByRole('button', { name: 'Sensors' }).click();
  await page.getByTestId(`sensor-${ir.id}-sendCode`).fill('69');
  await expect(page.getByText('IR=69').first()).toBeVisible({ timeout: 30_000 });
});

test('HX711 clocks out the injected weight', async ({ page }) => {
  test.setTimeout(180_000);
  const b = new CircuitBuilder();
  await b.load(page.request);
  expect(b.has('hx711'), 'hx711 in library').toBeTruthy();

  const board = b.place('arduino-uno', { top: 380, left: 200 });
  const hx = b.place('hx711', { top: 160, left: 560 }, { weight: 500 });
  const wires = [
    connect(board, '3', hx, 'DT'),
    connect(board, '4', hx, 'SCK'),
    connect(board, '5V', hx, 'VCC'),
    connect(hx, 'GND', board, 'GND'),
  ];

  const projectId = await createBoardProject(page, 'E2E hx711', [board, hx], wires, HX711_SKETCH);
  await runProject(page, projectId);

  await expect(page.getByText('GRAMS=500').first()).toBeVisible({ timeout: 90_000 });

  // Change the load mid-run.
  await page.getByRole('button', { name: 'Sensors' }).click();
  await page.getByTestId(`sensor-${hx.id}-weight`).fill('1200');
  await expect(page.getByText('GRAMS=1200').first()).toBeVisible({ timeout: 30_000 });
});

test('membrane keypad: a pressed key is found by the row/column scan', async ({ page }) => {
  test.setTimeout(180_000);
  const b = new CircuitBuilder();
  await b.load(page.request);
  expect(b.has('membrane-keypad'), 'keypad in library').toBeTruthy();

  const board = b.place('arduino-uno', { top: 400, left: 200 });
  const keypad = b.place('membrane-keypad', { top: 120, left: 560 });
  const wires = [
    connect(board, '5', keypad, 'R1'),
    connect(board, '6', keypad, 'R2'),
    connect(board, '7', keypad, 'R3'),
    connect(board, '8', keypad, 'R4'),
    connect(board, '9', keypad, 'C1'),
    connect(board, '10', keypad, 'C2'),
    connect(board, '11', keypad, 'C3'),
    connect(board, '12', keypad, 'C4'),
  ];

  const projectId = await createBoardProject(page, 'E2E keypad', [board, keypad], wires, KEYPAD_SKETCH);
  await runProject(page, projectId);
  await expect(page.getByText('KEYPAD ready')).toBeVisible({ timeout: 90_000 });

  // Press '5' on the rendered keypad (row 1, column 1). The element raises
  // button-press on a real click; dispatching it directly keeps the test off
  // the SVG hit-testing.
  const keypadElement = page.locator('.react-flow wokwi-membrane-keypad');
  await expect(keypadElement).toBeVisible();
  await keypadElement.evaluate((el) => {
    el.dispatchEvent(new CustomEvent('button-press', { detail: { key: '5' }, bubbles: true }));
  });
  await expect(page.getByText('KEY=5').first()).toBeVisible({ timeout: 30_000 });

  // Releasing it stops the scan from finding the key.
  await keypadElement.evaluate((el) => {
    el.dispatchEvent(new CustomEvent('button-release', { detail: { key: '5' }, bubbles: true }));
  });
});
