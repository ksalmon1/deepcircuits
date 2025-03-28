
import { Node } from '@xyflow/react';
import { WokwiComponent } from '@/integrations/wokwi/WokwiIntegration';
import { WokwiNodeData } from '@/types/circuit';

/**
 * Converts a Wokwi component to an XY Flow node
 */
export const componentToNode = (component: WokwiComponent): Node<WokwiNodeData> => {
  // Log the component being converted to a node for debugging
  console.log(`Converting component to node: id=${component.id}, type=${component.type}, svgPath=${component.svgPath ? 'exists' : 'missing'}, isOriginal=${component.isOriginal}`);
  
  return {
    id: component.id,
    type: 'wokwiComponent',
    position: { x: component.left, y: component.top },
    data: {
      type: component.type,
      attributes: component.attributes,
      pins: component.pins || [],
      svgPath: component.svgPath || null,
      isOriginal: component.isOriginal
    },
  };
};
