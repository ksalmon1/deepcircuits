
import { CircuitComponent } from '@/types/component';
import { ComponentPin } from '@/types/pin';
import { findComponentById, getPinByIndex, canPinsConnect } from '@/utils/pinManagement';

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
