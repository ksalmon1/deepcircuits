
import { Node } from '@xyflow/react';
import { WokwiComponent } from '@/integrations/wokwi/WokwiIntegration';
import { WokwiNodeData } from '@/types/circuit';

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
 * Converts a Wokwi component to an XY Flow node
 * @deprecated Use wokwiComponentToNode from componentConversion.ts instead
 */
export const componentToNode = (component: WokwiComponent): Node => {
  // Create node data with explicit WokwiNodeData properties
  const nodeData: WokwiNodeData = {
    type: component.type,
    label: component.type, // Use type as label if name is not available
    attributes: component.attributes || {},
    pins: component.pins || [],
    svgPath: component.svgPath,
    isOriginal: component.isOriginal
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
    type: 'wokwiComponent',
    position: { x: component.left, y: component.top },
    data: nodeData,
    draggable: true,
  };
};
