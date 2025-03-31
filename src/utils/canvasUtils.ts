
import { XYPosition } from '@xyflow/react';

/**
 * Convert mouse coordinates to React Flow canvas coordinates
 */
export function convertToCanvasCoordinates(
  event: MouseEvent,
  reactFlowBounds: DOMRect,
  viewport: { x: number, y: number, zoom: number }
): XYPosition {
  return {
    x: (event.clientX - reactFlowBounds.left - viewport.x) / viewport.zoom,
    y: (event.clientY - reactFlowBounds.top - viewport.y) / viewport.zoom
  };
}
