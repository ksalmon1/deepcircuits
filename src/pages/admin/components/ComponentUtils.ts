/**
 * Utility functions for working with component library
 */

/**
 * Gets a display name from component type
 */
export const getDisplayNameFromType = (type: string): string => {
  return type
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Determines the component category from its type
 */
export const getCategoryFromType = (type: string): string => {
  const categoryMap: Record<string, string> = {
    'led': 'output',
    'resistor': 'passive',
    'capacitor': 'passive',
    'battery': 'power',
    'breadboard': 'base',
    'arduino': 'microcontroller',
    'esp32': 'microcontroller',
    'raspberry-pi': 'microcontroller',
    'microbit': 'microcontroller',
    'attiny': 'microcontroller',
    'pushbutton': 'input',
    'slide-switch': 'input',
    'potentiometer': 'input',
    'buzzer': 'output',
    'servo': 'output',
    'stepper': 'output',
    'lcd': 'display',
    'segment': 'display',
    'matrix': 'display',
    'keypad': 'input',
    'relay': 'output',
    'ir': 'sensor',
    'dht22': 'sensor',
    'bme280': 'sensor',
    'ultrasonic': 'sensor',
    'photoresistor': 'sensor',
    'temperature': 'sensor',
    'hall': 'sensor',
    'pir': 'sensor',
    'gas': 'sensor',
    'analog-joystick': 'input',
  };
  
  for (const [keyword, category] of Object.entries(categoryMap)) {
    if (type.includes(keyword)) {
      return category;
    }
  }
  
  return 'other';
};

/**
 * Gets default properties for a specific component type
 */
export const getDefaultPropertiesForType = (type: string): Record<string, any> => {
  return {};
};

// Signal types for pins
export const signalTypes = [
  "power", "ground", "digital", "analog", "passive", "i2c", "spi", "uart", "rx", "tx"
];

// Define a uniqueCategories array for the filter dropdown
export const uniqueCategories = [
  'input', 'output', 'passive', 'microcontroller', 'sensor', 'display', 'power', 'base', 'other'
];
