/**
 * Defines shared types for the circuit simulation engine.
 */

/** Placeholder: Represents a component as stored in your React app's state */
export interface AppComponentModel {
    id: string;
    type: 'Resistor' | 'VoltageSource' | 'CurrentSource' /* | ... add more types from your app state as needed */;
    properties: Record<string, any>; // e.g., { resistance: 1000 } or { voltage: 5 }
    // Define pins available on this component, e.g., [{id: 'p1', name: '1'}, {id: 'p2', name: '2'}]
    // This structure needs to match how your React app defines component pins.
    pins: { id: string; name?: string }[];
}

/** Placeholder: Represents a connection/wire in your React app's state */
export interface AppConnectionModel {
    id: string;
    from: { componentId: string; pinId: string };
    to: { componentId: string; pinId: string };
}

/** Represents a node in the internal circuit model */
export interface CircuitNode {
    id: number; // Unique numeric ID, 0 is conventionally ground
}

/** Represents the results of a DC simulation */
export interface DCSimulationResult {
    nodeVoltages: Record<number, number>; // Map of Node ID -> Voltage
    voltageSourceCurrents: Record<string, number>; // Map of VSource Component ID -> Current through it
}

// Add more shared types as the engine evolves 