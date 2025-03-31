
import { ComponentPin, PinConnection, PinWithSignal } from "@/types/pin";
import { CircuitComponent } from "@/types/component";
import { PinError } from "./errorHandling";
import { 
  createNewPin, 
  updatePinPosition, 
  updatePinProperties, 
  updatePinNameAndSignals,
  deletePin 
} from './pinUtils';

// Re-export the pin manipulation functions
export { 
  createNewPin, 
  updatePinPosition, 
  updatePinProperties, 
  updatePinNameAndSignals,
  deletePin 
};

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
 * Find a component in the array by ID
 */
export function findComponentById(
  components: CircuitComponent[], 
  componentId: string
): CircuitComponent | null {
  return components.find(comp => comp.id === componentId) || null;
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
 * Check if a point is near a pin
 */
export function isPointNearPin(
  x: number,
  y: number,
  pinX: number,
  pinY: number,
  threshold = 10
): boolean {
  const distance = Math.sqrt(Math.pow(x - pinX, 2) + Math.pow(y - pinY, 2));
  return distance <= threshold;
}

/**
 * Validate pin connections in a circuit
 */
export function validatePinConnections(
  components: CircuitComponent[],
  connections: PinConnection[]
): string[] {
  const errors: string[] = [];
  
  for (const conn of connections) {
    const sourceComponent = findComponentById(components, conn.sourceId);
    const targetComponent = findComponentById(components, conn.targetId);
    
    if (!sourceComponent) {
      errors.push(`Source component ${conn.sourceId} not found`);
      continue;
    }
    
    if (!targetComponent) {
      errors.push(`Target component ${conn.targetId} not found`);
      continue;
    }
    
    const sourcePin = getPinByIndex(sourceComponent, conn.sourcePinIndex);
    const targetPin = getPinByIndex(targetComponent, conn.targetPinIndex);
    
    if (!sourcePin) {
      errors.push(`Source pin ${conn.sourcePinIndex} not found on component ${conn.sourceId}`);
      continue;
    }
    
    if (!targetPin) {
      errors.push(`Target pin ${conn.targetPinIndex} not found on component ${conn.targetId}`);
      continue;
    }
    
    if (!canPinsConnect(sourcePin, targetPin)) {
      errors.push(`Incompatible signals between ${sourceComponent.name || sourceComponent.type}:${sourcePin.name} and ${targetComponent.name || targetComponent.type}:${targetPin.name}`);
    }
  }
  
  return errors;
}
