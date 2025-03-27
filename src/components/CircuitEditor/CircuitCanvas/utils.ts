import { Node, Edge } from '@xyflow/react';
import { WokwiComponent } from '@/integrations/wokwi/WokwiIntegration';
import { getWireColorFromSignal, getPinSignalType } from '@/utils/wireUtils';
import { Wire } from '@/hooks/useWireSystem';

/**
 * Converts a Wokwi component to a React Flow node
 */
export const componentToNode = (component: WokwiComponent): Node => {
  return {
    id: component.id,
    type: 'wokwiComponent',
    position: { x: component.left, y: component.top },
    data: {
      component: component,
      type: component.type,
      pins: component.pins,
      attributes: component.attributes,
    },
    // Ensure we don't have transitions to avoid layout shift when dragging
    style: { transition: 'none' }
  };
};

/**
 * Converts wire connections to React Flow edges
 */
export const wiresToEdges = (
  wires: Wire[],
  components: any[],
  editingWireId: string | null = null,
  controlPoints: Record<string, { x: number, y: number }[]> = {},
  callbacks: {
    onStartEdit?: (id: string) => void;
    onFinishEdit?: (id: string) => void;
    onControlPointDrag?: (id: string, index: number, e: React.MouseEvent) => void;
    onAddControlPoint?: (id: string) => void;
  } = {}
): Edge[] => {
  return wires.map(wire => {
    // Find source and target components
    const sourceComponent = components.find(c => c.id === wire.sourceComponentId);
    const targetComponent = wire.targetComponentId 
      ? components.find(c => c.id === wire.targetComponentId) 
      : null;
    
    if (!sourceComponent) {
      console.warn(`Source component not found for wire ${wire.id}`);
      return null;
    }
    
    // Create a unique ID for the source and target
    const sourceHandleId = `pin-${wire.sourcePinIndex}`;
    const targetHandleId = wire.targetPinIndex !== null ? `pin-${wire.targetPinIndex}` : undefined;

    // Convert wire to edge
    return {
      id: wire.id,
      source: wire.sourceComponentId,
      sourceHandle: sourceHandleId,
      target: wire.targetComponentId || '',
      targetHandle: targetHandleId,
      type: 'wire',
      animated: false,
      data: {
        color: wire.color,
        isEditing: editingWireId === wire.id,
        controlPoints: wire.points.slice(1, -1).map(p => ({ x: p.x, y: p.y })) || 
                      controlPoints[wire.id] || 
                      [],
        onStartEdit: callbacks.onStartEdit,
        onFinishEdit: callbacks.onFinishEdit,
        onControlPointDrag: callbacks.onControlPointDrag,
        onAddControlPoint: callbacks.onAddControlPoint,
      }
    };
  }).filter(edge => edge !== null) as Edge[];
};

/**
 * Converts Konva wire to XY Flow edge
 */
export const convertWireToEdge = (
  wire: Wire,
  callbacks: {
    onStartEdit?: (id: string) => void;
    onFinishEdit?: (id: string) => void;
    onControlPointDrag?: (id: string, index: number, e: React.MouseEvent) => void;
    onAddControlPoint?: (id: string) => void;
  } = {}
): Edge | null => {
  if (!wire.targetComponentId) {
    // Wire is incomplete, don't convert
    return null;
  }
  
  const sourceHandleId = `pin-${wire.sourcePinIndex}`;
  const targetHandleId = wire.targetPinIndex !== null ? `pin-${wire.targetPinIndex}` : undefined;
  
  // Convert control points (all points between first and last)
  const controlPoints = wire.points.slice(1, -1).map(p => ({ x: p.x, y: p.y }));
  
  return {
    id: wire.id,
    source: wire.sourceComponentId,
    sourceHandle: sourceHandleId,
    target: wire.targetComponentId,
    targetHandle: targetHandleId,
    type: 'wire',
    data: {
      color: wire.color,
      controlPoints,
      onStartEdit: callbacks.onStartEdit,
      onFinishEdit: callbacks.onFinishEdit,
      onControlPointDrag: callbacks.onControlPointDrag,
      onAddControlPoint: callbacks.onAddControlPoint,
    }
  };
};

/**
 * Updates component position from node position
 */
export const updateComponentPosition = (
  components: WokwiComponent[],
  nodeId: string, 
  position: { x: number, y: number }
): WokwiComponent[] => {
  return components.map(component => {
    if (component.id === nodeId) {
      return {
        ...component,
        left: position.x,
        top: position.y
      };
    }
    return component;
  });
};

/**
 * Create a connection object from a wire
 */
export const wireToConnection = (wire: Wire) => {
  return {
    source: wire.sourceComponentId,
    sourceHandle: `pin-${wire.sourcePinIndex}`,
    target: wire.targetComponentId,
    targetHandle: wire.targetPinIndex !== null ? `pin-${wire.targetPinIndex}` : undefined,
  };
};
