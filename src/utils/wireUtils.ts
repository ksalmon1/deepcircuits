
/**
 * Utility functions for wire color determination
 * (Retained for future wire system implementation)
 */

import { WokwiComponent } from '@/integrations/wokwi/WokwiIntegration';

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
