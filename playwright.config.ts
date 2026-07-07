import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';

// Container path where CI keeps its Chromium; on other machines fall back to
// PW_CHROMIUM_PATH or Playwright's own browser installation.
const CONTAINER_CHROMIUM = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const chromiumPath =
  process.env.PW_CHROMIUM_PATH || (existsSync(CONTAINER_CHROMIUM) ? CONTAINER_CHROMIUM : undefined);

export default defineConfig({
  testDir: './e2e',
  timeout: 120_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:8123',
    launchOptions: {
      executablePath: chromiumPath,
    },
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'php artisan serve --host=127.0.0.1 --port=8123',
    url: 'http://127.0.0.1:8123',
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
