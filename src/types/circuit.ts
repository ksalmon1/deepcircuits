import { NodeProps, EdgeProps, Node, Edge, ConnectionLineComponentProps } from '@xyflow/react';
import { ComponentPin } from './pin';

/**
 * Data for wire edges
 */
export interface WireData extends Record<string, unknown> {
  color: string;
  sourcePinIndex: number;
  targetPinIndex: number;
  routingPoints?: Array<{ x: number; y: number }>;
  cursorPosition?: { x: number; y: number };
  signal?: string;
}

/**
 * Interface for a wire edge that includes WireData
 */
export interface WireEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle: string;
  targetHandle: string;
  type: string;
  data: WireData;
}

/**
 * Props for the custom wire edge component
 * Updated to match React Flow's flexible style type
 */
export interface CustomWireEdgeProps extends Omit<EdgeProps, 'data'> {
  data?: WireData;
  onDelete?: (id: string) => void;
  // Allow for more flexible style types to match React Flow's expectations
  style?: Record<string, any>;
}

/**
 * State for wire connection in progress
 */
export interface WireConnectionState {
  isConnecting: boolean;
  sourceNodeId?: string;
  sourceHandleId?: string;
  sourcePinIndex?: number;
  routingPoints: Array<{ x: number; y: number }>;
}

/**
 * Data for circuit component nodes
 */
export interface CircuitNodeData extends Record<string, unknown> {
  label: string;
  type: string;
  attributes: Record<string, any>;
  pins: ComponentPin[];
  svgPath?: string;
  isOriginal?: boolean;
  // Add any other relevant data needed by the node component
}

/**
 * Props for the circuit component node
 */
export interface CircuitNodeProps extends Omit<NodeProps, 'data'> {
  data: CircuitNodeData;
}

/**
 * Error state for the circuit editor
 */
export interface CircuitEditorErrorState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  errorCode: string;
  errorContext: string;
  errorTimestamp: number;
}
