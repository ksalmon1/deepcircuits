import { test, expect, Page } from '@playwright/test';
import { CircuitBuilder, login, PlacedComponent, Wire } from './utils/circuit';

/**
 * NeoPixel suite: a sketch bit-bangs the WS2812 single-wire protocol
 * (sub-microsecond pulse widths) and the decoder recovers the pixel colors
 * onto the rendered element.
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
    id: `e2e-np-wire-${++wireCounter}`,
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

// WS2812 bit-bang on pin 8 (PORTB bit 0): T1H ~12 cycles, T0H ~4 cycles at
// 16MHz, interrupts off during the frame so the millis ISR can't stretch a
// pulse into the wrong bit.
const NEOPIXEL_SKETCH = `
static inline void sendBit(bool one) {
  if (one) {
    PORTB |= _BV(0);
    __builtin_avr_delay_cycles(10);
    PORTB &= ~_BV(0);
    __builtin_avr_delay_cycles(4);
  } else {
    PORTB |= _BV(0);
    __builtin_avr_delay_cycles(2);
    PORTB &= ~_BV(0);
    __builtin_avr_delay_cycles(10);
  }
}

static void sendByte(uint8_t value) {
  for (int8_t i = 7; i >= 0; i--) sendBit((value >> i) & 1);
}

void setup() {
  Serial.begin(115200);
  pinMode(8, OUTPUT);
  digitalWrite(8, LOW);
  delayMicroseconds(100);
  noInterrupts();
  // One pixel, GRB order: magenta (R=255, B=255).
  sendByte(0x00);
  sendByte(0xFF);
  sendByte(0xFF);
  interrupts();
  Serial.println("PIXEL sent");
}

void loop() {}
`;

test('bit-banged WS2812 frame lights the NeoPixel magenta', async ({ page }) => {
  test.setTimeout(180_000);
  const b = new CircuitBuilder();
  await b.load(page.request);
  expect(b.has('neopixel'), 'neopixel in library').toBeTruthy();

  const board = b.place('arduino-uno', { top: 380, left: 200 });
  const pixel = b.place('neopixel', { top: 160, left: 540 });
  const wires = [
    connect(board, '8', pixel, 'DIN'),
    connect(board, '5V', pixel, 'VDD'),
    connect(pixel, 'VSS', board, 'GND'),
  ];

  const projectId = await createBoardProject(page, 'E2E neopixel', [board, pixel], wires, NEOPIXEL_SKETCH);
  await page.goto(`/circuit-editor/${projectId}`);
  await expect(page.locator('.react-flow')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Run' })).toBeEnabled();
  await page.getByRole('button', { name: 'Run' }).click();
  await page.getByRole('button', { name: 'Serial' }).click();

  await expect(page.getByText('PIXEL sent')).toBeVisible({ timeout: 90_000 });

  const rgb = () =>
    page.locator('.react-flow wokwi-neopixel').evaluate((el) => {
      const px = el as HTMLElement & { r: number; g: number; b: number };
      return [px.r, px.g, px.b];
    });
  await expect.poll(rgb, { timeout: 30_000 }).toEqual([1, 0, 1]);
});
