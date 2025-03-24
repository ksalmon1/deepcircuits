import '@wokwi/elements';

// Track whether we've seen the components load successfully
let componentsLoadedSuccessfully = false;

// Function to check if wokwi-elements are loaded
export const isWokwiLoaded = (): boolean => {
  try {
    // Check if the components are actually available in the registry
    const componentsRegistered = 
      typeof window !== 'undefined' && 
      window.customElements && 
      !!window.customElements.get('wokwi-led');
    
    if (componentsRegistered && !componentsLoadedSuccessfully) {
      console.log('✅ Wokwi components loaded successfully');
      componentsLoadedSuccessfully = true;
    }
    
    return componentsRegistered;
  } catch (error) {
    console.error('Error checking if Wokwi is loaded:', error);
    return false;
  }
};

// Load wokwi elements - now simplified since we're importing the package directly
export const forceLoadWokwiElements = async (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (isWokwiLoaded()) {
      resolve(true);
      return;
    }

    // Give a little time for custom elements to register (if they haven't already)
    setTimeout(() => {
      const loaded = isWokwiLoaded();
      resolve(loaded);
      if (!loaded) {
        console.error('Failed to load Wokwi components');
      }
    }, 500);
  });
};

// Type definition for wokwi element properties
export interface WokwiElementProps {
  [key: string]: string | number | boolean;
}

export interface WokwiPin {
  name: string;
  x: number;
  y: number;
  signals: string[];
}

export interface WokwiComponent {
  type: string;
  id: string;
  top: number;
  left: number;
  attributes: WokwiElementProps;
  pins?: WokwiPin[];
  isOriginal?: boolean; // Flag to indicate if this is an original Wokwi component
}

// Function to render a wokwi element with given properties
export const renderWokwiElement = (
  type: string, 
  elementId: string, 
  props: WokwiElementProps,
  showPins: boolean = false
): void => {
  if (!isWokwiLoaded()) {
    console.error('Wokwi elements are not loaded yet');
    return;
  }

  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with id ${elementId} not found`);
    return;
  }

  // Clear existing content
  element.innerHTML = '';
  
  // Create the wokwi element
  const wokwiElement = document.createElement(type);
  
  // Set all properties
  Object.entries(props).forEach(([key, value]) => {
    wokwiElement.setAttribute(key, String(value));
  });
  
  // If showPins is enabled, wrap in wokwi-show-pins element
  if (showPins) {
    const pinsElement = document.createElement('wokwi-show-pins');
    pinsElement.appendChild(wokwiElement);
    element.appendChild(pinsElement);
  } else {
    element.appendChild(wokwiElement);
  }
};

// List of official Wokwi component types
export const ORIGINAL_WOKWI_COMPONENTS = [
  'wokwi-led',
  'wokwi-resistor',
  'wokwi-capacitor',
  'wokwi-battery',
  'wokwi-arduino-uno',
  'wokwi-arduino-nano',
  'wokwi-arduino-mega',
  'wokwi-arduino-mkr1000',
  'wokwi-arduino-nano-33-ble-sense',
  'wokwi-esp32-devkit-v1',
  'wokwi-raspberry-pi-pico',
  'wokwi-microbit',
  'wokwi-attiny85',
  'wokwi-pushbutton',
  'wokwi-slide-switch',
  'wokwi-potentiometer',
  'wokwi-potentiometer-slide',
  'wokwi-buzzer',
  'wokwi-buzzer-passive',
  'wokwi-servo',
  'wokwi-servo-sg90',
  'wokwi-lcd1602',
  'wokwi-2x16-lcd-pcf8574',
  'wokwi-7segment',
  'wokwi-membrane-keypad',
  'wokwi-keypad',
  'wokwi-stepper-motor',
  'wokwi-relay',
  'wokwi-ir-remote',
  'wokwi-ir-receiver',
  'wokwi-dht22',
  'wokwi-bme280',
  'wokwi-logic-analyzer',
  'wokwi-neopixel',
  'wokwi-led-bar-graph',
  'wokwi-led-matrix',
  'wokwi-led-ring',
  'wokwi-piezo',
  'wokwi-ultrasonic-distance-sensor',
  'wokwi-hc-sr04',
  'wokwi-rgb-led',
  'wokwi-timer-ic',
  'wokwi-photoresistor-sensor',
  'wokwi-temperature-sensor',
  'wokwi-hall-effect-sensor',
  'wokwi-ds1307',
  'wokwi-rtc-ds1307',
  'wokwi-ds18b20',
  'wokwi-breadboard',
  'wokwi-mpu6050',
  'wokwi-ssd1306',
  'wokwi-max7219-matrix',
  'wokwi-pir-motion-sensor',
  'wokwi-gas-sensor',
  'wokwi-microsd-card',
  'wokwi-ht16k33',
  'wokwi-tca9548a',
  'wokwi-analog-joystick',
  'wokwi-ttp223',
  'wokwi-ili9341',
  'wokwi-st7789',
  'wokwi-ssd1351',
  'wokwi-level-shifter',
  'wokwi-display-spi',
  'wokwi-oled-spi',
  'wokwi-braille-display',
  'wokwi-fsr'
];

// Check if a component type is an original Wokwi component
export const isOriginalWokwiComponent = (type: string): boolean => {
  return ORIGINAL_WOKWI_COMPONENTS.includes(type);
};

// Get information about pins for a specific component type
export const getComponentPinInfo = (componentType: string): WokwiPin[] => {
  // If we have specific pin mapping for this component type, return it
  if (pinMappings[componentType]) {
    return pinMappings[componentType];
  }
  
  // For components without explicit mappings, try to generate default pins
  // based on component type patterns
  if (componentType.includes('led')) {
    return [
      { name: 'A', x: 0, y: 0, signals: ['power'] },
      { name: 'C', x: 0, y: 20, signals: ['ground'] }
    ];
  } else if (componentType.includes('resistor') || componentType.includes('capacitor')) {
    return [
      { name: '1', x: 0, y: 0, signals: ['passive'] },
      { name: '2', x: 0, y: 20, signals: ['passive'] }
    ];
  } else if (componentType.includes('button') || componentType.includes('switch')) {
    return [
      { name: '1', x: -10, y: 0, signals: ['passive'] },
      { name: '2', x: 10, y: 0, signals: ['passive'] },
      { name: '3', x: -10, y: 20, signals: ['passive'] },
      { name: '4', x: 10, y: 20, signals: ['passive'] }
    ];
  } else if (componentType.includes('sensor')) {
    return [
      { name: 'VCC', x: -10, y: 0, signals: ['power'] },
      { name: 'GND', x: 10, y: 0, signals: ['ground'] },
      { name: 'SIG', x: 0, y: 0, signals: ['digital'] }
    ];
  }
  
  // Return at least 2 generic pins if we don't have specific mapping
  return [
    { name: 'P1', x: 0, y: 0, signals: ['digital'] },
    { name: 'P2', x: 0, y: 20, signals: ['digital'] }
  ];
};

// Define the pin mappings for known component types
const pinMappings: Record<string, WokwiPin[]> = {
  'wokwi-led': [
    { name: 'A', x: 0, y: 0, signals: ['power'] },
    { name: 'C', x: 0, y: 20, signals: ['ground'] }
  ],
  'wokwi-resistor': [
    { name: '1', x: 0, y: 0, signals: ['passive'] },
    { name: '2', x: 0, y: 20, signals: ['passive'] }
  ],
  'wokwi-capacitor': [
    { name: '1', x: 0, y: 0, signals: ['passive'] },
    { name: '2', x: 0, y: 20, signals: ['passive'] }
  ],
  'wokwi-battery': [
    { name: '+', x: 0, y: 0, signals: ['power'] },
    { name: '-', x: 0, y: 20, signals: ['ground'] }
  ],
  'wokwi-arduino-uno': [
    { name: 'D0/RX', x: -75, y: -5, signals: ['digital', 'rx'] },
    { name: 'D1/TX', x: -75, y: 5, signals: ['digital', 'tx'] },
    { name: 'D2', x: -75, y: 15, signals: ['digital'] },
    { name: 'D3', x: -75, y: 25, signals: ['digital', 'pwm'] },
    { name: 'D4', x: -75, y: 35, signals: ['digital'] },
    { name: 'D5', x: -75, y: 45, signals: ['digital', 'pwm'] },
    { name: 'D6', x: -75, y: 55, signals: ['digital', 'pwm'] },
    { name: 'D7', x: -75, y: 65, signals: ['digital'] },
    { name: 'D8', x: -75, y: 75, signals: ['digital'] },
    { name: 'D9', x: -75, y: 85, signals: ['digital', 'pwm'] },
    { name: 'D10', x: -75, y: 95, signals: ['digital', 'pwm', 'spi'] },
    { name: 'D11', x: -75, y: 105, signals: ['digital', 'pwm', 'spi'] },
    { name: 'D12', x: -75, y: 115, signals: ['digital', 'spi'] },
    { name: 'D13', x: -75, y: 125, signals: ['digital', 'spi'] },
    { name: 'A0', x: 75, y: -5, signals: ['analog'] },
    { name: 'A1', x: 75, y: 5, signals: ['analog'] },
    { name: 'A2', x: 75, y: 15, signals: ['analog'] },
    { name: 'A3', x: 75, y: 25, signals: ['analog'] },
    { name: 'A4', x: 75, y: 35, signals: ['analog', 'i2c'] },
    { name: 'A5', x: 75, y: 45, signals: ['analog', 'i2c'] },
    { name: '5V', x: 75, y: 65, signals: ['power'] },
    { name: 'GND', x: 75, y: 75, signals: ['ground'] },
    { name: 'GND.2', x: 75, y: 85, signals: ['ground'] },
    { name: 'VIN', x: 75, y: 95, signals: ['power'] },
  ],
  'wokwi-esp32-devkit-v1': [
    { name: '3V3', x: -60, y: -5, signals: ['power'] },
    { name: 'GND', x: -60, y: 5, signals: ['ground'] },
    { name: 'D15', x: -60, y: 15, signals: ['digital'] },
    { name: 'D2', x: -60, y: 25, signals: ['digital'] },
    { name: 'D4', x: -60, y: 35, signals: ['digital'] },
    { name: 'D16', x: -60, y: 45, signals: ['digital', 'rx'] },
    { name: 'D17', x: -60, y: 55, signals: ['digital', 'tx'] },
    { name: 'D5', x: -60, y: 65, signals: ['digital'] },
    { name: 'D18', x: -60, y: 75, signals: ['digital'] },
    { name: 'D19', x: -60, y: 85, signals: ['digital'] },
    { name: 'D21', x: -60, y: 95, signals: ['digital', 'i2c'] },
    { name: 'D22', x: -60, y: 105, signals: ['digital'] },
    { name: 'D23', x: -60, y: 115, signals: ['digital'] },
    { name: 'VIN', x: -60, y: 125, signals: ['power'] },
    { name: 'D13', x: 60, y: -5, signals: ['digital'] },
    { name: 'D12', x: 60, y: 5, signals: ['digital'] },
    { name: 'D14', x: 60, y: 15, signals: ['digital'] },
    { name: 'D27', x: 60, y: 25, signals: ['digital'] },
    { name: 'D26', x: 60, y: 35, signals: ['digital'] },
    { name: 'D25', x: 60, y: 45, signals: ['digital'] },
    { name: 'D33', x: 60, y: 55, signals: ['digital'] },
    { name: 'D32', x: 60, y: 65, signals: ['digital'] },
    { name: 'D35', x: 60, y: 75, signals: ['digital'] },
    { name: 'D34', x: 60, y: 85, signals: ['digital'] },
    { name: 'VN', x: 60, y: 95, signals: ['analog'] },
    { name: 'VP', x: 60, y: 105, signals: ['analog'] },
    { name: 'EN', x: 60, y: 115, signals: ['digital'] },
    { name: 'GND.2', x: 60, y: 125, signals: ['ground'] },
  ],
  'wokwi-pushbutton': [
    { name: '1', x: -10, y: 0, signals: ['passive'] },
    { name: '2', x: 10, y: 0, signals: ['passive'] },
    { name: '3', x: -10, y: 20, signals: ['passive'] },
    { name: '4', x: 10, y: 20, signals: ['passive'] }
  ],
  'wokwi-buzzer': [
    { name: '+', x: -10, y: 0, signals: ['power'] },
    { name: '-', x: 10, y: 0, signals: ['ground'] }
  ],
  'wokwi-dht22': [
    { name: 'VCC', x: -10, y: 0, signals: ['power'] },
    { name: 'DATA', x: 0, y: 0, signals: ['digital'] },
    { name: 'GND', x: 10, y: 0, signals: ['ground'] }
  ],
  'wokwi-servo': [
    { name: 'GND', x: -10, y: 0, signals: ['ground'] },
    { name: 'VCC', x: 0, y: 0, signals: ['power'] },
    { name: 'PWM', x: 10, y: 0, signals: ['digital'] }
  ],
  'wokwi-potentiometer': [
    { name: '1', x: -10, y: 0, signals: ['passive'] },
    { name: '2', x: 0, y: 0, signals: ['analog'] },
    { name: '3', x: 10, y: 0, signals: ['passive'] }
  ],
  'wokwi-slide-switch': [
    { name: '1', x: -10, y: 0, signals: ['passive'] },
    { name: '2', x: 0, y: 0, signals: ['passive'] },
    { name: '3', x: 10, y: 0, signals: ['passive'] }
  ],
  'wokwi-lcd1602': [
    { name: 'VSS', x: -70, y: 0, signals: ['ground'] },
    { name: 'VDD', x: -60, y: 0, signals: ['power'] },
    { name: 'V0', x: -50, y: 0, signals: ['analog'] },
    { name: 'RS', x: -40, y: 0, signals: ['digital'] },
    { name: 'RW', x: -30, y: 0, signals: ['digital'] },
    { name: 'E', x: -20, y: 0, signals: ['digital'] },
    { name: 'D0', x: -10, y: 0, signals: ['digital'] },
    { name: 'D1', x: 0, y: 0, signals: ['digital'] },
    { name: 'D2', x: 10, y: 0, signals: ['digital'] },
    { name: 'D3', x: 20, y: 0, signals: ['digital'] },
    { name: 'D4', x: 30, y: 0, signals: ['digital'] },
    { name: 'D5', x: 40, y: 0, signals: ['digital'] },
    { name: 'D6', x: 50, y: 0, signals: ['digital'] },
    { name: 'D7', x: 60, y: 0, signals: ['digital'] },
    { name: 'A', x: 70, y: 0, signals: ['power'] },
    { name: 'K', x: 80, y: 0, signals: ['ground'] },
  ],
  'wokwi-rgb-led': [
    { name: 'R', x: -10, y: 0, signals: ['digital'] },
    { name: 'COM', x: 0, y: 0, signals: ['ground'] },
    { name: 'G', x: 5, y: 0, signals: ['digital'] },
    { name: 'B', x: 10, y: 0, signals: ['digital'] }
  ],
  'wokwi-ultrasonic-distance-sensor': [
    { name: 'VCC', x: -15, y: 0, signals: ['power'] },
    { name: 'TRIG', x: -5, y: 0, signals: ['digital'] },
    { name: 'ECHO', x: 5, y: 0, signals: ['digital'] },
    { name: 'GND', x: 15, y: 0, signals: ['ground'] }
  ],
  'wokwi-stepper-motor': [
    { name: 'A+', x: -15, y: 0, signals: ['digital'] },
    { name: 'A-', x: -5, y: 0, signals: ['digital'] },
    { name: 'B+', x: 5, y: 0, signals: ['digital'] },
    { name: 'B-', x: 15, y: 0, signals: ['digital'] }
  ],
  'wokwi-7segment': [
    { name: 'A', x: -20, y: 0, signals: ['digital'] },
    { name: 'B', x: -15, y: 0, signals: ['digital'] },
    { name: 'C', x: -10, y: 0, signals: ['digital'] },
    { name: 'D', x: -5, y: 0, signals: ['digital'] },
    { name: 'E', x: 0, y: 0, signals: ['digital'] },
    { name: 'F', x: 5, y: 0, signals: ['digital'] },
    { name: 'G', x: 10, y: 0, signals: ['digital'] },
    { name: 'DP', x: 15, y: 0, signals: ['digital'] },
    { name: 'COM', x: 20, y: 0, signals: ['ground'] }
  ],
  'wokwi-neopixel': [
    { name: 'GND', x: -10, y: 0, signals: ['ground'] },
    { name: 'DIN', x: 0, y: 0, signals: ['digital'] },
    { name: 'VCC', x: 10, y: 0, signals: ['power'] }
  ],
  'wokwi-transistor-npn': [
    { name: 'C', x: 0, y: -10, signals: ['passive'] },
    { name: 'B', x: -10, y: 0, signals: ['passive'] },
    { name: 'E', x: 0, y: 10, signals: ['passive'] }
  ],
  'wokwi-photoresistor-sensor': [
    { name: 'VCC', x: -10, y: 0, signals: ['power'] },
    { name: 'OUT', x: 0, y: 0, signals: ['analog'] },
    { name: 'GND', x: 10, y: 0, signals: ['ground'] }
  ],
  'wokwi-led-ring': [
    { name: 'GND', x: -10, y: 0, signals: ['ground'] },
    { name: 'VCC', x: 0, y: 0, signals: ['power'] },
    { name: 'DIN', x: 10, y: 0, signals: ['digital'] }
  ],
  'wokwi-ir-receiver': [
    { name: 'GND', x: -10, y: 0, signals: ['ground'] },
    { name: 'VCC', x: 0, y: 0, signals: ['power'] },
    { name: 'OUT', x: 10, y: 0, signals: ['digital'] }
  ]
};

// Create a new component for circuit editor
export const createComponent = (type: string, props: WokwiElementProps = {}): WokwiComponent => {
  return {
    type,
    id: `comp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    top: 0,
    left: 0,
    attributes: props,
    pins: getComponentPinInfo(type),
    isOriginal: isOriginalWokwiComponent(type)
  };
};

// Utility function to save circuit to localStorage
export const saveCircuit = (name: string, components: WokwiComponent[]): void => {
  try {
    localStorage.setItem(`circuit-${name}`, JSON.stringify(components));
  } catch (error) {
    console.error('Failed to save circuit:', error);
  }
};

// Utility function to load circuit from localStorage
export const loadCircuit = (name: string): WokwiComponent[] => {
  try {
    const saved = localStorage.getItem(`circuit-${name}`);
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    console.error('Failed to load circuit:', error);
    return [];
  }
};
