
import { Node } from '@xyflow/react';
import { WokwiComponent } from '@/integrations/wokwi/WokwiIntegration';
import { WokwiNodeData } from '@/types/circuit';

/**
 * Converts a Wokwi component to an XY Flow node
 */
export const componentToNode = (component: WokwiComponent): Node<WokwiNodeData> => {
  // Log the complete component object for debugging (with a depth limit to avoid circular references)
  console.log('[componentToNode] Processing component:', JSON.stringify({
    id: component.id,
    type: component.type,
    svgPath: component.svgPath ? `${component.svgPath.substring(0, 20)}...` : 'missing',
    pins: component.pins ? `${component.pins.length} pins` : 'no pins',
    isOriginal: component.isOriginal,
    hasSvgPath: !!component.svgPath,
    svgPathLength: component.svgPath?.length || 0
  }));
  
  // Log the pins specifically
  console.log('[componentToNode] Component pins:', component.pins);
  
  // Create a complete node with all component data carefully preserved
  const node: Node<WokwiNodeData> = {
    id: component.id,
    type: 'wokwiComponent',
    position: { x: component.left, y: component.top },
    data: {
      type: component.type,
      attributes: component.attributes || {},
      pins: component.pins || [],
      // Preserve the exact svgPath value from the component
      svgPath: component.svgPath,
      isOriginal: component.isOriginal
    },
  };
  
  // Add additional debug logging for the node data
  console.log(`[componentToNode] Node data created:`, {
    nodeId: node.id,
    type: node.data.type,
    hasPins: !!node.data.pins,
    pinCount: node.data.pins?.length || 0,
    pinDetails: node.data.pins
  });
  
  return node;
};
