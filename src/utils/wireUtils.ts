
import { CircuitComponent } from "@/types/component";
import { getPinSignalType, getWireColorFromSignal } from "./pinManagement";

/**
 * Create a unique ID for a new wire
 */
export const createWireId = (): string => {
  return `wire-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

/**
 * Check if a wire connection is valid based on signal types
 */
export const isValidConnection = (
  components: CircuitComponent[],
  sourceId: string,
  sourcePinIndex: number,
  targetId: string,
  targetPinIndex: number
): boolean => {
  // Prevent connecting a component to itself
  if (sourceId === targetId) {
    return false;
  }
  
  const sourceSignal = getPinSignalType(components, sourceId, sourcePinIndex);
  const targetSignal = getPinSignalType(components, targetId, targetPinIndex);
  
  // Allow connection if we don't have signal information
  if (!sourceSignal || !targetSignal) {
    return true;
  }
  
  // For now, allow all connections between different components
  // This can be enhanced with more specific validation logic
  return true;
};

/**
 * Calculate wire routing points between source and target
 */
export const calculateWireRoutingPoints = (
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number
): Array<{ x: number, y: number }> => {
  // For now, create a simple middle point for better routing
  const midX = (sourceX + targetX) / 2;
  
  return [
    { x: midX, y: sourceY },
    { x: midX, y: targetY }
  ];
};

// Re-export pin management functions that are related to wires
export { getPinSignalType, getWireColorFromSignal };
