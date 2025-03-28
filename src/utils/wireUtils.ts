
/**
 * Utility functions for wire creation, rendering, and management
 */

import { WokwiComponent } from '@/integrations/wokwi/WokwiIntegration';
import { GetBezierPathParams } from '@xyflow/react';

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
    'digital': '#9b87f5',  // Primary Purple
    'analog': '#F97316',   // Bright Orange
    'passive': '#7E69AB',  // Secondary Purple
    'i2c': '#6E59A5',      // Tertiary Purple
    'spi': '#C9CBCF',      // Gray
    'uart': '#0EA5E9',     // Ocean Blue
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
  return '#9b87f5'; // Primary Purple
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
 * Gets bezier path parameters with optional control point
 */
export const getBezierParams = (
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  sourcePosition: Position,
  targetPosition: Position,
  controlPoint?: { x: number, y: number }
): GetBezierPathParams => {
  const params: GetBezierPathParams = {
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    curvature: 0.25
  };
  
  return params;
};
