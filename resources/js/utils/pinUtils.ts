import { ComponentPin, SIGNAL_COLOR_MAP } from '@/types/pin';

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
  
  return {
    id: `pin-${crypto.randomUUID().slice(0, 8)}`,
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
 * Get a color based on signal type
 * @param signal - Signal type as string
 * @returns Color hex code
 */
export const getSignalColor = (signal?: string): string => {
  if (!signal) return '#4BC0C0'; // Default to teal if no signal

  return SIGNAL_COLOR_MAP[signal.toLowerCase()] || '#9b87f5'; // Default to purple if unknown signal
};

/**
 * The identity of a pin for wiring and simulation: the stable handle_id from
 * the component library when present, otherwise the pin's position index.
 * Wire endpoints (React Flow handles) and the SPICE pin->node mapping must
 * both resolve pins through this so they always agree.
 * @param pin - The pin (may lack handle_id for admin-created components)
 * @param index - The pin's index within its component
 * @returns The handle id string, e.g. 'pin-0'
 */
export const pinHandleId = (pin: { handle_id?: string }, index: number): string =>
  pin.handle_id || `pin-${index}`;

/**
 * Ensures every pin has an id and a signals array, preserving all other fields
 * @param pins - Possibly missing/partial pins from the DB or a flow node
 * @returns Normalized array of pins
 */
export const normalizePins = (pins?: ComponentPin[] | null): ComponentPin[] =>
  (pins || []).map(pin => ({
    id: pin.id || `pin-${crypto.randomUUID().slice(0, 8)}`,
    name: pin.name,
    x: pin.x,
    y: pin.y,
    type: pin.type,
    spiceNodeNumber: pin.spiceNodeNumber,
    signals: pin.signals || [],
    handle_id: pin.handle_id
  }));
