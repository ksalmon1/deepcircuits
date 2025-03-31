
import { Node } from '@xyflow/react';
import { WokwiNodeData } from '@/types/circuit';
import { CircuitComponent } from '@/types/component';
import { ComponentPin } from '@/types/pin';

/**
 * Convert a circuit component to a node for the React Flow canvas
 */
export const wokwiComponentToNode = (component: CircuitComponent): Node => {
  // Validate pins data
  const validatedPins = Array.isArray(component.pins) ? 
    component.pins.map(validatePin) : [];
  
  return {
    id: component.id,
    type: 'wokwiComponent',
    position: { x: component.left, y: component.top },
    data: {
      type: component.type,
      label: component.name || component.type,
      attributes: component.attributes || {},
      pins: validatedPins,
      svgPath: component.svgPath,
      isOriginal: component.isOriginal,
      showWires: true
    } as WokwiNodeData,
    draggable: true,
  };
};

/**
 * Validate a pin's data, ensuring coordinates are numbers
 */
function validatePin(pin: ComponentPin): ComponentPin {
  return {
    name: pin.name || '',
    x: typeof pin.x === 'number' && !isNaN(pin.x) ? pin.x : 0,
    y: typeof pin.y === 'number' && !isNaN(pin.y) ? pin.y : 0,
    signals: Array.isArray(pin.signals) ? pin.signals : []
  };
}

/**
 * Convert a React Flow node back to a circuit component
 */
export const nodeToCircuitComponent = (node: Node): CircuitComponent => {
  const nodeData = node.data as WokwiNodeData;
  
  return {
    id: node.id,
    type: nodeData.type,
    name: nodeData.label || nodeData.type, // Use label as name if available
    top: node.position.y,
    left: node.position.x,
    attributes: nodeData.attributes || {},
    pins: (nodeData.pins || []).map(pin => ({
      name: pin.name,
      x: typeof pin.x === 'number' && !isNaN(pin.x) ? pin.x : 0,
      y: typeof pin.y === 'number' && !isNaN(pin.y) ? pin.y : 0,
      signals: pin.signals || []
    })),
    svgPath: nodeData.svgPath,
    isOriginal: nodeData.isOriginal
  };
};
