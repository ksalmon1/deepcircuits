
import { Node } from '@xyflow/react';
import { WokwiComponent } from '@/integrations/wokwi/WokwiIntegration';
import { WokwiNodeData } from '@/types/circuit';

/**
 * Converts a Wokwi component to an XY Flow node
 */
export const componentToNode = (component: WokwiComponent): Node<WokwiNodeData> => {
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
