
import { Edge, Node } from '@xyflow/react';
import { WokwiComponent } from '@/integrations/wokwi/WokwiIntegration';

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
}

// Edge data type for wire connections
export interface WireEdgeData {
  color?: string;
  isEditing?: boolean;
  controlPoints?: Array<{ x: number; y: number }>;
  onStartEdit?: (id: string) => void;
  onFinishEdit?: (id: string) => void;
  onControlPointDrag?: (id: string, index: number, e: React.MouseEvent) => void;
  onAddControlPoint?: (id: string) => void;
}

// Types for custom nodes and edges in XY Flow
export type WokwiNode = Node<WokwiNodeData>;
export type WireEdge = Edge<WireEdgeData>;
