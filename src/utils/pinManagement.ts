
import { ComponentPin, PinSignalType, SIGNAL_COLOR_MAP } from "@/types/pin";
import { CircuitComponent } from "@/types/component";

/**
 * Checks if a point is near a pin (for interaction detection)
 */
export const isPointNearPin = (
  x: number, 
  y: number, 
  pinX: number, 
  pinY: number, 
  threshold = 10
): boolean => {
  const distance = Math.sqrt(Math.pow(x - pinX, 2) + Math.pow(y - pinY, 2));
  return distance <= threshold;
};

/**
 * Creates a new pin with default values
 */
export const createNewPin = (
  x: number, 
  y: number, 
  existingPins: ComponentPin[]
): ComponentPin => {
  const newPinNumber = existingPins.length + 1;
  
  return {
    name: `Pin ${newPinNumber}`,
    x: Math.round(x),
    y: Math.round(y),
    signals: [PinSignalType.DIGITAL]
  };
};

/**
 * Updates a pin's position
 */
export const updatePinPosition = (
  pins: ComponentPin[], 
  pinIndex: number, 
  x: number, 
  y: number
): ComponentPin[] => {
  if (pinIndex < 0 || pinIndex >= pins.length) {
    return pins;
  }
  
  const updatedPins = [...pins];
  updatedPins[pinIndex] = {
    ...updatedPins[pinIndex],
    x: Math.round(x),
    y: Math.round(y)
  };
  
  return updatedPins;
};

/**
 * Updates a pin's properties
 */
export const updatePinProperties = (
  pins: ComponentPin[], 
  pinIndex: number, 
  properties: Partial<ComponentPin>
): ComponentPin[] => {
  if (pinIndex < 0 || pinIndex >= pins.length) {
    return pins;
  }
  
  const updatedPins = [...pins];
  updatedPins[pinIndex] = {
    ...updatedPins[pinIndex],
    ...properties
  };
  
  return updatedPins;
};

/**
 * Deletes a pin
 */
export const deletePin = (
  pins: ComponentPin[], 
  pinIndex: number
): ComponentPin[] => {
  if (pinIndex < 0 || pinIndex >= pins.length) {
    return pins;
  }
  
  return pins.filter((_, i) => i !== pinIndex);
};

/**
 * Get the signal type of a pin
 */
export const getPinSignalType = (
  components: CircuitComponent[], 
  componentId: string, 
  pinIndex: number
): string | null => {
  const component = components.find(comp => comp.id === componentId);
  if (!component || !component.pins || pinIndex >= component.pins.length) {
    return null;
  }
  
  const pin = component.pins[pinIndex];
  return pin.signals && pin.signals.length > 0 ? pin.signals[0] : null;
};

/**
 * Get wire color based on signal type
 */
export const getWireColorFromSignal = (signal: string): string => {
  if (!signal) return SIGNAL_COLOR_MAP[PinSignalType.OTHER];
  
  const lowerSignal = signal.toLowerCase();
  
  // Direct match in our map
  if (SIGNAL_COLOR_MAP[lowerSignal]) {
    return SIGNAL_COLOR_MAP[lowerSignal];
  }
  
  // Check for partial matches
  for (const [key, color] of Object.entries(SIGNAL_COLOR_MAP)) {
    if (lowerSignal.includes(key)) {
      return color;
    }
  }
  
  // Default color if no match
  return SIGNAL_COLOR_MAP[PinSignalType.OTHER];
};
