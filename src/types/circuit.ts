
import { Node } from '@xyflow/react';

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

// Types for custom nodes in XY Flow
export type WokwiNode = Node<WokwiNodeData>;
