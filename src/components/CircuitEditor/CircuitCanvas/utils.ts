
import { Node } from '@xyflow/react';
import { WokwiComponent } from '@/integrations/wokwi/WokwiIntegration';
import { WokwiNodeData } from '@/types/circuit';
import { Position } from '@xyflow/react';

/**
 * Converts a Wokwi component to an XY Flow node
 */
export const componentToNode = (component: WokwiComponent): Node<WokwiNodeData> => {
  // Log the complete component object for debugging (with a depth limit to avoid circular references)
  console.log('Full component object:', JSON.stringify({
    id: component.id,
    type: component.type,
    svgPath: component.svgPath ? `${component.svgPath.substring(0, 20)}...` : 'missing',
    isOriginal: component.isOriginal,
    hasSvgPath: !!component.svgPath,
    svgPathLength: component.svgPath?.length || 0
  }));
  
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
  console.log(`Node data created with:`, {
    nodeId: node.id,
    type: node.data.type,
    hasSvgPath: !!node.data.svgPath,
    svgPathLength: node.data.svgPath?.length || 0
  });
  
  return node;
};

/**
 * Get edge parameters based on source and target positions
 */
export const getEdgeParams = (
  source: { x: number; y: number; position: Position },
  target: { x: number; y: number; position: Position }
) => {
  return {
    sourceX: source.x,
    sourceY: source.y,
    targetX: target.x,
    targetY: target.y,
    sourcePosition: source.position,
    targetPosition: target.position,
  };
};
