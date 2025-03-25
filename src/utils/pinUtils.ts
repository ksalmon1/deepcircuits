
import { ComponentPin } from '@/types/database';

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
 * @param x - Pin x coordinate
 * @param y - Pin y coordinate
 * @param existingPins - Array of existing pins
 * @returns New ComponentPin object
 */
export const createNewPin = (
  x: number, 
  y: number, 
  existingPins: ComponentPin[]
): ComponentPin => {
  return {
    name: `pin${existingPins.length + 1}`,
    x,
    y,
    signals: []
  };
};

/**
 * Updates a pin's position
 * @param pins - Array of pins
 * @param pinIndex - Index of the pin to update
 * @param x - New x coordinate
 * @param y - New y coordinate
 * @returns Updated array of pins
 */
export const updatePinPosition = (
  pins: ComponentPin[],
  pinIndex: number,
  x: number,
  y: number
): ComponentPin[] => {
  if (pinIndex < 0 || pinIndex >= pins.length) return pins;
  
  const updatedPins = [...pins];
  updatedPins[pinIndex] = {
    ...updatedPins[pinIndex],
    x,
    y
  };
  
  return updatedPins;
};

/**
 * Updates a pin's properties
 * @param pins - Array of pins
 * @param pinIndex - Index of the pin to update
 * @param name - New pin name
 * @param signals - New pin signals
 * @returns Updated array of pins
 */
export const updatePinProperties = (
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
