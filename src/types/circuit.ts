
import { Node, Edge } from '@xyflow/react';

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

// Custom edge data type for wires
export interface WireData {
  color: string;
  sourcePinIndex: number;
  targetPinIndex: number;
  [key: string]: unknown; // Add index signature to satisfy Record<string, unknown>
}

// Custom edge type for wires
export type WireEdge = Edge<WireData>;
