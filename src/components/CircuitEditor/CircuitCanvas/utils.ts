
import { Node, Edge } from '@xyflow/react';
import { WokwiComponent } from '@/integrations/wokwi/WokwiIntegration';
import { Wire } from '@/hooks/useWireSystem';

// Convert a WokwiComponent to an XY Flow Node
export function componentToNode(component: WokwiComponent): Node {
  return {
    id: component.id,
    type: 'wokwiComponent',
    position: {
      x: component.left,
      y: component.top,
    },
    data: {
      component: component,
    },
    draggable: true,
    selectable: true,
  };
}

// Convert an XY Flow Node back to a WokwiComponent
export function nodeToComponent(node: Node): WokwiComponent {
  const component = node.data.component as WokwiComponent;
  
  return {
    ...component,
    left: node.position.x,
    top: node.position.y,
  };
}

// Convert a Wire array to XY Flow Edges
export function wiresToEdges(wires: Wire[]): Edge[] {
  return wires.map(wire => {
    // For simplicity, we're assuming each wire has start and end points
    const sourceId = wire.sourceComponentId;
    const targetId = wire.targetComponentId;
    
    if (!sourceId || !targetId) {
      return null;
    }
    
    return {
      id: wire.id,
      source: sourceId,
      sourceHandle: `pin-${wire.sourcePinIndex}-out`,
      target: targetId,
      targetHandle: `pin-${wire.targetPinIndex}-in`,
      type: 'wire',
      data: {
        color: wire.color,
      },
    };
  }).filter(Boolean) as Edge[];
}

// Convert XY Flow Edges to Wire array
export function edgesToWires(edges: Edge[]): Wire[] {
  return edges.map(edge => {
    // Parse the pin indices from the handles
    const sourcePinIndex = parseInt(edge.sourceHandle?.split('-')[1] || '0');
    const targetPinIndex = parseInt(edge.targetHandle?.split('-')[1] || '0');
    
    return {
      id: edge.id,
      sourceComponentId: edge.source,
      sourcePinIndex,
      targetComponentId: edge.target,
      targetPinIndex,
      color: edge.data?.color || '#FF0000',
      points: [], // We don't need specific points with XY Flow as it handles path generation
    };
  });
}
