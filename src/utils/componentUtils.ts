import { CircuitComponent, ComponentLibraryItem } from '@/types/component';
import { ComponentPin } from '@/types/pin';
import componentRegistry from '@/integrations/components/registry';
import { ComponentError } from './errorHandling';

/**
 * Get component pins with default values for missing fields
 */
export function normalizePins(pins: ComponentPin[] = []): ComponentPin[] {
  return pins.map(pin => ({
    name: pin.name || 'unnamed',
    x: typeof pin.x === 'number' ? pin.x : 0,
    y: typeof pin.y === 'number' ? pin.y : 0,
    signals: Array.isArray(pin.signals) ? pin.signals : []
  }));
}

/**
 * Get the display name for a component
 */
export function getComponentDisplayName(component: CircuitComponent | ComponentLibraryItem): string {
  if ('name' in component && component.name) {
    return component.name;
  }
  
  // For circuit components without a name, use the type
  return component.type.replace(/-/g, ' ');
}

/**
 * Get the pin positions for a component type
 */
export function getComponentPinPositions(componentType: string): ComponentPin[] {
  return componentRegistry.getComponentPinInfo(componentType);
}

/**
 * Generate a unique ID for a component
 */
export function generateComponentId(type: string): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `${type}-${timestamp}-${random}`;
}

/**
 * Create a new circuit component
 */
export function createCircuitComponent(
  type: string,
  position: { left: number; top: number },
  attributes: Record<string, any> = {},
  svgPath?: string | null,
  isOriginal?: boolean
): CircuitComponent {
  if (!type) {
    throw new ComponentError('Component type is required', 'COMPONENT_INVALID_TYPE');
  }
  
  // Get pins from registry
  const pins = componentRegistry.getComponentPinInfo(type);
  
  return {
    id: generateComponentId(type),
    type,
    top: position.top,
    left: position.left,
    attributes,
    pins: normalizePins(pins),
    svgPath,
    isOriginal
  };
}

/**
 * Check if a point is inside a component
 */
export function isPointInComponent(
  point: { x: number; y: number },
  component: CircuitComponent,
  padding: number = 10
): boolean {
  // For simplicity, assume components are rectangles
  const left = component.left - padding;
  const top = component.top - padding;
  
  // Estimate width and height based on component type
  // This is a simplification - for real applications, you'd want to use actual dimensions
  let width = 100;
  let height = 100;
  
  switch (component.type) {
    case 'arduino-uno':
      width = 175;
      height = 120;
      break;
    case 'led':
      width = 30;
      height = 40;
      break;
    case 'resistor':
      width = 80;
      height = 30;
      break;
    default:
      // Default dimensions
      width = 100;
      height = 100;
  }
  
  return (
    point.x >= left &&
    point.x <= left + width + padding * 2 &&
    point.y >= top &&
    point.y <= top + height + padding * 2
  );
}

/**
 * Find the closest pin to a point
 */
export function findClosestPin(
  point: { x: number; y: number },
  component: CircuitComponent,
  maxDistance: number = 20
): { pin: ComponentPin; distance: number; pinIndex: number } | null {
  if (!component.pins || component.pins.length === 0) {
    return null;
  }
  
  let closestPin: ComponentPin | null = null;
  let closestDistance = Infinity;
  let closestPinIndex = -1;
  
  component.pins.forEach((pin, index) => {
    const pinX = component.left + pin.x;
    const pinY = component.top + pin.y;
    
    const dx = point.x - pinX;
    const dy = point.y - pinY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance < closestDistance) {
      closestDistance = distance;
      closestPin = pin;
      closestPinIndex = index;
    }
  });
  
  if (closestPin && closestDistance <= maxDistance) {
    return {
      pin: closestPin,
      distance: closestDistance,
      pinIndex: closestPinIndex
    };
  }
  
  return null;
}

/**
 * Clone a component
 */
export function cloneComponent(component: CircuitComponent, newPosition?: { left: number; top: number }): CircuitComponent {
  return {
    ...component,
    id: generateComponentId(component.type),
    left: newPosition?.left ?? component.left + 20, // Offset slightly if no position provided
    top: newPosition?.top ?? component.top + 20,
    pins: [...(component.pins || [])]
  };
}
