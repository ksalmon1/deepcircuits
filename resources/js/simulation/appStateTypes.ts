/**
 * Types representing the state of components and connections
 * as stored in the React application state (e.g., from React Flow).
 */

/** Represents a component in the application's state */
export interface AppComponentModel {
    id: string; // Unique component instance ID
    // Type identifier (e.g., 'Resistor', 'VoltageSource', 'LED', 'MosfetN', etc.)
    // Should match the keys used for rendering and simulation mapping.
    type: string;
    // Component-specific properties (e.g., resistance, voltage, model parameters)
    // Structure might vary per component type.
    properties: Record<string, unknown>;
    // Defines the connection points (pins/terminals) available on this component.
    // Used for mapping connections and potentially for special handling (e.g., GND pin name).
    pins: { id: string; name?: string }[];
    // Optional: Position, dimensions, or other UI-specific data if needed
    position?: { x: number; y: number };
}

/** Represents a connection/wire in the application's state */
export interface AppConnectionModel {
    id: string; // Unique connection ID
    // Source connection point
    from: { componentId: string; pinId: string };
    // Target connection point
    to: { componentId: string; pinId: string };
    // Optional: UI data like wire shape, color etc.
} 