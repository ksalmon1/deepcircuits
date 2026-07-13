# DeepCircuits

DeepCircuits is a web-based interactive circuit simulator for designing, testing, and analyzing electronic circuits in a user-friendly environment.

## Features

- **Interactive Circuit Editor**: Drag-and-drop circuit components with intuitive wiring
- **Real-time Simulation**: Analyze circuit behavior with accurate voltage and current calculations
- **Component Library**: 60+ realistic parts across Basic, Power, Passive, Input Controls, Output & Actuators, Displays, Sensors, and Boards — LEDs (incl. RGB), resistors with live color bands, pushbuttons, slide switches, potentiometers with draggable knobs, buzzer, servos, displays, sensor modules, and dev boards — with searchable, categorized, live-preview part cards. Most parts render via [@wokwi/elements](https://github.com/wokwi/wokwi-elements) web components (internal detail); electrically-core parts wokwi lacks (battery, ground, capacitor, inductor, diode, zener, fuse, lamp, photoresistor, thermistor, current source) keep SVG artwork. Parts with SPICE models simulate; the rest are placeable visuals for now
- **Wokwi-style Wiring**: Pins stay hidden until hovered so wires meet the part legs directly; wires auto-route orthogonally and follow the cursor while connecting; select a wire to drag out bend points (persisted with the project); hovering a wire after a run animates dashes in the direction of conventional current, faster for larger currents
- **Custom SPICE Integration**: Powered by ngspice compiled to WebAssembly for accurate circuit simulations
- **Responsive Design**: Works across desktop and tablet devices

## Technology Stack

- **Backend**: Laravel 13 (PHP 8.3+) with Inertia.js and Breeze session auth
- **Frontend**: React 18 + TypeScript, Vite, Tailwind CSS, shadcn/ui, React Flow, @wokwi/elements (Lit web components) for realistic part visuals
- **Simulation Engine**: custom-compiled ngspice/WASM running fully client-side
- **Database**: any Laravel-supported driver (SQLite out of the box; JSON columns hold circuit documents)

## Getting Started

### Prerequisites

- PHP 8.3+ and Composer
- Node.js 20+

### Setup

```bash
composer install
npm install

cp .env.example .env
php artisan key:generate
touch database/database.sqlite
php artisan migrate --seed
```

The seeder creates an admin account (`admin@deepcircuits.test` / `password`) and a
starter component library (resistor, LED, battery, ground).

### Development

```bash
composer run dev   # serves PHP + Vite + queue together, or:
php artisan serve  # in one terminal
npm run dev        # in another
```

### Production build

```bash
npm run build
```

### Simulation engine assets

The Emscripten-compiled ngspice module (`spice.mjs` / `spice.wasm`) is not
committed. It is built by
[ksalmon1/deepcircuits-ngspice-wasm](https://github.com/ksalmon1/deepcircuits-ngspice-wasm)
and can be pulled into `public/models/` with:

```bash
npm run fetch:spice
```

The simulation runs entirely client-side: the editor generates a SPICE
netlist, a Web Worker (`public/models/SpiceWorker.js`) runs ngspice in
batch mode, and node voltages/branch currents are mapped back onto each
component pin to drive the serial monitor and component animations.

### End-to-end tests

A Playwright suite drives the real app in Chromium — registering, creating
projects, dragging components onto the canvas, wiring pins with the mouse,
and running simulations — then checks the results against analytic values
(voltage divider, parallel resistors, LED forward drop, diode drop,
capacitor DC-block, inductor DC-short):

```bash
npm run fetch:spice   # once, to install the simulation engine
npm run test:e2e      # starts php artisan serve itself if not running
```

## Architecture notes

- Circuit documents (components/wires/code) are stored as JSON columns on
  `projects` and edited entirely client-side; the editor saves via
  `PUT /projects/{id}`.
- The admin component library lives in `component_library`,
  `component_pins`, and `component_properties`, served in the frontend's
  own shape by `ComponentLibraryController`.
- Pins are identified by their library `handle_id` (wire endpoints and the
  SPICE pin→node mapping both resolve through `pinHandleId`), and electrical
  roles (ground, source polarity) come from `pin_type`/`signals` — display
  names are only a fallback for legacy pins without typed metadata.
- Element-rendered parts have no stored SVG; the renderer in
  `resources/js/integrations/wokwi/` mounts the matching `@wokwi/elements`
  web component and pushes simulation state onto it (LED glow, button
  press, knob angle, RGB channels). Their `spiceType` property tells the
  netlist generator which electrical model to use; parts without one are
  visual-only and skipped by the netlist. The part list is generated:
  `node scripts/build-parts-manifest.mjs` rebuilds
  `resources/data/wokwi-parts.json` (single source of truth for both the
  TS catalog and the seeder) from the extracted element pin data. Reseed
  with `php artisan db:seed --class=ComponentLibrarySeeder` (replaces the
  library).
- Roles are a `role` column on `users` (`user` / `admin`); admin routes sit
  behind the `admin` middleware and `/admin/*` pages.

## Acknowledgements

DeepCircuits draws inspiration from some excellent projects in the
electronics-simulation space:

- **[Wokwi](https://wokwi.com/)** — the gold standard for browser-based
  embedded simulation. Part visuals render through the MIT-licensed
  [@wokwi/elements](https://github.com/wokwi/wokwi-elements) web components,
  and boards are emulated with [avr8js](https://github.com/wokwi/avr8js).
- **[Velxio](https://github.com/davidmonterocrespo24/velxio)** — an
  open-source circuit simulator whose ideas around mixed-mode co-simulation
  and pre-run circuit verification informed parts of our design. Velxio is
  AGPLv3-licensed; DeepCircuits contains no Velxio code — features here are
  independent implementations built from component datasheets.
