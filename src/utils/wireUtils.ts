
/**
 * Utility functions for wire creation, rendering, and management
 */

import { WokwiPin } from '@/integrations/wokwi/WokwiIntegration';
import { WokwiComponent } from '@/integrations/wokwi/WokwiIntegration';
import { Wire } from '@/hooks/useWireSystem';

/**
 * Creates a new wire starting from a component pin
 */
export const createWire = (
  componentId: string,
  pinIndex: number,
  startX: number,
  startY: number,
  pinSignal: string | undefined
): Wire => {
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
  wire: Wire,
  x: number,
  y: number
): Wire => {
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
 * Creates smart auto-routed wire points between two positions
 * This creates a neater, more professional looking connection
 */
export const createAutoRoutedPoints = (
  startX: number, 
  startY: number, 
  endX: number, 
  endY: number,
  gridSize: number = 25
): { x: number; y: number }[] => {
  const points = [{ x: startX, y: startY }];
  
  // Minimum distance to create intermediate points
  const MIN_DISTANCE = gridSize * 2;
  
  // Calculate distance between points
  const dx = endX - startX;
  const dy = endY - startY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  if (distance > MIN_DISTANCE) {
    // Determine if we should route horizontally first or vertically first
    // based on which distance is greater
    const routeHorizontallyFirst = Math.abs(dx) > Math.abs(dy);
    
    if (routeHorizontallyFirst) {
      // Add midpoint horizontally aligned with start, vertically aligned with end
      const midX = startX + dx * 0.5;
      points.push({ x: midX, y: startY });
      points.push({ x: midX, y: endY });
    } else {
      // Add midpoint vertically aligned with start, horizontally aligned with end
      const midY = startY + dy * 0.5;
      points.push({ x: startX, y: midY });
      points.push({ x: endX, y: midY });
    }
  }
  
  // Add the endpoint
  points.push({ x: endX, y: endY });
  
  return points;
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
 * Get pin signal type
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
