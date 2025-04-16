interface SimulationVoltages {
  [nodeId: string]: number;
}

interface SimulationCurrents {
  [branchId: string]: number;
}

// Updated SimulationState to hold data per component
export type PinVoltages = {
  [pinId: string]: number;
};

// Future: Define PinCurrents if needed
// export type PinCurrents = {
//   [pinId: string]: number; // Or based on how SPICE reports current per pin/branch
// };

export type ComponentSimulationState = {
  pinVoltages?: PinVoltages;
  // pinCurrents?: PinCurrents; // Future
  // Add other component-specific states if needed, e.g., 'isOn' for LED
  isOn?: boolean;
  activeStates?: string[]; // Animation states that are currently active
};

export type SimulationState = {
  [componentId: string]: ComponentSimulationState;
};

// Note: Component-specific rendering logic has been moved to individual component renderers
// in the src/components/CircuitEditor/ComponentRenderers directory. 