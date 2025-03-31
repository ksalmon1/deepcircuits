
import { ComponentPin } from '@/types/pin';

/**
 * Checks if a point is within a specified distance of a pin
 * @param x1 - Point x coordinate
 * @param y1 - Point y coordinate
 * @param x2 - Pin x coordinate
 * @param y2 - Pin y coordinate
 * @param threshold - Distance threshold
 * @returns Boolean indicating if the point is near the pin
 */
export const isPointNearPin = (
  x1: number, 
  y1: number, 
  x2: number, 
  y2: number, 
  threshold: number = 10
): boolean => {
  const dx = x1 - x2;
  const dy = y1 - y2;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return distance < threshold;
};

/**
 * Creates a new pin at the specified coordinates
 * @param x - Pin x coordinate (relative to component origin)
 * @param y - Pin y coordinate (relative to component origin)
 * @param existingPins - Array of existing pins
 * @returns New ComponentPin object
 */
export const createNewPin = (
  x: number, 
  y: number, 
  existingPins: ComponentPin[]
): ComponentPin => {
  // Round coordinates to nearest integers for easier positioning
  const roundedX = Math.round(x);
  const roundedY = Math.round(y);
  
  console.log(`Creating new pin at (${roundedX}, ${roundedY}) relative to component origin`);
  
  return {
    name: `pin${existingPins.length + 1}`,
    x: roundedX,
    y: roundedY,
    signals: []
  };
};

/**
 * Updates a pin's position
 * @param pins - Array of pins
 * @param pinIndex - Index of the pin to update
 * @param x - New x coordinate (relative to component origin)
 * @param y - New y coordinate (relative to component origin)
 * @returns Updated array of pins
 */
export const updatePinPosition = (
  pins: ComponentPin[],
  pinIndex: number,
  x: number,
  y: number
): ComponentPin[] => {
  if (pinIndex < 0 || pinIndex >= pins.length) return pins;
  
  // Round coordinates to nearest integers for easier positioning
  const roundedX = Math.round(x);
  const roundedY = Math.round(y);
  
  const updatedPins = [...pins];
  updatedPins[pinIndex] = {
    ...updatedPins[pinIndex],
    x: roundedX,
    y: roundedY
  };
  
  console.log(`Updated pin ${pinIndex} position to (${roundedX}, ${roundedY}) relative to component origin`);
  
  return updatedPins;
};

/**
 * Updates a pin's properties
 * @param pins - Array of pins
 * @param pinIndex - Index of the pin to update
 * @param props - Properties to update
 * @returns Updated array of pins
 */
export const updatePinProperties = (
  pins: ComponentPin[],
  pinIndex: number,
  props: Partial<ComponentPin>
): ComponentPin[] => {
  if (pinIndex < 0 || pinIndex >= pins.length) return pins;
  
  const updatedPins = [...pins];
  updatedPins[pinIndex] = {
    ...updatedPins[pinIndex],
    ...props
  };
  
  return updatedPins;
};

/**
 * Updates a pin's name and signals
 * @param pins - Array of pins
 * @param pinIndex - Index of the pin to update
 * @param name - New pin name
 * @param signals - New pin signals as comma-separated string
 * @returns Updated array of pins
 */
export const updatePinNameAndSignals = (
  pins: ComponentPin[],
  pinIndex: number,
  name: string,
  signals: string
): ComponentPin[] => {
  if (pinIndex < 0 || pinIndex >= pins.length) return pins;
  
  const updatedPins = [...pins];
  updatedPins[pinIndex] = {
    ...updatedPins[pinIndex],
    name,
    signals: signals.split(',').map(s => s.trim()).filter(s => s)
  };
  
  return updatedPins;
};

/**
 * Deletes a pin from the array
 * @param pins - Array of pins
 * @param pinIndex - Index of the pin to delete
 * @returns Updated array of pins
 */
export const deletePin = (
  pins: ComponentPin[],
  pinIndex: number
): ComponentPin[] => {
  if (pinIndex < 0 || pinIndex >= pins.length) return pins;
  
  const updatedPins = [...pins];
  updatedPins.splice(pinIndex, 1);
  
  return updatedPins;
};

/**
 * Get signal color based on signal type
 * @param signalType - The type of signal
 * @returns Color hex code for the signal
 */
export const getSignalColor = (signalType: string): string => {
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
};

/**
 * Validates pins array to ensure all required properties
 * @param pins - Array of pins to validate
 * @returns Array of validation errors
 */
export const validatePins = (pins: ComponentPin[]): string[] => {
  const errors: string[] = [];
  
  if (!Array.isArray(pins)) {
    return ['Pins must be an array'];
  }
  
  pins.forEach((pin, index) => {
    if (!pin.name || pin.name.trim() === '') {
      errors.push(`Pin at index ${index} must have a name`);
    }
    
    if (typeof pin.x !== 'number') {
      errors.push(`Pin "${pin.name}" must have a numeric x coordinate`);
    }
    
    if (typeof pin.y !== 'number') {
      errors.push(`Pin "${pin.name}" must have a numeric y coordinate`);
    }
    
    if (!Array.isArray(pin.signals)) {
      errors.push(`Pin "${pin.name}" signals must be an array`);
    }
  });
  
  // Check for duplicate pin names
  const pinNames = pins.map(p => p.name);
  const uniquePinNames = new Set(pinNames);
  
  if (pinNames.length !== uniquePinNames.size) {
    errors.push('Component has duplicate pin names');
  }
  
  return errors;
};
