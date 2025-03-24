
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
    
    // Add a class to help with styling
    element.classList.add('wokwi-pins-container');
    
    // Add a short delay to allow the shadow DOM to initialize
    setTimeout(() => {
      try {
        // Try to enhance the pin display with custom styles
        if (pinsElement.shadowRoot) {
          const style = document.createElement('style');
          style.textContent = `
            :host {
              --pin-label-background: rgba(255, 255, 255, 0.9);
              --pin-label-color: #333;
            }
            .pin circle {
              transition: r 0.2s ease;
            }
            .pin:hover circle {
              r: 4px;
            }
            .pin text {
              opacity: 0;
              transition: opacity 0.2s ease;
            }
            .pin:hover text {
              opacity: 1;
            }
          `;
          pinsElement.shadowRoot.appendChild(style);
        }
      } catch (err) {
        console.warn('Could not inject styles into shadow DOM:', err);
      }
    }, 50);
  } else {
    element.appendChild(wokwiElement);
  }
};

// List of official Wokwi component types
export const ORIGINAL_WOKWI_COMPONENTS = [
  'wokwi-led',
  'wokwi-resistor',
  'wokwi-capacitor',
  'wokwi-arduino-uno',
  'wokwi-arduino-nano',
  'wokwi-esp32-devkit-v1',
  'wokwi-pushbutton',
  'wokwi-slide-switch',
  'wokwi-7segment',
  'wokwi-buzzer',
  'wokwi-potentiometer',
  'wokwi-servo',
  'wokwi-lcd1602',
  'wokwi-membrane-keypad',
  'wokwi-stepper-motor',
  'wokwi-relay',
  'wokwi-ir-remote',
  'wokwi-ir-receiver',
  'wokwi-dht22',
  'wokwi-logic-analyzer'
];

// Check if a component type is an original Wokwi component
export const isOriginalWokwiComponent = (type: string): boolean => {
  return ORIGINAL_WOKWI_COMPONENTS.includes(type);
};

// Get information about pins for a specific component type
export const getComponentPinInfo = (componentType: string): WokwiPin[] => {
  // This is a simplified version - in a real implementation, you might fetch this from a database
  // or have a more comprehensive mapping
  
  const pinMappings: Record<string, WokwiPin[]> = {
    'wokwi-led': [
      { name: 'A', x: 0, y: 0, signals: ['power'] },
      { name: 'C', x: 0, y: 20, signals: ['ground'] }
    ],
    'wokwi-resistor': [
      { name: '1', x: 0, y: 0, signals: ['passive'] },
      { name: '2', x: 0, y: 20, signals: ['passive'] }
    ],
    'wokwi-arduino-uno': [
      { name: 'D0', x: 0, y: 0, signals: ['digital'] },
      { name: 'D1', x: 0, y: 10, signals: ['digital'] },
      // Additional pins would be defined here
    ]
  };
  
  return pinMappings[componentType] || [];
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
