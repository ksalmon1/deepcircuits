
import { ComponentLibraryItem, CircuitComponent } from "@/types/component";
import { ComponentPin } from "@/types/pin";

/**
 * Validate a component library item
 * @returns Array of validation errors, empty if valid
 */
export function validateComponentLibraryItem(component: ComponentLibraryItem): string[] {
  const errors: string[] = [];
  
  if (!component.name || component.name.trim() === '') {
    errors.push('Component name is required');
  }
  
  if (!component.type || component.type.trim() === '') {
    errors.push('Component type is required');
  }
  
  if (!component.category || component.category.trim() === '') {
    errors.push('Component category is required');
  }
  
  return errors;
}

/**
 * Validate a circuit component
 * @returns Array of validation errors, empty if valid
 */
export function validateCircuitComponent(component: CircuitComponent): string[] {
  const errors: string[] = [];
  
  if (!component.id) {
    errors.push('Component ID is required');
  }
  
  if (!component.type || component.type.trim() === '') {
    errors.push('Component type is required');
  }
  
  if (typeof component.top !== 'number') {
    errors.push('Component top position must be a number');
  }
  
  if (typeof component.left !== 'number') {
    errors.push('Component left position must be a number');
  }
  
  return errors;
}

/**
 * Validate component pins
 * @returns Array of validation errors, empty if valid
 */
export function validateComponentPins(pins: ComponentPin[]): string[] {
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
  });
  
  // Check for duplicate pin names
  const pinNames = pins.map(p => p.name);
  const uniquePinNames = new Set(pinNames);
  
  if (pinNames.length !== uniquePinNames.size) {
    errors.push('Component has duplicate pin names');
  }
  
  return errors;
}

/**
 * Get default attributes for a component type
 */
export function getDefaultAttributes(componentType: string): Record<string, any> {
  switch (componentType) {
    case 'arduino-uno':
      return { frequency: 16 };
    case 'led':
      return { color: 'red', brightness: 100 };
    case 'resistor':
      return { resistance: 1000, tolerance: 5 };
    case 'capacitor':
      return { capacitance: 100, unit: 'μF' };
    case 'button':
    case 'switch':
      return { state: 'off' };
    default:
      return {};
  }
}

/**
 * Calculate component bounding box
 */
export function getComponentBoundingBox(component: CircuitComponent): { width: number; height: number } {
  // Default dimensions if no better info available
  let width = 100;
  let height = 100;
  
  // If pins are available, calculate based on pin positions
  if (component.pins && component.pins.length > 0) {
    const xCoords = component.pins.map(pin => pin.x);
    const yCoords = component.pins.map(pin => pin.y);
    
    const minX = Math.min(...xCoords);
    const maxX = Math.max(...xCoords);
    const minY = Math.min(...yCoords);
    const maxY = Math.max(...yCoords);
    
    // Add some padding around pins
    width = maxX - minX + 40;
    height = maxY - minY + 40;
  }
  
  // Special case handling for known component types
  switch (component.type) {
    case 'arduino-uno':
      return { width: 175, height: 120 };
    case 'led':
      return { width: 30, height: 40 };
    case 'resistor':
      return { width: 80, height: 30 };
  }
  
  return { width, height };
}
