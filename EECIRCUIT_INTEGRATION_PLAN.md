# Plan: Integrate Custom-Compiled ngspice/WASM (`spice.js`/`spice.wasm`)

**Goal:** Leverage the power and feature set of ngspice (via custom compilation) for circuit simulation, replacing our initial custom DC solver.

**Reference:** Custom compiled `src/simulation/spice.js` and `src/simulation/spice.wasm`.

---

**Phase 1: Removal and Setup**

1.  **Code Removal:**
    *   [x] Delete the `src/simulation/circuit-engine/` directory entirely. (Manually deleted)
    *   [x] Search codebase (React components, hooks, contexts) and remove imports/usage of old `circuit-engine` classes/functions. (Confirmed via search)
2.  **Configuration Cleanup:**
    *   [x] Edit `tsconfig.node.json`: remove include path for `circuit-engine`, remove `allowImportingTsExtensions: true`, remove `noEmit: true` (if only added for engine tests).
3.  **Preserve Necessary Types:**
    *   [x] Create `src/simulation/appStateTypes.ts`.
    *   [x] Copy definitions of `AppComponentModel` and `AppConnectionModel` into `appStateTypes.ts`.
    *   [x] Update any imports elsewhere in the app that previously imported these from the old `types.cts`. (Assumed complete as no imports found)
4.  **Integrate Custom Spice WASM:**
    *   [x] **Uninstall:** Remove `eecircuit-engine` npm package.
    *   [x] **Encapsulation:** Refactor `src/simulation/spiceService.ts` to load and use custom `spice.js` / `spice.wasm`.
    *   [x] **Configure Build:** Ensure `spice.js` and `spice.wasm` are handled correctly by Vite (using `vite-plugin-wasm`).

**Phase 2: Core Simulation Logic (using Custom Spice WASM)**

5.  **Netlist Generation (`spiceService.ts`):**
    *   [x] Implement `generateNetlist(components: AppComponentModel[], connections: AppConnectionModel[]): string`.
    *   [x] **Node Mapping:** Map connected pins to unique SPICE node names ('0' for ground). Handle ground pins ('GND' name or VSource negative terminal).
    *   [x] **Element Lines:** Translate `AppComponentModel` to SPICE lines (R, V, D, etc.).
    *   [x] **Model Cards:** Generate `.model` cards for non-linear components (e.g., Diodes) using parameters from `component.properties`.
    *   [x] **Control Lines:** Add basic SPICE controls (`.title`, `.op`, `.end`).
    *   [x] Return complete netlist string.
6.  **Simulation Execution (`spiceService.ts`):**
    *   [x] Implement `async runSpiceSimulation(netlist: string): Promise<SimulationResults>`. (Implemented via `runSpiceSimulation` orchestration function)
    *   [~] Use Custom Spice JS API to load netlist, run simulation, await results. (Needs refactoring in `spiceService.ts`)
    *   [x] Add error handling for simulation failures. (Basic try/catch added in `runSpiceSimulation`)
7.  **Result Parsing (`spiceService.ts`):**
    *   [~] Implement `parseResults(rawOutput: any): SimulationResults`. (Initial version added, needs adaptation to custom WASM output).
    *   [ ] Determine Custom Spice WASM output format (text? object?).
    *   [ ] Parse output (regex, string splitting) to extract DC results (node voltages, source currents).
    *   [ ] Structure parsed data into `SimulationResults`. Map SPICE node names back if needed.

**Phase 3: UI Integration and Testing**

8.  **Connect UI:**
    *   [x] Modify React component(s) that trigger simulation (`CircuitEditorLayoutContent`).
    *   [x] Get `components` and `connections` from app state (`useProject`).
    *   [x] Implement mapping from `ProjectContext` state to `AppComponentModel`/`AppConnectionModel`. (Corrected version implemented).
    *   [x] Call `runSpiceSimulation` (manage loading state).
    *   [x] Call `parseResults` (via `runSpiceSimulation`).
    *   [x] Update component state with `SimulationResults` (using `useState`).
    *   [x] Display simulation errors to the user (via `toast` and `console.error`).
9.  **Display Results:**
    *   [ ] Update UI components to show parsed `SimulationResults` (e.g., node voltages on schematic).
10. **Testing:**
    *   [ ] Manually test simple circuits (voltage divider, LED circuit). Compare results.
    *   [ ] Add unit/integration tests for `generateNetlist` / `parseResults`.

**Phase 4: Expansion (Future)**

11. **More Analyses:** Extend netlist generation (`.tran`, `.ac`, `.dc sweep`) and result parsing.
12. **More Components:** Add SPICE generation for transistors, capacitors, inductors, etc.
13. **Refined UI:** Improve UI for analysis selection, parameters, plotting.