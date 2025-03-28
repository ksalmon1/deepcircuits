
import { Node } from '@xyflow/react';
import { WokwiComponent } from '@/integrations/wokwi/WokwiIntegration';
import { WokwiNodeData } from '@/types/circuit';

/**
 * Converts a Wokwi component to an XY Flow node
 */
export const componentToNode = (component: WokwiComponent): Node<WokwiNodeData> => {
  // Log the component being converted to a node for debugging
  console.log(`Converting component to node: id=${component.id}, type=${component.type}, svgPath=${component.svgPath ? 'exists' : 'missing'}, isOriginal=${component.isOriginal}`);
  
  // Create a complete node with all component data carefully preserved
  const node: Node<WokwiNodeData> = {
    id: component.id,
    type: 'wokwiComponent',
    position: { x: component.left, y: component.top },
    data: {
      type: component.type,
      attributes: component.attributes || {},
      pins: component.pins || [],
      // Fix: Directly assign the svgPath without any null fallback that could
      // convert a valid empty string to null
      svgPath: component.svgPath,
      isOriginal: component.isOriginal
    },
  };
  
  // Add additional debug logging
  console.log(`Node data created with: svgPath=${node.data.svgPath ? 'present' : 'missing'}, length=${node.data.svgPath?.length || 0}`);
  
  return node;
};
