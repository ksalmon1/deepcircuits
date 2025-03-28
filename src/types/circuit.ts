
import { Edge, Node, Position } from '@xyflow/react';

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
  [key: string]: unknown; // Add index signature to satisfy Record<string, unknown>
}

// Edge data type for wire connections
export interface WireEdgeData {
  color?: string;
  isEditing?: boolean;
  sourcePinIndex?: number;
  targetPinIndex?: number;
  controlPoints?: Array<{ x: number; y: number }>;
  onStartEdit?: (id: string) => void;
  onFinishEdit?: (id: string) => void;
  onControlPointDrag?: (id: string, index: number, e: React.MouseEvent) => void;
  onAddControlPoint?: (id: string) => void;
  [key: string]: unknown; // Add index signature to satisfy Record<string, unknown>
}

// Wire definition for our circuit system
export interface Wire {
  id: string;
  sourceComponentId: string;
  targetComponentId?: string;
  sourcePinIndex: number;
  targetPinIndex?: number;
  color: string;
  points: Array<{ x: number; y: number }>;
}

// Types for custom nodes and edges in XY Flow
export type WokwiNode = Node<WokwiNodeData>;
export type WireEdge = Edge<WireEdgeData>;
