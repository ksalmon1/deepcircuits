
import { Node, Edge, Position } from '@xyflow/react';

// Node data type for Wokwi component nodes
export interface WokwiNodeData {
  type: string;
  attributes?: Record<string, any>;
  pins?: Array<{
    name: string;
    x: number;
    y: number;
    signals?: string[];
  }>;
  svgPath?: string | null;
  isOriginal?: boolean;
  [key: string]: unknown; // Add index signature to satisfy Record<string, unknown>
}

// Types for custom nodes in XY Flow
export type WokwiNode = Node<WokwiNodeData>;

// Custom edge data type for wires with routing points
export interface WireData {
  color: string;
  sourcePinIndex: number;
  targetPinIndex: number;
  routingPoints?: Array<{ x: number, y: number }>;
  cursorPosition?: { x: number, y: number }; // Add cursor position for wire following
  [key: string]: unknown; // Add index signature to satisfy Record<string, unknown>
}

// Custom edge type for wires
export type WireEdge = Edge<WireData>;

// Define state for wire connection process
export interface WireConnectionState {
  isConnecting: boolean;
  sourceNodeId?: string;
  sourceHandleId?: string;
  routingPoints: Array<{ x: number, y: number }>;
  sourcePinIndex?: number;
  temporaryEdgeId?: string;
}

// Define props for the CustomWireEdge component
export interface CustomWireEdgeProps {
  id: string;
  source: string;
  target: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  sourcePosition?: Position;
  targetPosition?: Position;
  style?: React.CSSProperties;
  data?: WireData;
  selected?: boolean;
  onDelete?: (id: string) => void;
}
