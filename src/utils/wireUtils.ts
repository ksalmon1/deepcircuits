
import { Edge } from '@xyflow/react';
import { CircuitComponent } from '@/types/component';
import { WireData } from '@/types/circuit';
import { findComponentById, getPinByIndex } from './pinManagement';
import { isValidConnection } from '@/domain/connectionRules';

// Re-export the domain function for backward compatibility
export { isValidConnection };

/**
 * Get the signal type of a pin
 */
export function getPinSignalType(
  components: CircuitComponent[],
  componentId: string,
  pinIndex: number
): string | null {
  const component = findComponentById(components, componentId);
  if (!component) return null;
  
  const pin = getPinByIndex(component, pinIndex);
  if (!pin || !pin.signals || pin.signals.length === 0) return null;
  
  return pin.signals[0];
}

/**
 * Get wire color based on signal type
 */
export function getWireColorFromSignal(signalType: string): string {
  const signalColorMap: Record<string, string> = {
    'power': '#ff0000',
    'ground': '#000000',
    'analog': '#4BC0C0',
    'digital': '#9b87f5',
    'clock': '#ffcc00',
    'data': '#36A2EB',
    'i2c': '#8A65D4',
    'spi': '#4CAF50',
    'uart': '#FF9800',
    'pwm': '#E91E63'
  };
  
  return signalColorMap[signalType.toLowerCase()] || '#9b87f5'; // Default color
}

/**
 * Create a unique ID for a wire
 */
export function createWireId(): string {
  return `wire-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a wire edge between two components
 */
export const createWireEdge = (
  components: CircuitComponent[],
  sourceId: string,
  sourcePinIndex: number,
  targetId: string,
  targetPinIndex: number,
  routingPoints: Array<{ x: number; y: number }> = []
): Edge<WireData> => {
  // Generate a unique edge ID
  const edgeId = createWireId();
  
  // Get the signal type to determine wire color
  const signal = getPinSignalType(components, sourceId, sourcePinIndex);
  const color = getWireColorFromSignal(signal || '');
  
  // Create the edge with custom data
  const edge: Edge<WireData> = {
    id: edgeId,
    source: sourceId,
    target: targetId,
    sourceHandle: `pin-${sourcePinIndex}`,
    targetHandle: `pin-${targetPinIndex}`,
    type: 'customWire',
    data: {
      color,
      sourcePinIndex,
      targetPinIndex,
      routingPoints,
      signal
    } as WireData,
    animated: signal === 'clock' || signal === 'data',
    style: {
      stroke: color,
      strokeWidth: 2
    }
  };
  
  return edge;
};

/**
 * Find all wires connected to a component
 */
export function findConnectedWires(
  edges: Edge[],
  componentId: string
): Edge[] {
  return edges.filter(edge => 
    edge.source === componentId || edge.target === componentId
  );
}

/**
 * Calculate edge parameters for a connection
 */
export function getEdgeParams(sourceX: number, sourceY: number, targetX: number, targetY: number) {
  return {
    sx: sourceX,
    sy: sourceY,
    tx: targetX,
    ty: targetY,
    sourcePos: { x: sourceX, y: sourceY },
    targetPos: { x: targetX, y: targetY }
  };
}

/**
 * Calculate optimal routing points for a wire
 */
export function calculateWireRoutingPoints(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  gridSize: number = 20,
  obstacles: Array<{ x: number, y: number, width: number, height: number }> = []
): Array<{ x: number; y: number }> {
  // Ensure all coordinates are valid numbers
  const safeSourceX = typeof sourceX === 'number' && !isNaN(sourceX) ? sourceX : 0;
  const safeSourceY = typeof sourceY === 'number' && !isNaN(sourceY) ? sourceY : 0;
  const safeTargetX = typeof targetX === 'number' && !isNaN(targetX) ? targetX : 0;
  const safeTargetY = typeof targetY === 'number' && !isNaN(targetY) ? targetY : 0;
  
  // Simple routing with just corner points
  // For a direct path, we create a right-angle route with one midpoint
  const midX = safeSourceX + (safeTargetX - safeSourceX) / 2;
  
  return [
    { x: midX, y: safeSourceY },
    { x: midX, y: safeTargetY }
  ];
}

/**
 * Check if two edges represent the same connection
 */
export function areSameConnection(edge1: Edge, edge2: Edge): boolean {
  // Check direct match
  const directMatch = edge1.source === edge2.source && 
                      edge1.target === edge2.target &&
                      edge1.sourceHandle === edge2.sourceHandle &&
                      edge1.targetHandle === edge2.targetHandle;
  
  // Check reverse match
  const reverseMatch = edge1.source === edge2.target &&
                       edge1.target === edge2.source &&
                       edge1.sourceHandle === edge2.targetHandle &&
                       edge1.targetHandle === edge2.sourceHandle;
  
  return directMatch || reverseMatch;
}

/**
 * Check if two points are aligned horizontally (same y-coordinate)
 */
export function arePointsHorizontallyAligned(point1: { x: number, y: number }, point2: { x: number, y: number }, threshold: number = 3): boolean {
  return Math.abs(point1.y - point2.y) <= threshold;
}

/**
 * Check if two points are aligned vertically (same x-coordinate)
 */
export function arePointsVerticallyAligned(point1: { x: number, y: number }, point2: { x: number, y: number }, threshold: number = 3): boolean {
  return Math.abs(point1.x - point2.x) <= threshold;
}

/**
 * Snap a point to another point's coordinates if they're within threshold
 */
export function snapPointToAlignment(
  point: { x: number, y: number },
  referencePoint: { x: number, y: number },
  threshold: number = 3
): { x: number, y: number } {
  const newPoint = { ...point };
  
  if (arePointsHorizontallyAligned(point, referencePoint, threshold)) {
    newPoint.y = referencePoint.y;
  }
  
  if (arePointsVerticallyAligned(point, referencePoint, threshold)) {
    newPoint.x = referencePoint.x;
  }
  
  return newPoint;
}
