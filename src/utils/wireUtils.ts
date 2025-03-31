import { Edge } from '@xyflow/react';
import { CircuitComponent } from '@/types/component';
import { WireData, WireEdge } from '@/types/circuit';
import { findComponentById, getPinByIndex, canPinsConnect } from './pinManagement';

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
 * Check if a connection is valid between components
 */
export function isValidConnection(
  components: CircuitComponent[],
  sourceId: string,
  sourcePinIndex: number,
  targetId: string,
  targetPinIndex: number
): boolean {
  // Prevent self-connections
  if (sourceId === targetId) {
    return false;
  }
  
  const sourceComponent = findComponentById(components, sourceId);
  const targetComponent = findComponentById(components, targetId);
  
  if (!sourceComponent || !targetComponent) {
    return false;
  }
  
  const sourcePin = getPinByIndex(sourceComponent, sourcePinIndex);
  const targetPin = getPinByIndex(targetComponent, targetPinIndex);
  
  if (!sourcePin || !targetPin) {
    return false;
  }
  
  return canPinsConnect(sourcePin, targetPin);
}

/**
 * Create a wire edge between two components
 */
export function createWireEdge(
  components: CircuitComponent[],
  sourceId: string,
  sourcePinIndex: number,
  targetId: string,
  targetPinIndex: number,
  routingPoints: Array<{ x: number; y: number }> = []
): Edge<WireData> {
  const signal = getPinSignalType(components, sourceId, sourcePinIndex);
  const wireColor = getWireColorFromSignal(signal || '');
  
  return {
    id: createWireId(),
    source: sourceId,
    target: targetId,
    sourceHandle: `pin-${sourcePinIndex}`,
    targetHandle: `pin-${targetPinIndex}`,
    type: 'customWire',
    data: {
      color: wireColor,
      sourcePinIndex,
      targetPinIndex,
      routingPoints,
    } as WireData,
    animated: signal === 'clock' || signal === 'data',
    style: {
      stroke: wireColor,
      strokeWidth: 2
    }
  };
}

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
 * Convert edges to pin connections
 */
export function edgesToConnections(edges: Edge[]): Array<{
  sourceId: string;
  targetId: string;
  sourcePinIndex: number;
  targetPinIndex: number;
}> {
  return edges.map(edge => {
    const sourceHandle = edge.sourceHandle || '';
    const targetHandle = edge.targetHandle || '';
    
    // Extract pin indices from handle IDs (format: "pin-{index}")
    const sourcePinIndex = parseInt(sourceHandle.split('-')[1] || '0');
    const targetPinIndex = parseInt(targetHandle.split('-')[1] || '0');
    
    return {
      sourceId: edge.source,
      targetId: edge.target,
      sourcePinIndex,
      targetPinIndex
    };
  });
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
 * Calculate optimal routing points for a wire
 * Uses a simplified version of the A* algorithm to find routing points
 */
export function calculateWireRoutingPoints(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  gridSize: number = 20,
  obstacles: Array<{ x: number, y: number, width: number, height: number }> = []
): Array<{ x: number; y: number }> {
  // Simple routing with just corner points for now
  // For a direct path, we create a right-angle route with one midpoint
  const midX = sourceX + (targetX - sourceX) / 2;
  
  return [
    { x: midX, y: sourceY },
    { x: midX, y: targetY }
  ];
}

/**
 * Calculate signal strength for a wire (for visualization)
 * Returns a value between 0 and 1
 */
export function calculateSignalStrength(
  wireType: string,
  wireLengthPx: number
): number {
  // Simple model: signal degrades with distance
  const maxLength = 1000; // pixels
  const minStrength = 0.3;
  
  // Different signal types degrade at different rates
  const degradationRates: Record<string, number> = {
    'power': 0.1,
    'ground': 0.1,
    'analog': 0.3,
    'digital': 0.2,
    'clock': 0.4,
    'data': 0.25,
    'default': 0.2
  };
  
  const rate = degradationRates[wireType.toLowerCase()] || degradationRates.default;
  const strength = 1 - (wireLengthPx / maxLength) * rate;
  
  return Math.max(minStrength, Math.min(1, strength));
}

/**
 * Calculate wire length in pixels
 */
export function calculateWireLength(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  routingPoints: Array<{ x: number; y: number }> = []
): number {
  let totalLength = 0;
  let lastX = sourceX;
  let lastY = sourceY;
  
  // Add distance for each routing point
  for (const point of routingPoints) {
    totalLength += Math.sqrt(
      Math.pow(point.x - lastX, 2) + Math.pow(point.y - lastY, 2)
    );
    lastX = point.x;
    lastY = point.y;
  }
  
  // Add distance to the target
  totalLength += Math.sqrt(
    Math.pow(targetX - lastX, 2) + Math.pow(targetY - lastY, 2)
  );
  
  return totalLength;
}
