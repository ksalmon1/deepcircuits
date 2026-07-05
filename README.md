# DeepCircuits

DeepCircuits is a web-based interactive circuit simulator for designing, testing, and analyzing electronic circuits in a user-friendly environment.

## Features

- **Interactive Circuit Editor**: Drag-and-drop circuit components with intuitive wiring
- **Real-time Simulation**: Analyze circuit behavior with accurate voltage and current calculations
- **Component Library**: Access a variety of electronic components including resistors, capacitors, diodes, LEDs, and voltage sources
- **Custom SPICE Integration**: Powered by ngspice compiled to WebAssembly for accurate circuit simulations
- **Responsive Design**: Works across desktop and tablet devices

## Technology Stack

- **Backend**: Laravel 13 (PHP 8.3+) with Inertia.js and Breeze session auth
- **Frontend**: React 18 + TypeScript, Vite, Tailwind CSS, shadcn/ui, React Flow
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
committed. Drop the artifacts into `public/models/` on deploy; the app loads
them lazily at runtime from that URL.

## Architecture notes

- Circuit documents (components/wires/code) are stored as JSON columns on
  `projects` and edited entirely client-side; the editor saves via
  `PUT /projects/{id}`.
- The admin component library lives in `component_library`,
  `component_pins`, and `component_properties`, served in the frontend's
  own shape by `ComponentLibraryController`.
- Roles are a `role` column on `users` (`user` / `admin`); admin routes sit
  behind the `admin` middleware and `/admin/*` pages.
