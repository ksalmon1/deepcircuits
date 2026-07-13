---
name: verify
description: Build, launch, and drive the DeepCircuits app to verify changes end-to-end in a real browser.
---

# Verifying DeepCircuits changes

Laravel + Inertia/React app. The runtime surface is the browser at
`http://127.0.0.1:8123`.

## One-time setup (fresh clone)

```bash
composer install --no-interaction
npm install
cp .env.example .env
php artisan key:generate
touch database/database.sqlite
php artisan migrate --seed --force   # seeds admin@deepcircuits.test / password + part library
npm run fetch:spice                  # only needed to run simulations
```

## Build + launch

```bash
npm run build                                        # rebuild after every frontend edit; serve has no HMR
php artisan serve --host=127.0.0.1 --port=8123 &     # same host/port the e2e config uses
```

## Drive it

Playwright is installed (used by `e2e/`). For ad-hoc verification scripts run
outside the repo dir, import by absolute path (ESM ignores NODE_PATH):

```js
import { chromium } from 'file:///.../deepcircuits/node_modules/playwright/index.mjs';
```

Flows that work (copied from `e2e/user-journey.spec.ts`):

- **Register**: `/register`, labels `Display name` / `Email` / `Password` (exact) /
  `Confirm password`, button `/create account/i`, then `waitForURL('**/dashboard')`.
- **New project**: dashboard button `New Project` → `waitForURL('**/circuit-editor/**')`,
  wait for `.react-flow` and a part name like `Battery (9V)`.
- **Drag part onto canvas**: the panel uses HTML5 DnD — dispatch
  `dragstart`/`dragover`/`drop`/`dragend` with a `new DataTransfer()` handle on
  `div[draggable]` (filter by exact part name) and `.react-flow__pane`.
- **Wiring**: mouse-drag between `[data-handleid="pin-N"]` handles.

## Gotchas

- Toolbar tooltips on disable-able buttons: the trigger is a `span` wrapping the
  button — hover `span:has(> button[aria-label="..."])`, not the button.
- `beforeunload` native dialogs do not fire under Playwright (headed or
  headless), even with `page.close({ runBeforeUnload: true })`. Verify the
  handler instead: dispatch a cancelable `beforeunload` Event in `page.evaluate`
  and check `defaultPrevented`.
- Editor keyboard shortcuts: Ctrl+S save, Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y
  undo/redo, R rotate selection; suppressed while focus is in inputs/Monaco.
- Sonner toasts sit top-center for ~4s; wait them out before clean screenshots.
