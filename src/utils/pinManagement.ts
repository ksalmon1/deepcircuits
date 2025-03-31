
import { ComponentPin, PinConnection, PinWithSignal } from "@/types/pin";
import { CircuitComponent } from "@/types/component";
import { PinError } from "./errorHandling";
import { 
  isPointNearPin as isNearPin,
  createNewPin as createPin, 
  updatePinPosition as updatePosition, 
  updatePinProperties as updateProps, 
  updatePinNameAndSignals as updateNameAndSignals,
  deletePin as removePinFromArray,
  getSignalColor
} from './pinUtils';
import {
  findComponentById,
  getPinByIndex,
  canPinsConnect,
  getWireColorFromSignal
} from './wireUtils';

// Re-export the pin manipulation functions with renamed imports to avoid circular dependencies
export const createNewPin = createPin;
export const updatePinPosition = updatePosition;
export const updatePinProperties = updateProps;
export const updatePinNameAndSignals = updateNameAndSignals;
export const deletePin = removePinFromArray;
export const isPointNearPin = isNearPin;

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
