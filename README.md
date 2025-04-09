# DeepCircuits

DeepCircuits is a web-based interactive circuit simulator for designing, testing, and analyzing electronic circuits in a user-friendly environment.

## Features

- **Interactive Circuit Editor**: Drag-and-drop circuit components with intuitive wiring
- **Real-time Simulation**: Analyze circuit behavior with accurate voltage and current calculations
- **Component Library**: Access a variety of electronic components including resistors, capacitors, diodes, LEDs, and voltage sources
- **Custom SPICE Integration**: Powered by ngspice compiled to WebAssembly for accurate circuit simulations
- **Responsive Design**: Works across desktop and tablet devices

## Technology Stack

- **Frontend**:
  - React 18 with TypeScript
  - Vite for fast builds
  - Tailwind CSS for styling
  - shadcn/ui components
  - React Flow for circuit canvas
  
- **Simulation Engine**:
  - Custom-compiled ngspice/WASM integration
  - SPICE simulation for accurate circuit analysis
  
- **Authentication & Backend**:
  - Supabase for authentication and database
  - React Query for data fetching

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/ksalmon1/deepcircuits.git
   cd deepcircuits
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Start the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```
   
## Architecture

DeepCircuits uses a modular architecture:

1. **User Interface Layer**: React components for the circuit editor, component library, and simulation controls
2. **Simulation Layer**: SPICE simulation engine integrated via WebAssembly
3. **Data Management Layer**: State management with React Context and components data structures
4. **Backend Integration**: Data persistence via Supabase

## SPICE Simulation Details

The simulation engine in DeepCircuits is powered by ngspice compiled to WebAssembly. 

See [deepcircuits-ngspice-wasm](https://github.com/ksalmon1/deepcircuits-ngspice-wasm)

The core simulation process:

1. **Component Definition**: Components like resistors, capacitors, diodes, and voltage sources are defined with their properties
2. **Netlist Generation**: Circuit connections are converted to a SPICE-compatible netlist format
3. **Simulation Execution**: The ngspice WASM module processes the netlist and runs the simulation
4. **Result Processing**: Simulation outputs (node voltages and branch currents) are parsed and displayed

The `spiceService.ts` module handles:
- Converting components to SPICE models and element lines
- Adding appropriate control statements for simulation
- Processing and displaying simulation results
- Error handling and diagnostics

## License

This project is licensed under the MIT License.

## Acknowledgments

- [ngspice](http://ngspice.sourceforge.net/) - The open source SPICE circuit simulator
- [React Flow](https://reactflow.dev/) - Interactive node-based UI for the circuit editor
- [shadcn/ui](https://ui.shadcn.com/) - UI component system
