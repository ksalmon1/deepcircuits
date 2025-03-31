
import { WokwiPin } from '@/integrations/wokwi/WokwiIntegration';
import { getComponentPinInfo } from '@/integrations/wokwi/WokwiIntegration';
import { getCustomComponent } from '@/integrations/custom/CustomComponents';

/**
 * Function to fetch component pins from various sources
 */
export const fetchComponentPins = (type: string, pinCache: Record<string, WokwiPin[]> = {}): WokwiPin[] => {
  try {
    // First check if pins are in the cache
    if (pinCache[type]) {
      console.log(`Using cached pins for ${type}:`, pinCache[type]);
      return pinCache[type];
    }
    
    // Check if it's a custom component
    if (type.startsWith('custom')) {
      console.log(`Fetching pins for custom component: ${type}`);
      const customComponent = getCustomComponent(type);
      if (customComponent && customComponent.pins) {
        pinCache[type] = customComponent.pins;
        return customComponent.pins;
      }
    }
    
    // Otherwise fallback to default Wokwi pin information
    console.log(`Fetching default pins for ${type}`);
    const defaultPins = getComponentPinInfo(type);
    pinCache[type] = defaultPins;
    return defaultPins;
  } catch (err) {
    console.error(`Error fetching pins for ${type}:`, err);
    return getComponentPinInfo(type);
  }
};

/**
 * Validate if a component has all required properties
 */
export const validateComponentProperties = (type: string, properties: Record<string, any>): boolean => {
  // Define required properties for different component types
  const requiredProps: Record<string, string[]> = {
    'wokwi-led': ['color'],
    'wokwi-resistor': ['resistance'],
    'wokwi-potentiometer': ['value'],
    'wokwi-lcd1602': ['cols', 'rows']
  };
  
  if (type in requiredProps) {
    const missingProps = requiredProps[type].filter(prop => !(prop in properties));
    if (missingProps.length > 0) {
      console.warn(`Component ${type} is missing required properties: ${missingProps.join(', ')}`);
      return false;
    }
  }
  
  return true;
};

/**
 * Generate a unique ID for a component
 */
export const generateComponentId = (type: string): string => {
  return `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Get default properties for a component type
 */
export const getDefaultProperties = (type: string): Record<string, any> => {
  const defaults: Record<string, Record<string, any>> = {
    'wokwi-led': { color: 'red' },
    'wokwi-resistor': { resistance: '1000' },
    'wokwi-potentiometer': { value: '50' },
    'wokwi-lcd1602': { cols: 16, rows: 2 },
    'wokwi-buzzer': { frequency: 2000 },
    'wokwi-push-button': { color: 'red', label: '' },
    'wokwi-servo': { horn: 'single' }
  };
  
  return type in defaults ? defaults[type] : {};
};
