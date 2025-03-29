
import { Node, Edge } from '@xyflow/react';

// This interface defines the data specific to Wokwi component nodes
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
  [key: string]: unknown; // Add index signature to allow additional properties
}

// Types for custom nodes in XY Flow
export type WokwiNode = Node<WokwiNodeData>;

// Custom edge data type for wires
export interface WireData {
  color: string;
  sourcePinIndex?: number;
  targetPinIndex?: number;
  signalType?: string;
  isRoutingSegment?: boolean;
  [key: string]: unknown; // Add index signature
}

// Custom edge type for wires
export type WireEdge = Edge<WireData>;

// Type for routing point node data
export interface RoutingPointData {
  // Any specific data for routing points can go here
  [key: string]: unknown;
}

// Custom node type for routing points
export type RoutingPointNode = Node<RoutingPointData>;

// Interface for the wiring state
export interface WiringState {
  isActive: boolean;
  sourceNodeId: string;
  sourceHandleId: string;
  lastNodeId: string; 
  lastHandleId: string | null;
  intermediateNodes: string[];
  intermediateEdges: string[];
  wireColor: string;
  signalType: string;
}
