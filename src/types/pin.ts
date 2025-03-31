
/**
 * Pin interface representing connection points on a component
 */
export interface ComponentPin {
  name: string;
  x: number;
  y: number;
  signals: string[];
}

/**
 * Represents a connection between two pins
 */
export interface PinConnection {
  sourceId: string;
  sourcePinIndex: number;
  targetId: string;
  targetPinIndex: number;
}

/**
 * Pin information with signal type
 */
export interface PinWithSignal extends ComponentPin {
  signalType: string;
  direction?: 'input' | 'output' | 'bidirectional';
}

/**
 * Pin state interface for tracking pin state in the circuit
 */
export interface PinState {
  value: number | boolean;
  lastUpdated: number;
  signalType: string;
}

/**
 * Interface for pin visualization properties
 */
export interface PinVisualization {
  color: string;
  label?: string;
  size?: number;
  highlighted?: boolean;
}
