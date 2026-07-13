import { test, expect, Page } from '@playwright/test';
import { CircuitBuilder, wire, login, PlacedComponent, Wire } from './utils/circuit';

/**
 * Board suite: actually compile and run a sketch on the emulated AVR boards
 * (Uno/Nano ATmega328p, Mega ATmega2560) and prove the co-simulation loop
 * works end to end:
 *
 *  - the sketch compiles locally (POST /api/compile -> arduino-cli),
 *  - it executes on the avr8js core (Serial output appears),
 *  - and its GPIO drives the SPICE circuit (the LED on pin 13 lights).
 *
 * This is the one place the board's "run code" path is exercised through the
 * real Run button, not just its electrical model.
 */

test.beforeEach(async ({ page }) => {
  await login(page);
});

let boardWireCounter = 0;

/**
 * Wire a specific board pin (resolved by its display name to its stored
 * handle_id) to a 2-pin part. Board pins are not index-addressable — D13 is
 * handle 'pin-4' on the Uno and 'pin-15' on the Nano — so the plain wire()
 * helper (which assumes index == handle) can't reach them.
 */
function boardPinHandle(board: PlacedComponent, predicate: (name: string) => boolean): string {
  const pin = board.pins.find((p) => predicate(p.name));
  expect(pin, `board pin matching predicate: ${JSON.stringify(board.pins.map((p) => p.name))}`).toBeTruthy();
  return pin!.handle_id ?? `pin-${board.pins.indexOf(pin!)}`;
}

function wireHandles(
  from: PlacedComponent,
  fromHandle: string,
  to: PlacedComponent,
  toHandle: string,
): Wire {
  const idx = (h: string) => parseInt(h.replace('pin-', ''), 10) || 0;
  return {
    id: `e2e-board-wire-${++boardWireCounter}`,
    source: from.id,
    target: to.id,
    sourceHandle: fromHandle,
    targetHandle: toHandle,
    type: 'customWire',
    data: { color: '#555', sourcePinIndex: idx(fromHandle), targetPinIndex: idx(toHandle) },
  };
}

/** Create a project that already carries a sketch, and open its editor. */
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

const BLINK_SKETCH = `
void setup() {
  pinMode(13, OUTPUT);
  Serial.begin(115200);
  Serial.println("Blink started");
}

void loop() {
  digitalWrite(13, HIGH);
  delay(500);
  digitalWrite(13, LOW);
  delay(500);
}
`;

type BoardType = 'arduino-uno' | 'arduino-nano' | 'arduino-mega';

/** Build a "D13 -> resistor -> LED anode, LED cathode -> GND" blink circuit. */
function blinkCircuit(b: CircuitBuilder, boardType: BoardType) {
  const board = b.place(boardType, { top: 360, left: 260 });
  const r = b.place('resistor', { top: 150, left: 360 }, { resistance: 220 });
  const led = b.place('led', { top: 210, left: 560 }, { color: 'red' });

  const d13 = boardPinHandle(board, (n) => n === '13');
  const gnd = boardPinHandle(board, (n) => /^GND(\.\d+)?$/i.test(n));

  // D13 -> resistor -> LED anode; LED cathode -> board GND.
  const wires = [
    wireHandles(board, d13, r, 'pin-0'),
    wire(r, 1, led, 0),
    wireHandles(led, 'pin-1', board, gnd),
  ];
  return { components: [board, r, led], wires };
}

for (const boardType of ['arduino-uno', 'arduino-nano', 'arduino-mega'] as const) {
  test(`${boardType}: blink sketch compiles, runs, and drives the LED`, async ({ page }) => {
    test.setTimeout(180_000);

    const b = new CircuitBuilder();
    await b.load(page.request);
    expect(b.has(boardType), `${boardType} present in the component library`).toBeTruthy();

    const { components, wires } = blinkCircuit(b, boardType);
    const projectId = await createBoardProject(page, `E2E ${boardType} blink`, components, wires, BLINK_SKETCH);

    await page.goto(`/circuit-editor/${projectId}`);
    await expect(page.locator('.react-flow')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Run' })).toBeEnabled();

    // Run compiles the sketch (arduino-cli) and boots it on the chip.
    await page.getByRole('button', { name: 'Run' }).click();

    // Serial proves the sketch actually executed on the emulated core.
    await page.getByRole('button', { name: 'Serial' }).click();
    await expect(page.getByText('Blink started')).toBeVisible({ timeout: 90_000 });

    // The sketch drives pin 13 HIGH for 500ms at a time; the LED element's
    // `value` follows the solved circuit, so it must turn on within a cycle.
    const ledOn = () =>
      page.locator('.react-flow wokwi-led').evaluate((el) => (el as HTMLElement & { value: boolean }).value);
    await expect.poll(ledOn, { timeout: 30_000 }).toBe(true);

    // ...and off again on the next half-cycle: the code, not a static bias,
    // is toggling the pin.
    await expect.poll(ledOn, { timeout: 30_000 }).toBe(false);

    await page.getByRole('button', { name: 'Stop' }).click();
  });
}
