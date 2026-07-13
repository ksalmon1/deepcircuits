import { defineConfig } from 'vitest/config';
import path from 'path';

// Unit tests for the pure simulation logic (net-merging, netlist generation,
// result parsing, verifier rules). These run in Node with no browser/wasm.
// Playwright's browser e2e specs live in e2e/*.spec.ts and are excluded here;
// unit tests use the *.test.ts suffix so the two never overlap.
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './resources/js'),
    },
  },
  test: {
    environment: 'node',
    include: ['resources/js/**/*.test.ts'],
    exclude: ['e2e/**', 'node_modules/**', 'vendor/**'],
  },
});
