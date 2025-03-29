
/**
 * Utility functions for wire color determination
 * (Retained for future wire system implementation)
 */

import { WokwiComponent } from '@/integrations/wokwi/WokwiIntegration';

/**
 * Determine wire color based on signal type
 */
export const getWireColorFromSignal = (signal: string): string => {
  if (!signal) return '#9b87f5'; // Default purple for undefined signals
  
  const normalizedSignal = signal.toLowerCase().trim();
  
  // Define colors for different signal types with more precise coloration
  if (normalizedSignal.includes('power') || 
      normalizedSignal.includes('+5v') || 
      normalizedSignal.includes('+3.3v') || 
      normalizedSignal.includes('vcc')) {
    return '#FF6384'; // Red for power signals
  }
  
  if (normalizedSignal.includes('ground') || normalizedSignal.includes('gnd')) {
    return '#36A2EB'; // Blue for ground signals
  }
  
  if (normalizedSignal.includes('analog')) {
    return '#FFCE56'; // Yellow for analog signals
  }
  
  if (normalizedSignal.includes('i2c')) {
    return '#9966FF'; // Purple for I2C signals
  }
  
  if (normalizedSignal.includes('spi')) {
    return '#4BC0C0'; // Teal for SPI signals
  }
  
  if (normalizedSignal.includes('uart') || 
      normalizedSignal.includes('rx') || 
      normalizedSignal.includes('tx')) {
    return '#7CFC00'; // Bright green for UART/serial signals
  }
  
  if (normalizedSignal.includes('digital')) {
    return '#FF9F40'; // Orange for digital signals
  }
  
  if (normalizedSignal.includes('pwm')) {
    return '#FF73B3'; // Pink for PWM signals
  }
  
  // Default color for unknown signal types
  return '#9b87f5'; // Default purple
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
