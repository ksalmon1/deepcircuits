import { test, expect, Page } from '@playwright/test';
import { CircuitBuilder, login, PlacedComponent, Wire } from './utils/circuit';

/**
 * Data-device suite: sketches on the emulated board talk to virtual I2C/SPI
 * peripherals — MPU6050 IMU (with live value injection from the Sensor
 * panel), DS1307 RTC, and a microSD card — using only core Wire/SPI.
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
    id: `e2e-data-wire-${++wireCounter}`,
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

// Reads WHO_AM_I, wakes the chip, then polls accel X each second.
const IMU_SKETCH = `
#include <Wire.h>

int16_t read16(uint8_t reg) {
  Wire.beginTransmission(0x68);
  Wire.write(reg);
  Wire.endTransmission(false);
  Wire.requestFrom(0x68, 2);
  int16_t v = (Wire.read() << 8) | Wire.read();
  return v;
}

void setup() {
  Serial.begin(115200);
  Wire.begin();
  Wire.beginTransmission(0x68);
  Wire.write(0x75); // WHO_AM_I
  Wire.endTransmission(false);
  Wire.requestFrom(0x68, 1);
  int who = Wire.read();
  Serial.print("WHOAMI=0x");
  Serial.println(who, HEX);
  Wire.beginTransmission(0x68); // wake from sleep
  Wire.write(0x6B);
  Wire.write(0x00);
  Wire.endTransmission();
}

void loop() {
  long ax = read16(0x3B);
  Serial.print("AX=");
  Serial.println(ax);
  delay(500);
}
`;

const RTC_SKETCH = `
#include <Wire.h>

uint8_t bcd(uint8_t reg) {
  Wire.beginTransmission(0x68);
  Wire.write(reg);
  Wire.endTransmission(false);
  Wire.requestFrom(0x68, 1);
  return Wire.read();
}

void setup() {
  Serial.begin(115200);
  Wire.begin();
  // Set 12:34:56 on 2030-01-15 (BCD writes, like RTC.adjust does).
  Wire.beginTransmission(0x68);
  Wire.write((uint8_t)0x00);
  Wire.write(0x56); Wire.write(0x34); Wire.write(0x12); // ss mm hh
  Wire.write(0x03); Wire.write(0x15); Wire.write(0x01); Wire.write(0x30);
  Wire.endTransmission();
  uint8_t h = bcd(2), m = bcd(1);
  Serial.print("TIME=");
  Serial.print(h, HEX);
  Serial.print(":");
  Serial.println(m, HEX);
  if (h == 0x12 && m == 0x34) Serial.println("RTC OK");
}

void loop() {}
`;

// Raw SPI-mode SD access: init, write a block, read it back.
const SD_SKETCH = `
#include <SPI.h>

const int CS = 10;

uint8_t xfer(uint8_t b) { return SPI.transfer(b); }

uint8_t sdCommand(uint8_t cmd, uint32_t arg) {
  xfer(0x40 | cmd);
  xfer(arg >> 24); xfer(arg >> 16); xfer(arg >> 8); xfer(arg);
  xfer(0x95);
  for (int i = 0; i < 10; i++) {
    uint8_t r = xfer(0xFF);
    if (r != 0xFF) return r;
  }
  return 0xFF;
}

void setup() {
  Serial.begin(115200);
  pinMode(CS, OUTPUT);
  digitalWrite(CS, HIGH);
  SPI.begin();
  digitalWrite(CS, LOW);
  if (sdCommand(0, 0) != 0x01) { Serial.println("SD FAIL idle"); return; }
  sdCommand(8, 0x1AA);
  sdCommand(55, 0);
  if (sdCommand(41, 0) != 0x00) { Serial.println("SD FAIL init"); return; }

  // Write block 3: bytes 0..255 repeating.
  if (sdCommand(24, 3) != 0x00) { Serial.println("SD FAIL cmd24"); return; }
  xfer(0xFF);
  xfer(0xFE);
  for (int i = 0; i < 512; i++) xfer(i & 0xFF);
  xfer(0xFF); xfer(0xFF); // CRC
  uint8_t resp = 0xFF;
  for (int i = 0; i < 10 && resp == 0xFF; i++) resp = xfer(0xFF);
  if ((resp & 0x1F) != 0x05) { Serial.println("SD FAIL write"); return; }
  while (xfer(0xFF) != 0xFF) {} // busy

  // Read block 3 back and spot-check it.
  if (sdCommand(17, 3) != 0x00) { Serial.println("SD FAIL cmd17"); return; }
  uint8_t token = 0xFF;
  for (int i = 0; i < 20 && token != 0xFE; i++) token = xfer(0xFF);
  if (token != 0xFE) { Serial.println("SD FAIL token"); return; }
  bool ok = true;
  for (int i = 0; i < 512; i++) {
    if (xfer(0xFF) != (i & 0xFF)) { ok = false; }
  }
  xfer(0xFF); xfer(0xFF); // CRC
  digitalWrite(CS, HIGH);
  Serial.println(ok ? "SD OK" : "SD FAIL data");
}

void loop() {}
`;

test('MPU6050: sketch reads WHO_AM_I and live accel values from the Sensor panel', async ({ page }) => {
  test.setTimeout(180_000);
  const b = new CircuitBuilder();
  await b.load(page.request);
  expect(b.has('mpu6050'), 'mpu6050 in library').toBeTruthy();

  const board = b.place('arduino-uno', { top: 380, left: 200 });
  // Preset accelX = 0.5g → 8192 LSB.
  const imu = b.place('mpu6050', { top: 120, left: 540 }, { accelX: 0.5 });
  const wires = [
    connect(board, 'A4', imu, 'SDA'),
    connect(board, 'A5', imu, 'SCL'),
    connect(board, '5V', imu, 'VCC'),
    connect(imu, 'GND', board, 'GND'),
  ];

  const projectId = await createBoardProject(page, 'E2E mpu6050', [board, imu], wires, IMU_SKETCH);
  await runProject(page, projectId);

  await expect(page.getByText('WHOAMI=0x68')).toBeVisible({ timeout: 90_000 });
  await expect(page.getByText('AX=8192').first()).toBeVisible({ timeout: 30_000 });

  // Inject a new value through the Sensor panel while the sketch runs.
  await page.getByRole('button', { name: 'Sensors' }).click();
  await expect(page.getByTestId('sensor-panel')).toBeVisible();
  const input = page.getByTestId(`sensor-${imu.id}-accelX`);
  await input.fill('1');
  await expect(page.getByText('AX=16384').first()).toBeVisible({ timeout: 30_000 });
});

test('DS1307: sketch sets and reads back the clock over I2C', async ({ page }) => {
  test.setTimeout(180_000);
  const b = new CircuitBuilder();
  await b.load(page.request);
  expect(b.has('ds1307'), 'ds1307 in library').toBeTruthy();

  const board = b.place('arduino-uno', { top: 380, left: 200 });
  const rtc = b.place('ds1307', { top: 140, left: 540 });
  const wires = [
    connect(board, 'A4', rtc, 'SDA'),
    connect(board, 'A5', rtc, 'SCL'),
    connect(board, '5V', rtc, '5V'),
    connect(rtc, 'GND', board, 'GND'),
  ];

  const projectId = await createBoardProject(page, 'E2E ds1307', [board, rtc], wires, RTC_SKETCH);
  await runProject(page, projectId);

  await expect(page.getByText('RTC OK')).toBeVisible({ timeout: 90_000 });
});

test('microSD: sketch initializes the card and round-trips a block over SPI', async ({ page }) => {
  test.setTimeout(180_000);
  const b = new CircuitBuilder();
  await b.load(page.request);
  expect(b.has('microsd-card'), 'microsd-card in library').toBeTruthy();

  const board = b.place('arduino-uno', { top: 380, left: 200 });
  const sd = b.place('microsd-card', { top: 140, left: 540 });
  const wires = [
    connect(board, '10', sd, 'CS'),
    connect(board, '11', sd, 'DI'), // board MOSI -> card data in
    connect(board, '12', sd, 'DO'), // card data out -> board MISO
    connect(board, '13', sd, 'SCK'),
    connect(board, '5V', sd, 'VCC'),
    connect(sd, 'GND', board, 'GND'),
  ];

  const projectId = await createBoardProject(page, 'E2E microsd', [board, sd], wires, SD_SKETCH);
  await runProject(page, projectId);

  await expect(page.getByText('SD OK')).toBeVisible({ timeout: 90_000 });
});
