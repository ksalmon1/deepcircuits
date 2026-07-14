import { test, expect, Page } from '@playwright/test';
import { CircuitBuilder, login, PlacedComponent, Wire } from './utils/circuit';

/**
 * GPIO-peripheral suite: parts speaking ad-hoc pin protocols against the
 * emulated board — servo PWM decoding, HC-SR04 echo timing (with live
 * distance injection), and the DHT22 1-wire bit stream. All sketches are
 * dependency-free (no external libraries).
 */

test.beforeEach(async ({ page }) => {
  await login(page);
});

let wireCounter = 0;

function pinHandle(part: PlacedComponent, name: string): string {
  const pin = part.pins.find((p) => p.name.replace(/\.\d+$/, '') === name);
  expect(pin, `pin '${name}' on ${part.type}: ${JSON.stringify(part.pins.map((p) => p.name))}`).toBeTruthy();
  return pin!.handle_id ?? `pin-${part.pins.indexOf(pin!)}`;
}

function connect(from: PlacedComponent, fromPin: string, to: PlacedComponent, toPin: string): Wire {
  const fromHandle = pinHandle(from, fromPin);
  const toHandle = pinHandle(to, toPin);
  const idx = (h: string) => parseInt(h.replace('pin-', ''), 10) || 0;
  return {
    id: `e2e-gpio-wire-${++wireCounter}`,
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

// 50Hz bit-banged servo pulses: 1500µs = mid position.
const SERVO_SKETCH = `
const int SIG = 9;

void setup() {
  pinMode(SIG, OUTPUT);
  Serial.begin(115200);
  Serial.println("SERVO running");
}

void loop() {
  digitalWrite(SIG, HIGH);
  delayMicroseconds(1500);
  digitalWrite(SIG, LOW);
  delay(18);
}
`;

const SONAR_SKETCH = `
const int TRIG = 8, ECHO = 7;

void setup() {
  pinMode(TRIG, OUTPUT);
  pinMode(ECHO, INPUT);
  Serial.begin(115200);
}

void loop() {
  digitalWrite(TRIG, LOW);
  delayMicroseconds(5);
  digitalWrite(TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG, LOW);
  unsigned long us = pulseIn(ECHO, HIGH, 100000UL);
  Serial.print("DIST=");
  Serial.println((us + 29) / 58); // round to the nearest cm
  delay(300);
}
`;

// Bit-banged DHT22 read: start signal, then 40 pulse-width-coded bits.
const DHT_SKETCH = `
const int PIN = 4;

void setup() {
  Serial.begin(115200);
}

void loop() {
  pinMode(PIN, OUTPUT);
  digitalWrite(PIN, LOW);
  delay(2);
  pinMode(PIN, INPUT_PULLUP);
  unsigned long preamble = pulseIn(PIN, HIGH, 10000UL); // ~80us response high
  if (preamble == 0) { Serial.println("DHT timeout"); delay(500); return; }
  uint8_t data[5] = {0, 0, 0, 0, 0};
  for (int i = 0; i < 40; i++) {
    unsigned long width = pulseIn(PIN, HIGH, 1000UL);
    data[i / 8] <<= 1;
    if (width > 40) data[i / 8] |= 1;
  }
  uint8_t sum = data[0] + data[1] + data[2] + data[3];
  if (sum != data[4]) { Serial.println("DHT bad checksum"); delay(500); return; }
  int h = (data[0] << 8) | data[1];
  int t = (data[2] << 8) | data[3];
  Serial.print("H=");
  Serial.print(h);
  Serial.print(" T=");
  Serial.println(t);
  delay(1000);
}
`;

test('servo horn follows the bit-banged PWM pulse width', async ({ page }) => {
  test.setTimeout(180_000);
  const b = new CircuitBuilder();
  await b.load(page.request);
  expect(b.has('servo'), 'servo in library').toBeTruthy();

  const board = b.place('arduino-uno', { top: 380, left: 200 });
  const servo = b.place('servo', { top: 140, left: 540 });
  const wires = [
    connect(board, '9', servo, 'PWM'),
    connect(board, '5V', servo, 'V+'),
    connect(servo, 'GND', board, 'GND'),
  ];

  const projectId = await createBoardProject(page, 'E2E servo', [board, servo], wires, SERVO_SKETCH);
  await runProject(page, projectId);
  await expect(page.getByText('SERVO running')).toBeVisible({ timeout: 90_000 });

  const angle = () =>
    page.locator('.react-flow wokwi-servo').evaluate((el) => (el as HTMLElement & { angle: number }).angle);
  await expect.poll(angle, { timeout: 30_000 }).toBeGreaterThan(85);
  await expect.poll(angle, { timeout: 30_000 }).toBeLessThan(95);
});

test('HC-SR04 echo timing yields the injected distance', async ({ page }) => {
  test.setTimeout(180_000);
  const b = new CircuitBuilder();
  await b.load(page.request);
  expect(b.has('hc-sr04'), 'hc-sr04 in library').toBeTruthy();

  const board = b.place('arduino-uno', { top: 380, left: 200 });
  const sonar = b.place('hc-sr04', { top: 140, left: 540 }, { distance: 100 });
  const wires = [
    connect(board, '8', sonar, 'TRIG'),
    connect(board, '7', sonar, 'ECHO'),
    connect(board, '5V', sonar, 'VCC'),
    connect(sonar, 'GND', board, 'GND'),
  ];

  const projectId = await createBoardProject(page, 'E2E sonar', [board, sonar], wires, SONAR_SKETCH);
  await runProject(page, projectId);

  // pulseIn undercounts by a few dozen µs whenever the timer0 millis ISR
  // fires mid-measurement — exactly like real hardware — so accept ±2cm.
  await expect(page.getByText(/DIST=(9[89]|10[012])$/).first()).toBeVisible({ timeout: 90_000 });

  // Move the target through the Sensor panel while the sketch keeps pinging.
  await page.getByRole('button', { name: 'Sensors' }).click();
  await page.getByTestId(`sensor-${sonar.id}-distance`).fill('250');
  await expect(page.getByText(/DIST=(24[89]|25[012])$/).first()).toBeVisible({ timeout: 30_000 });
});

test('DHT22 1-wire stream delivers the injected temperature and humidity', async ({ page }) => {
  test.setTimeout(180_000);
  const b = new CircuitBuilder();
  await b.load(page.request);
  expect(b.has('dht22'), 'dht22 in library').toBeTruthy();

  const board = b.place('arduino-uno', { top: 380, left: 200 });
  const dht = b.place('dht22', { top: 140, left: 540 }, { temperature: 35.1, humidity: 65.2 });
  const wires = [
    connect(board, '4', dht, 'SDA'),
    connect(board, '5V', dht, 'VCC'),
    connect(dht, 'GND', board, 'GND'),
  ];

  const projectId = await createBoardProject(page, 'E2E dht22', [board, dht], wires, DHT_SKETCH);
  await runProject(page, projectId);

  // 65.2% → 652, 35.1°C → 351 (the raw ×10 wire format).
  await expect(page.getByText('H=652 T=351').first()).toBeVisible({ timeout: 90_000 });
});
