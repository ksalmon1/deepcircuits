import { test, expect, Page } from '@playwright/test';
import { login } from './utils/circuit';

/**
 * Seeded example projects: every one must open, and every one carrying a
 * sketch must compile, run on the emulated board, and produce the serial
 * output its description promises. This is what keeps the dashboard's
 * ready-made examples from rotting.
 */

interface ExampleCard {
  id: string;
  name: string;
}

/**
 * Board examples that print nothing until the user interacts with them (the
 * button examples only speak on a press). They still have to compile and
 * boot; there is just no serial line to wait for.
 */
const SILENT_UNTIL_TOUCHED = new Set(['Arduino Uno: Button Input', 'Arduino Nano: Button Input']);

/** Serial output each board example must produce once it is running. */
const EXPECTED_SERIAL: Record<string, RegExp> = {
  'Arduino Uno: Blink': /Blink started/,
  'Arduino Uno: Potentiometer Fade': /pot=\d+/,
  'Arduino Mega: Blink': /Mega blink started/,
  'Arduino Nano: Blink': /Nano blink started/,
  'Arduino Nano: Potentiometer Fade': /pot=\d+/,
  'OLED Display (I2C)': /OLED ready/,
  'LCD 16x2 (4-bit parallel)': /LCD ready/,
  '7-Segment Counter': /Counting/,
  'NeoPixel: Colour Cycle': /red|green|blue/,
  'IMU: Motion Sensing (I2C)': /WHO_AM_I = 0x68/,
  'Ultrasonic Distance + Alarm': /\d+ cm/,
  'Temperature & Humidity (DHT22)': /C\s+.*%RH/,
  'Servo Sweep': /Sweeping/,
  'Stepper Motor: Quarter Turn': /forward 90 degrees/,
  'Keypad: Door Code': /Enter the code/,
  'Digital Scale (HX711)': /\d+ g/,
  'IR Remote Control': /Waiting for a remote code/,
  'Real-Time Clock (DS1307)': /Clock set to 09:30:00/,
  'Scope: PWM Waveforms': /Open the Scope panel/,
};

/** Examples with no sketch: pure-SPICE circuits that only need to solve. */
const ANALOG_ONLY = new Set([
  'LED & Resistor',
  'Push Button Light',
  'Op-Amp: Unity-Gain Buffer',
  'Comparator: Light-Triggered Switch',
]);

/** Read the example list straight out of the dashboard's Inertia payload. */
async function openExamples(page: Page): Promise<ExampleCard[]> {
  await page.goto('/dashboard');
  const examples = await page.locator('#app').evaluate((el) => {
    const payload = JSON.parse(el.getAttribute('data-page') ?? '{}');
    return (payload?.props?.examples ?? []) as Array<{ id: string; name: string }>;
  });
  expect(examples.length, 'seeded examples present').toBeGreaterThan(0);
  return examples;
}

test.beforeEach(async ({ page }) => {
  await login(page);
});

test('every seeded example opens, and each board example runs its sketch', async ({ page }) => {
  test.setTimeout(900_000);
  const examples = await openExamples(page);

  // Every name we assert on must actually exist (catches a renamed example).
  const names = examples.map((e) => e.name);
  for (const expected of [...Object.keys(EXPECTED_SERIAL), ...ANALOG_ONLY, ...SILENT_UNTIL_TOUCHED]) {
    expect(names, `example '${expected}' is seeded`).toContain(expected);
  }

  for (const example of examples) {
    await test.step(example.name, async () => {
      await page.goto(`/circuit-editor/${example.id}`);
      await expect(page.locator('.react-flow')).toBeVisible();
      await expect(page.locator('.react-flow__node').first()).toBeVisible();
      await expect(page.getByRole('button', { name: 'Run' })).toBeEnabled();

      await page.getByRole('button', { name: 'Run' }).click();

      // A blocking fault would open the verifier modal — no example should.
      const modal = page.getByTestId('circuit-verification-modal');
      await expect(page.getByRole('button', { name: 'Stop' })).toBeVisible({ timeout: 60_000 });
      await expect(modal).not.toBeVisible();

      if (ANALOG_ONLY.has(example.name)) {
        // Pure-SPICE example: it just has to solve.
        await page.waitForFunction(
          () => window.simulationResults && Object.keys(window.simulationResults.voltages || {}).length > 0,
          undefined,
          { timeout: 60_000 },
        );
        return;
      }

      // Board example: the sketch must compile and actually run.
      await page.getByRole('button', { name: 'Serial' }).click();
      await expect(page.getByText('[Sketch running]')).toBeVisible({ timeout: 120_000 });
      await expect(page.getByText(/\[Error\]/)).toHaveCount(0);

      const expected = EXPECTED_SERIAL[example.name];
      if (expected) {
        await expect(page.getByText(expected).first()).toBeVisible({ timeout: 60_000 });
      } else {
        expect(SILENT_UNTIL_TOUCHED.has(example.name), `no serial expectation for '${example.name}'`).toBe(true);
      }
    });
  }
});
