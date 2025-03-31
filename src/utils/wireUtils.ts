
import { Edge } from '@xyflow/react';
import { CircuitComponent } from '@/types/component';
import { WireData, WireEdge } from '@/types/circuit';
import { getPinSignalType, getWireColorFromSignal, findComponentById, getPinByIndex, canPinsConnect } from './pinManagement';

// Export these functions so they can be imported directly from wireUtils
export { getPinSignalType, getWireColorFromSignal };

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
    },
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
