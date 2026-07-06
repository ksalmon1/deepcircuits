import { test, expect, Page } from '@playwright/test';

/**
 * Full user journey driven through the UI exactly as a person would do it:
 * register, create a project, drag components from the panel onto the
 * canvas, wire the pins with the mouse, run the simulation, and watch the
 * LED light up. Finishes by saving and reloading to prove persistence.
 */

/** Drag a component out of the library panel and drop it on the canvas. */
async function dragComponentToCanvas(page: Page, name: string, canvasX: number, canvasY: number) {
  // Exact-match the label: 'Resistor' must not match 'Photoresistor (LDR)'.
  const source = page
    .locator('div[draggable]')
    .filter({ has: page.getByText(name, { exact: true }) })
    .first();
  await expect(source).toBeVisible();
  const pane = page.locator('.react-flow__pane');
  const paneBox = (await pane.boundingBox())!;
  const clientX = paneBox.x + canvasX;
  const clientY = paneBox.y + canvasY;

  // The panel uses HTML5 drag and drop; dispatch the native event sequence.
  await source.dispatchEvent('dragstart', { dataTransfer: await page.evaluateHandle(() => new DataTransfer()) });
  await pane.dispatchEvent('dragover', {
    dataTransfer: await page.evaluateHandle(() => new DataTransfer()),
    clientX,
    clientY,
  });
  await pane.dispatchEvent('drop', {
    dataTransfer: await page.evaluateHandle(() => new DataTransfer()),
    clientX,
    clientY,
  });
  await source.dispatchEvent('dragend', { dataTransfer: await page.evaluateHandle(() => new DataTransfer()) });
}

/** Wire pin handles together by dragging with the mouse like a user. */
async function connectPins(page: Page, fromNode: string, fromHandle: string, toNode: string, toHandle: string) {
  const from = page.locator(`.react-flow__node[data-id="${fromNode}"] [data-handleid="${fromHandle}"]`);
  const to = page.locator(`.react-flow__node[data-id="${toNode}"] [data-handleid="${toHandle}"]`);
  const fromBox = (await from.boundingBox())!;
  const toBox = (await to.boundingBox())!;

  await page.mouse.move(fromBox.x + fromBox.width / 2, fromBox.y + fromBox.height / 2);
  await page.mouse.down();
  // Move in a few steps so React Flow tracks the connection line.
  await page.mouse.move(toBox.x + toBox.width / 2, toBox.y + toBox.height / 2, { steps: 12 });
  await page.mouse.up();
}

test('a new user builds, simulates, and saves an LED circuit', async ({ page }) => {
  test.setTimeout(240_000);

  // 1. Register a brand-new account.
  const stamp = Date.now();
  await page.goto('/register');
  await page.getByLabel('Display name').fill('E2E Tester');
  await page.getByLabel('Email').fill(`e2e-${stamp}@deepcircuits.test`);
  await page.getByLabel('Password', { exact: true }).fill('super-secret-1');
  await page.getByLabel('Confirm password').fill('super-secret-1');
  await page.getByRole('button', { name: /create account/i }).click();
  await page.waitForURL('**/dashboard');

  // 2. Create a project from the dashboard.
  await page.getByRole('button', { name: 'New Project' }).click();
  await page.waitForURL('**/circuit-editor/**');
  await expect(page.locator('.react-flow')).toBeVisible();
  await expect(page.getByText('Battery (9V)')).toBeVisible();

  // 3. Drag battery, resistor, and LED onto the canvas.
  await dragComponentToCanvas(page, 'Battery (9V)', 150, 260);
  await dragComponentToCanvas(page, 'Resistor', 320, 120);
  await dragComponentToCanvas(page, 'LED', 520, 260);
  await expect(page.locator('.react-flow__node')).toHaveCount(3);

  // Resolve the generated node ids by their rendered SVG component type.
  const nodeId = async (type: string) =>
    (await page
      .locator(`.react-flow__node:has(svg[data-component-type="${type}"], div.${type}-fallback)`)
      .first()
      .getAttribute('data-id'))!;
  const batteryId = await nodeId('voltagesource');
  const resistorId = await nodeId('resistor');
  const ledId = await nodeId('led');

  // 4. Wire: battery + -> resistor -> LED anode, LED cathode -> battery -.
  await connectPins(page, batteryId, 'pin-0', resistorId, 'pin-0');
  await connectPins(page, resistorId, 'pin-1', ledId, 'pin-0');
  await connectPins(page, ledId, 'pin-1', batteryId, 'pin-1');
  await expect(page.locator('.react-flow__edge')).toHaveCount(3);

  // 5. Run the simulation and watch the LED light up.
  await page.getByRole('button', { name: 'Start' }).click();
  const ledSvg = page.locator(`svg[data-component-id="${ledId}"]`);
  await expect(ledSvg).toHaveAttribute('data-is-on', 'true', { timeout: 60_000 });
  await expect(page.locator(`svg[data-component-id="${ledId}"] #led-body`)).toHaveAttribute('fill', '#ff2020');

  // Open the serial monitor and check the human-readable summary.
  await page.getByRole('button', { name: 'Serial' }).click();
  await expect(page.getByText('Circuit Summary')).toBeVisible();
  await expect(page.getByText(/Total Current:\s*7\.\d+\s*mA/)).toBeVisible();

  // 6. Stop, save, reload: the circuit persists and simulates again.
  await page.getByRole('button', { name: 'Stop' }).click();
  const saveButton = page.getByRole('button', { name: 'Save' }).first();
  await saveButton.click();
  await expect(saveButton).toBeDisabled({ timeout: 20_000 });

  await page.reload();
  await expect(page.locator('.react-flow__node')).toHaveCount(3);
  await expect(page.locator('.react-flow__edge')).toHaveCount(3);

  await page.getByRole('button', { name: 'Start' }).click();
  await expect(page.locator(`svg[data-component-id="${ledId}"]`)).toHaveAttribute('data-is-on', 'true', {
    timeout: 60_000,
  });
});
