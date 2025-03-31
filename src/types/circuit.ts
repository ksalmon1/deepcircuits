
import { NodeProps, EdgeProps, Node, Edge } from '@xyflow/react';
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
 */
export interface CustomWireEdgeProps extends Omit<EdgeProps, 'data'> {
  data?: WireData;
  onDelete?: (id: string) => void;
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
  temporaryEdgeId?: string;
}

/**
 * Data for wokwi component nodes
 */
export interface WokwiNodeData extends Record<string, unknown> {
  type: string;
  label: string;
  pins?: ComponentPin[];
  svgPath?: string | null;
  isOriginal?: boolean;
  isLoading?: boolean;
  showWires?: boolean;
  attributes?: Record<string, any>;
}

/**
 * Props for the Wokwi component node
 */
export interface WokwiNodeProps extends Omit<NodeProps, 'data'> {
  data: WokwiNodeData;
  selected: boolean;
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
