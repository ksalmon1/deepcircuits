
import { Edge, Node, XYPosition } from '@xyflow/react';
import { CircuitComponent } from './component';

/**
 * Wire data interface for custom wire edges
 */
export interface WireData {
  color: string;
  sourcePinIndex: number;
  targetPinIndex: number;
  routingPoints?: Array<{ x: number; y: number }>;
  cursorPosition?: XYPosition;
  [key: string]: unknown; // Add index signature to satisfy Record<string, unknown>
}

/**
 * Extended Edge type for wires
 */
export interface WireEdge extends Edge<WireData> {
  // Edge already has the data property, so we just need to extend with WireData
}

/**
 * Node data for circuit components
 */
export interface WokwiNodeData {
  type: string;
  pins?: Array<{ name: string; x: number; y: number; signals: string[] }>;
  attributes?: Record<string, any>;
  svgPath?: string | null;
  isOriginal?: boolean;
  [key: string]: unknown; // Add index signature to satisfy Record<string, unknown>
}

/**
 * Circuit editor state interface
 */
export interface CircuitEditorState {
  components: CircuitComponent[];
  selectedComponentId: string | null;
  isSimulationRunning: boolean;
  error: Error | null;
}

/**
 * Wire connection state for the wire routing system
 */
export interface WireConnectionState {
  isConnecting: boolean;
  sourceNodeId?: string;
  sourceHandleId?: string;
  sourcePinIndex?: number;
  routingPoints: Array<{ x: number; y: number }>;
  temporaryEdgeId?: string;
}

/**
 * Props for CustomWireEdge component
 */
export interface CustomWireEdgeProps {
  id: string;
  source: string;
  target: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  sourcePosition?: any;
  targetPosition?: any;
  style?: React.CSSProperties;
  data?: WireData;
  selected?: boolean;
  onDelete?: (id: string) => void;
}

/**
 * Error state interface for circuit editor
 */
export interface CircuitEditorErrorState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  errorCode: string;
  errorContext: string;
  errorTimestamp: number;
}

/**
 * Circuit simulation configuration
 */
export interface CircuitSimulationConfig {
  timeStep: number;
  maxIterations: number;
  tolerance: number;
  outputSampling: number;
}

/**
 * Circuit simulation results
 */
export interface CircuitSimulationResults {
  nodeVoltages: Record<string, number>;
  branchCurrents: Record<string, number>;
  simulationTime: number;
  iterations: number;
  converged: boolean;
  error?: string;
}
