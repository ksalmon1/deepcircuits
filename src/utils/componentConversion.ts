import { Node } from '@xyflow/react';
import { CircuitNodeData } from '@/types/circuit';
import { CircuitComponent } from '@/types/component';
import { ComponentPin } from '@/types/pin';

/**
 * Convert a React Flow node back to a circuit component
 */
export const nodeToCircuitComponent = (node: Node): CircuitComponent => {
  const nodeData = node.data as CircuitNodeData;
  
  return {
    id: node.id,
    type: nodeData.type,
    name: nodeData.label || nodeData.type, // Use label as name if available
    top: node.position.y,
    left: node.position.x,
    attributes: nodeData.attributes || {},
    pins: (nodeData.pins || []).map(pin => ({
      id: pin.id || `pin-${crypto.randomUUID().slice(0, 8)}`,
      name: pin.name,
      x: typeof pin.x === 'number' && !isNaN(pin.x) ? pin.x : 0,
      y: typeof pin.y === 'number' && !isNaN(pin.y) ? pin.y : 0,
      signals: pin.signals || []
    })),
    svgPath: nodeData.svgPath,
    isOriginal: nodeData.isOriginal
  };
};
