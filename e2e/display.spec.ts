import { test, expect, Page } from '@playwright/test';
import { CircuitBuilder, login, PlacedComponent, Wire } from './utils/circuit';

/**
 * Display suite: a sketch running on the emulated board drives real display
 * decoders — SSD1306 over the virtual I2C (TWI) bus, and a character LCD
 * over cycle-accurate GPIO edges — and the rendered elements show it.
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
    id: `e2e-display-wire-${++wireCounter}`,
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

// Raw-Wire SSD1306 drive: init, then fill the top page (8 pixel rows).
// Only the core-bundled Wire library is used — no external dependencies.
const OLED_SKETCH = `
#include <Wire.h>

void cmd(uint8_t c) {
  Wire.beginTransmission(0x3C);
  Wire.write((uint8_t)0x00);
  Wire.write(c);
  Wire.endTransmission();
}

void setup() {
  Serial.begin(115200);
  Wire.begin();
  cmd(0xAF);            // display on
  cmd(0x20); cmd(0x00); // horizontal addressing
  cmd(0x21); cmd(0); cmd(127);
  cmd(0x22); cmd(0); cmd(7);
  for (int i = 0; i < 128; i += 16) {
    Wire.beginTransmission(0x3C);
    Wire.write((uint8_t)0x40);
    for (int j = 0; j < 16; j++) Wire.write((uint8_t)0xFF);
    Wire.endTransmission();
  }
  Serial.println("OLED drawn");
}

void loop() {}
`;

// Bit-banged HD44780 in 4-bit mode (no LiquidCrystal dependency).
const LCD_SKETCH = `
const int RS = 12, EN = 11, D4 = 5, D5 = 4, D6 = 3, D7 = 2;

void pulse() {
  digitalWrite(EN, HIGH);
  delayMicroseconds(2);
  digitalWrite(EN, LOW);
  delayMicroseconds(100);
}

void nib(uint8_t v) {
  digitalWrite(D4, v & 1);
  digitalWrite(D5, v & 2);
  digitalWrite(D6, v & 4);
  digitalWrite(D7, v & 8);
  pulse();
}

void cmd(uint8_t v) { digitalWrite(RS, LOW); nib(v >> 4); nib(v & 0x0F); delay(2); }
void chr(uint8_t v) { digitalWrite(RS, HIGH); nib(v >> 4); nib(v & 0x0F); }

void setup() {
  int pins[] = {RS, EN, D4, D5, D6, D7};
  for (int i = 0; i < 6; i++) pinMode(pins[i], OUTPUT);
  Serial.begin(115200);
  delay(50);
  digitalWrite(RS, LOW);
  nib(0x3); delay(5); nib(0x3); delay(5); nib(0x3); nib(0x2); // enter 4-bit
  cmd(0x28); cmd(0x0C); cmd(0x01); cmd(0x06);
  const char *s = "HELLO WORLD";
  while (*s) chr(*s++);
  cmd(0x80 | 0x40);
  const char *s2 = "LINE2";
  while (*s2) chr(*s2++);
  Serial.println("LCD drawn");
}

void loop() {}
`;

// Raw-SPI ILI9341 drive: reset, display on, then fill a 10x10 red square.
// Uses only the core-bundled SPI library.
const TFT_SKETCH = `
#include <SPI.h>

const int CS = 10, DC = 9;

void cmd(uint8_t c) {
  digitalWrite(DC, LOW);
  digitalWrite(CS, LOW);
  SPI.transfer(c);
  digitalWrite(CS, HIGH);
}

void dat(uint8_t d) {
  digitalWrite(DC, HIGH);
  digitalWrite(CS, LOW);
  SPI.transfer(d);
  digitalWrite(CS, HIGH);
}

void setup() {
  Serial.begin(115200);
  pinMode(CS, OUTPUT);
  pinMode(DC, OUTPUT);
  digitalWrite(CS, HIGH);
  SPI.begin();
  cmd(0x01); // reset
  cmd(0x29); // display on
  cmd(0x2A); dat(0); dat(0); dat(0); dat(9);
  cmd(0x2B); dat(0); dat(0); dat(0); dat(9);
  cmd(0x2C);
  digitalWrite(DC, HIGH);
  digitalWrite(CS, LOW);
  for (int i = 0; i < 100; i++) {
    SPI.transfer(0xF8); // RGB565 red, big-endian
    SPI.transfer(0x00);
  }
  digitalWrite(CS, HIGH);
  Serial.println("TFT drawn");
}

void loop() {}
`;

test('sketch draws on an I2C OLED through the virtual TWI bus', async ({ page }) => {
  test.setTimeout(180_000);
  const b = new CircuitBuilder();
  await b.load(page.request);
  expect(b.has('ssd1306'), 'ssd1306 in library').toBeTruthy();

  const board = b.place('arduino-uno', { top: 360, left: 200 });
  const oled = b.place('ssd1306', { top: 120, left: 520 });
  const wires = [
    connect(board, 'A4', oled, 'DATA'),
    connect(board, 'A5', oled, 'CLK'),
    connect(board, '5V', oled, 'VIN'),
    connect(oled, 'GND', board, 'GND'),
  ];

  const projectId = await createBoardProject(page, 'E2E oled', [board, oled], wires, OLED_SKETCH);
  await runProject(page, projectId);

  await expect(page.getByText('OLED drawn')).toBeVisible({ timeout: 90_000 });

  // The whole top page (128 x 8 pixels) must be lit on the element's canvas.
  const litPixels = () =>
    page.locator('.react-flow wokwi-ssd1306').evaluate((el) => {
      const image = (el as HTMLElement & { imageData: ImageData }).imageData;
      let lit = 0;
      for (let i = 0; i < image.data.length; i += 4) {
        if (image.data[i] > 128) lit++;
      }
      return lit;
    });
  await expect.poll(litPixels, { timeout: 30_000 }).toBeGreaterThanOrEqual(1024);
});

test('sketch prints to a parallel LCD1602 via GPIO edge decoding', async ({ page }) => {
  test.setTimeout(180_000);
  const b = new CircuitBuilder();
  await b.load(page.request);
  expect(b.has('lcd1602'), 'lcd1602 in library').toBeTruthy();

  const board = b.place('arduino-uno', { top: 380, left: 200 });
  const lcd = b.place('lcd1602', { top: 100, left: 520 });
  const wires = [
    connect(board, '12', lcd, 'RS'),
    connect(board, '11', lcd, 'E'),
    connect(board, '5', lcd, 'D4'),
    connect(board, '4', lcd, 'D5'),
    connect(board, '3', lcd, 'D6'),
    connect(board, '2', lcd, 'D7'),
    connect(board, '5V', lcd, 'VDD'),
    connect(lcd, 'VSS', board, 'GND'),
  ];

  const projectId = await createBoardProject(page, 'E2E lcd1602', [board, lcd], wires, LCD_SKETCH);
  await runProject(page, projectId);

  await expect(page.getByText('LCD drawn')).toBeVisible({ timeout: 90_000 });

  const lcdText = () =>
    page.locator('.react-flow wokwi-lcd1602').evaluate((el) => {
      const chars = (el as HTMLElement & { characters: Uint8Array | number[] }).characters;
      return String.fromCharCode(...Array.from(chars ?? []));
    });
  await expect.poll(lcdText, { timeout: 30_000 }).toContain('HELLO WORLD');
  await expect.poll(lcdText, { timeout: 30_000 }).toContain('LINE2');
});

test('sketch paints an SPI TFT through the virtual SPI bus', async ({ page }) => {
  test.setTimeout(180_000);
  const b = new CircuitBuilder();
  await b.load(page.request);
  expect(b.has('ili9341'), 'ili9341 in library').toBeTruthy();

  const board = b.place('arduino-uno', { top: 400, left: 200 });
  const tft = b.place('ili9341', { top: 60, left: 520 });
  const wires = [
    connect(board, '10', tft, 'CS'),
    connect(board, '9', tft, 'D/C'),
    connect(board, '11', tft, 'MOSI'),
    connect(board, '13', tft, 'SCK'),
    connect(board, '5V', tft, 'VCC'),
    connect(tft, 'GND', board, 'GND'),
  ];

  const projectId = await createBoardProject(page, 'E2E ili9341', [board, tft], wires, TFT_SKETCH);
  await runProject(page, projectId);

  await expect(page.getByText('TFT drawn')).toBeVisible({ timeout: 90_000 });

  // The 10x10 square at the origin must be red on the element's canvas.
  const redPixels = () =>
    page.locator('.react-flow wokwi-ili9341').evaluate((el) => {
      const canvas = (el as HTMLElement & { canvas: HTMLCanvasElement | null }).canvas;
      const ctx = canvas?.getContext('2d');
      if (!ctx) return -1;
      const image = ctx.getImageData(0, 0, 12, 12);
      let red = 0;
      for (let i = 0; i < image.data.length; i += 4) {
        if (image.data[i] > 200 && image.data[i + 1] < 50 && image.data[i + 2] < 50) red++;
      }
      return red;
    });
  await expect.poll(redPixels, { timeout: 30_000 }).toBeGreaterThanOrEqual(100);
});
