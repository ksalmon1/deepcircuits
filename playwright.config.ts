import { defineConfig } from '@playwright/test';

const CHROMIUM_PATH = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

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
      executablePath: process.env.PW_CHROMIUM_PATH || CHROMIUM_PATH,
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
