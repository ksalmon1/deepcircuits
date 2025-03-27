
import { Node, Edge } from '@xyflow/react';
import { WokwiComponent } from '@/integrations/wokwi/WokwiIntegration';
import { Wire } from '@/hooks/useWireSystem';
import { WokwiNodeData, WireEdgeData } from '@/types/circuit';

/**
 * Converts a Wokwi component to an XY Flow node
 */
export const componentToNode = (component: WokwiComponent): Node => {
  return {
    id: component.id,
    type: 'wokwiComponent',
    position: { x: component.left, y: component.top },
    data: {
      type: component.type,
      attributes: component.attributes,
      pins: component.pins || []
    } as WokwiNodeData,
  };
};

/**
 * Converts wires to XY Flow edges
 */
export const wiresToEdges = (
  wires: Wire[],
  components: WokwiComponent[],
  editingEdgeId: string | null,
  controlPoints: Record<string, { x: number, y: number }[]>,
  handlers: {
    onStartEdit: (id: string) => void;
    onFinishEdit: (id: string) => void;
    onControlPointDrag: (id: string, index: number, e: React.MouseEvent) => void;
    onAddControlPoint: (id: string) => void;
  }
): Edge[] => {
  return wires.map(wire => {
    // Skip wires that don't have source and target components
    if (!wire.sourceComponentId || !wire.targetComponentId) return null;
    
    // Find source and target components
    const sourceComponent = components.find(c => c.id === wire.sourceComponentId);
    const targetComponent = components.find(c => c.id === wire.targetComponentId);
    
    if (!sourceComponent || !targetComponent) return null;
    
    const isEditing = editingEdgeId === wire.id;
    
    return convertWireToEdge(
      wire,
      sourceComponent,
      targetComponent,
      isEditing,
      controlPoints[wire.id] || [],
      handlers
    );
  }).filter(Boolean) as Edge[];
};

/**
 * Convert an individual wire to an XY Flow edge
 */
export const convertWireToEdge = (
  wire: Wire,
  sourceComponent: WokwiComponent,
  targetComponent: WokwiComponent,
  isEditing: boolean,
  edgeControlPoints: { x: number, y: number }[],
  handlers: {
    onStartEdit: (id: string) => void;
    onFinishEdit: (id: string) => void;
    onControlPointDrag: (id: string, index: number, e: React.MouseEvent) => void;
    onAddControlPoint: (id: string) => void;
  }
): Edge => {
  return {
    id: wire.id,
    source: wire.sourceComponentId,
    target: wire.targetComponentId as string,
    sourceHandle: `pin-${wire.sourcePinIndex}`,
    targetHandle: `pin-${wire.targetPinIndex}`,
    type: 'wire',
    data: {
      color: wire.color,
      isEditing,
      controlPoints: edgeControlPoints,
      ...handlers
    } as WireEdgeData,
    animated: false,
  };
};
