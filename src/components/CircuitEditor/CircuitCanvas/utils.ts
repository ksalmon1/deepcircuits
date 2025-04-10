import { Node } from '@xyflow/react';
import { CircuitComponent } from '@/types/component';
import { CircuitNodeData } from '@/types/circuit';
import { ComponentPin } from '@/types/pin';

/**
 * Get params for wire edge rendering
 */
export const getEdgeParams = (sourceX: number, sourceY: number, targetX: number, targetY: number) => {
  const centerX = (sourceX + targetX) / 2;
  const centerY = (sourceY + targetY) / 2;
  
  return {
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition: { x: sourceX, y: sourceY },
    targetPosition: { x: targetX, y: targetY },
    centerX,
    centerY,
  };
};

/**
 * Converts a circuit component to an XY Flow node
 */
export const componentToNode = (component: CircuitComponent): Node => {
  // Create node data with explicit CircuitNodeData properties
  const nodeData: CircuitNodeData = {
    label: component.name || component.type,
    type: component.type,
    attributes: component.attributes || {},
    pins: component.pins ? component.pins.map(validatePin) : [],
    svgPath: component.svgPath,
    isOriginal: component.isOriginal,
  };
  
  // Log the node data for debugging
  console.log(`Node data created:`, {
    nodeId: component.id,
    type: nodeData.type,
    hasSvgPath: !!nodeData.svgPath,
    svgPathLength: nodeData.svgPath?.length || 0,
    pins: nodeData.pins.length
  });
  
  // Return a properly typed Node
  return {
    id: component.id,
    type: 'circuitComponent',
    position: { x: component.left, y: component.top },
    data: nodeData,
    draggable: true,
  };
};

/**
 * Validate a pin's data, ensuring coordinates are numbers
 * (Keep this function as it's generally useful)
 */
function validatePin(pin: ComponentPin): ComponentPin {
  return {
    id: pin.id,
    name: pin.name || '',
    x: typeof pin.x === 'number' && !isNaN(pin.x) ? pin.x : 0,
    y: typeof pin.y === 'number' && !isNaN(pin.y) ? pin.y : 0,
    signals: Array.isArray(pin.signals) ? pin.signals : []
  };
}
