
/**
 * Utility functions for wire creation, rendering, and management
 */

import { WokwiPin } from '@/integrations/wokwi/WokwiIntegration';
import { WokwiComponent } from '@/integrations/wokwi/WokwiIntegration';
import { Wire } from '@/hooks/useWireSystem';

// Define a wire type to represent connections between components
export interface WireUtilsWire {
  id: string;
  sourceComponentId: string;
  sourcePinIndex: number;
  targetComponentId: string | null;
  targetPinIndex: number | null;
  points: { x: number; y: number }[];
  color: string;
  isComplete: boolean;
}

/**
 * Creates a new wire starting from a component pin
 */
export const createWire = (
  componentId: string,
  pinIndex: number,
  startX: number,
  startY: number,
  pinSignal: string | undefined
): WireUtilsWire => {
  // Determine wire color based on signal type
  const color = getWireColorFromSignal(pinSignal || '');
  
  return {
    id: `wire-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    sourceComponentId: componentId,
    sourcePinIndex: pinIndex,
    targetComponentId: null,
    targetPinIndex: null,
    points: [{ x: startX, y: startY }],
    color,
    isComplete: false
  };
};

/**
 * Updates a wire with a new point (for when the user is dragging)
 */
export const updateWireEndPoint = (
  wire: WireUtilsWire,
  x: number,
  y: number
): WireUtilsWire => {
  const newPoints = [...wire.points];
  
  // If this is just a move during wire creation, update the last point
  if (newPoints.length === 1 || !wire.isComplete) {
    newPoints[newPoints.length - 1] = { x, y };
  } else {
    // For an existing wire, add a new point
    newPoints.push({ x, y });
  }
  
  return {
    ...wire,
    points: newPoints
  };
};

/**
 * Adds an intermediate point to a wire (for custom routing)
 */
export const addWireIntermediatePoint = (
  wire: WireUtilsWire | Wire,
  x: number,
  y: number
): WireUtilsWire | Wire => {
  if (!wire) return wire;
  
  const newPoints = [...wire.points];
  newPoints.push({ x, y });
  
  return {
    ...wire,
    points: newPoints
  };
};

/**
 * Completes a wire by connecting it to a target pin
 */
export const completeWire = (
  wire: Wire,
  targetComponentId: string,
  targetPinIndex: number,
  finalX: number,
  finalY: number
): Wire => {
  // Ensure the last point exactly matches the target pin position
  const newPoints = [...wire.points];
  newPoints[newPoints.length - 1] = { x: finalX, y: finalY };
  
  return {
    ...wire,
    targetComponentId,
    targetPinIndex,
    points: newPoints,
    isComplete: true
  };
};

/**
 * Adds a new point to an existing wire (for custom routing)
 */
export const addWirePoint = (
  wire: Wire,
  x: number,
  y: number,
  index: number
): Wire => {
  const newPoints = [...wire.points];
  newPoints.splice(index, 0, { x, y });
  
  return {
    ...wire,
    points: newPoints
  };
};

/**
 * Removes a point from a wire (for editing)
 */
export const removeWirePoint = (
  wire: Wire,
  index: number
): Wire => {
  // Don't allow removing the start or end points
  if (index === 0 || index === wire.points.length - 1) {
    return wire;
  }
  
  const newPoints = [...wire.points];
  newPoints.splice(index, 1);
  
  return {
    ...wire,
    points: newPoints
  };
};

/**
 * Checks if a point is near a wire segment
 */
export const isPointNearWire = (
  x: number,
  y: number,
  wire: Wire,
  threshold: number = 5
): boolean => {
  // Check each segment of the wire
  for (let i = 0; i < wire.points.length - 1; i++) {
    const p1 = wire.points[i];
    const p2 = wire.points[i + 1];
    
    // Distance from point to line segment
    const distance = distanceToLineSegment(x, y, p1.x, p1.y, p2.x, p2.y);
    if (distance < threshold) {
      return true;
    }
  }
  
  return false;
};

/**
 * Calculate the distance from a point to a line segment
 */
const distanceToLineSegment = (
  x: number,
  y: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number => {
  const A = x - x1;
  const B = y - y1;
  const C = x2 - x1;
  const D = y2 - y1;
  
  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = -1;
  
  if (lenSq !== 0) {
    param = dot / lenSq;
  }
  
  let xx, yy;
  
  if (param < 0) {
    xx = x1;
    yy = y1;
  } else if (param > 1) {
    xx = x2;
    yy = y2;
  } else {
    xx = x1 + param * C;
    yy = y1 + param * D;
  }
  
  const dx = x - xx;
  const dy = y - yy;
  
  return Math.sqrt(dx * dx + dy * dy);
};

/**
 * Determine wire color based on signal type
 */
export const getWireColorFromSignal = (signal: string): string => {
  const normalizedSignal = signal.toLowerCase().trim();
  
  // Define colors for different signal types
  const signalColors: Record<string, string> = {
    'power': '#FF6384',    // Red
    '+5v': '#FF6384',      // Red (common power)
    '+3.3v': '#FF6384',    // Red (common power)
    'vcc': '#FF6384',      // Red (common power)
    'ground': '#36A2EB',   // Blue
    'gnd': '#36A2EB',      // Blue (common ground)
    'digital': '#4BC0C0',  // Teal
    'analog': '#FFCE56',   // Yellow
    'passive': '#9966FF',  // Purple
    'i2c': '#FF9F40',      // Orange
    'spi': '#C9CBCF',      // Gray
    'uart': '#7CFC00',     // Lime
    'rx': '#FF00FF',       // Magenta 
    'tx': '#00FFFF',       // Cyan
  };
  
  // Check for specific signals first
  for (const [key, color] of Object.entries(signalColors)) {
    if (normalizedSignal.includes(key)) {
      return color;
    }
  }
  
  // Default color for unknown signal types
  return '#4BC0C0'; // Teal
};

/**
 * Find potential pin connections based on proximity
 */
export const findPotentialPinConnections = (
  x: number,
  y: number,
  components: WokwiComponent[],
  activeWire: Wire | null,
  threshold: number = 15
): { componentId: string; pinIndex: number; distance: number } | null => {
  // Don't connect to the source pin
  const sourceComponentId = activeWire?.sourceComponentId;
  const sourcePinIndex = activeWire?.sourcePinIndex;
  
  let closestPin: { componentId: string; pinIndex: number; distance: number } | null = null;
  let minDistance = threshold;
  
  // Check each component
  for (const component of components) {
    if (!component.pins) continue;
    
    // Skip self-connection to the same pin
    if (component.id === sourceComponentId) {
      // Can connect to different pins on the same component
      for (let i = 0; i < component.pins.length; i++) {
        if (i === sourcePinIndex) continue; // Skip source pin
        
        const pin = component.pins[i];
        const pinX = component.left + pin.x;
        const pinY = component.top + pin.y;
        
        const dx = x - pinX;
        const dy = y - pinY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < minDistance) {
          minDistance = distance;
          closestPin = {
            componentId: component.id,
            pinIndex: i,
            distance
          };
        }
      }
    } else {
      // Check pins on other components
      for (let i = 0; i < component.pins.length; i++) {
        const pin = component.pins[i];
        const pinX = component.left + pin.x;
        const pinY = component.top + pin.y;
        
        const dx = x - pinX;
        const dy = y - pinY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < minDistance) {
          minDistance = distance;
          closestPin = {
            componentId: component.id,
            pinIndex: i,
            distance
          };
        }
      }
    }
  }
  
  return closestPin;
};

/**
 * Get absolute position of a pin on the canvas
 */
export const getPinAbsolutePosition = (
  components: WokwiComponent[],
  componentId: string,
  pinIndex: number
): { x: number; y: number } | null => {
  const component = components.find(c => c.id === componentId);
  if (!component || !component.pins || pinIndex >= component.pins.length) {
    return null;
  }
  
  const pin = component.pins[pinIndex];
  return {
    x: component.left + pin.x,
    y: component.top + pin.y
  };
};

/**
 * Get the signal type of a pin
 */
export const getPinSignalType = (
  components: WokwiComponent[],
  componentId: string,
  pinIndex: number
): string | undefined => {
  const component = components.find(c => c.id === componentId);
  if (!component || !component.pins || pinIndex >= component.pins.length) {
    return undefined;
  }
  
  const pin = component.pins[pinIndex];
  return pin.signals && pin.signals.length > 0 ? pin.signals[0] : undefined;
};

/**
 * Check if the user is trying to interact with a pin (click or hover)
 * This helps distinguish between pin interaction and component dragging
 */
export const isInteractingWithPin = (
  x: number, 
  y: number, 
  component: WokwiComponent,
  threshold: number = 12
): { isPin: boolean; pinIndex: number } => {
  if (!component.pins) {
    return { isPin: false, pinIndex: -1 };
  }
  
  for (let i = 0; i < component.pins.length; i++) {
    const pin = component.pins[i];
    const pinX = component.left + pin.x;
    const pinY = component.top + pin.y;
    
    const dx = x - pinX;
    const dy = y - pinY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance < threshold) {
      return { isPin: true, pinIndex: i };
    }
  }
  
  return { isPin: false, pinIndex: -1 };
};
