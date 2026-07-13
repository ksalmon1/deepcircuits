import { test, expect } from '@playwright/test';
import { CircuitBuilder, wire, login, createCircuitProject, clearSimResults, waitForSimResults } from './utils/circuit';

/**
 * Pre-Run circuit verifier: pressing Run first solves the circuit once and
 * blocks with a modal when the operating point shows a fault that would
 * damage parts in a real circuit.
 */

test.beforeEach(async ({ page }) => {
  await login(page);
});

test('a shorted battery blocks Run with the verification modal; Run anyway proceeds', async ({ page }) => {
  const b = new CircuitBuilder();
  await b.load(page.request);

  // 9V across 1Ω = 9A — far past the 500mA short-circuit threshold (and the
  // resistor is 324× over its ¼W rating, so a warning rides along).
  const bat = b.place('voltagesource', { top: 100, left: 100 });
  const r = b.place('resistor', { top: 100, left: 300 }, { resistance: '1' });
  const wires = [wire(bat, 0, r, 0), wire(r, 1, bat, 1)];

  const projectId = await createCircuitProject(page, 'E2E verifier short', [bat, r], wires);
  await page.goto(`/circuit-editor/${projectId}`);
  await expect(page.locator('.react-flow')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Run' })).toBeEnabled();

  // Run → the check must block with the modal instead of starting.
  await page.getByRole('button', { name: 'Run' }).click();
  const modal = page.getByTestId('circuit-verification-modal');
  await expect(modal).toBeVisible({ timeout: 30_000 });
  await expect(modal).toContainText(/short circuit/i);

  // Cancel keeps the simulation stopped.
  await modal.getByRole('button', { name: 'Cancel' }).click();
  await expect(modal).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Run' })).toBeVisible();

  // Run again, then override: the simulation must actually start and solve.
  await clearSimResults(page);
  await page.getByRole('button', { name: 'Run' }).click();
  await expect(modal).toBeVisible({ timeout: 30_000 });
  await modal.getByRole('button', { name: 'Run anyway' }).click();
  await expect(page.getByRole('button', { name: 'Stop' })).toBeVisible({ timeout: 30_000 });

  const results = await waitForSimResults(page);
  const current = Math.abs(Object.values(results.currents)[0] ?? 0);
  expect(current).toBeGreaterThan(8);
});

test('a healthy circuit runs without any modal', async ({ page }) => {
  const b = new CircuitBuilder();
  await b.load(page.request);

  const bat = b.place('voltagesource', { top: 100, left: 100 });
  const r = b.place('resistor', { top: 100, left: 300 }, { resistance: '1k' });
  const wires = [wire(bat, 0, r, 0), wire(r, 1, bat, 1)];

  const projectId = await createCircuitProject(page, 'E2E verifier clean', [bat, r], wires);
  await page.goto(`/circuit-editor/${projectId}`);
  await expect(page.locator('.react-flow')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Run' })).toBeEnabled();

  await clearSimResults(page);
  await page.getByRole('button', { name: 'Run' }).click();
  await expect(page.getByRole('button', { name: 'Stop' })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId('circuit-verification-modal')).not.toBeVisible();
  await waitForSimResults(page);
});
