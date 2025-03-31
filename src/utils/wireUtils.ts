
import { Edge } from '@xyflow/react';
import { CircuitComponent } from '@/types/component';
import { WireData, WireEdge } from '@/types/circuit';
import { ComponentPin } from '@/types/pin';
import { getSignalColor } from './pinUtils';

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
 * Find component by ID in an array of components
 */
export function findComponentById(
  components: CircuitComponent[], 
  componentId: string
): CircuitComponent | null {
  return components.find(comp => comp.id === componentId) || null;
}

/**
 * Get a pin from a component by index
 */
export function getPinByIndex(
  component: CircuitComponent | null, 
  pinIndex: number
): ComponentPin | null {
  if (!component || !component.pins || pinIndex < 0 || pinIndex >= component.pins.length) {
    return null;
  }
  
  return component.pins[pinIndex];
}

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
  return getSignalColor(signalType);
}

/**
 * Check if a pin can connect to another pin
 */
export function canPinsConnect(sourcePin: ComponentPin, targetPin: ComponentPin): boolean {
  // Basic validation - pins must have signals
  if (!sourcePin.signals || !targetPin.signals) return false;
  
  // Check if signals are compatible
  const sourceSignals = sourcePin.signals.map(s => s.toLowerCase());
  const targetSignals = targetPin.signals.map(s => s.toLowerCase());
  
  // Check for direct match
  const hasMatchingSignal = sourceSignals.some(signal => targetSignals.includes(signal));
  if (hasMatchingSignal) return true;
  
  // Power can connect to analog/digital
  if (
    (sourceSignals.includes('power') && 
     (targetSignals.includes('analog') || targetSignals.includes('digital'))) ||
    (targetSignals.includes('power') && 
     (sourceSignals.includes('analog') || sourceSignals.includes('digital')))
  ) {
    return true;
  }
  
  // Ground can connect to anything
  if (sourceSignals.includes('ground') || targetSignals.includes('ground')) {
    return true;
  }
  
  return false;
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
    },
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
 */
export function calculateWireRoutingPoints(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  gridSize: number = 20
): Array<{ x: number; y: number }> {
  // Simple routing with just corner points
  const midX = sourceX + (targetX - sourceX) / 2;
  
  return [
    { x: midX, y: sourceY },
    { x: midX, y: targetY }
  ];
}
