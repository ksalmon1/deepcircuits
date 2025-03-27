
import { Node, Edge } from '@xyflow/react';
import { WokwiComponent } from '@/integrations/wokwi/WokwiIntegration';

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
export const wiresToEdges = (wires: any[]): Edge[] => {
  return wires.map(wire => ({
    id: wire.id,
    source: wire.sourceComponentId,
    target: wire.targetComponentId,
    sourceHandle: `pin-${wire.sourcePinIndex}-out`,
    targetHandle: `pin-${wire.targetPinIndex}-in`,
    type: 'wire',
    data: {
      color: wire.color,
    },
    // Ensure we don't have transitions to avoid layout shift when dragging
    style: { transition: 'none' }
  }));
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
