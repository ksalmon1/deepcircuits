/**
 * This file handles the integration with wokwi-elements 
 * via the global script loaded in index.html
 */

// Track whether we've seen the components load successfully
let componentsLoadedSuccessfully = false;

// Function to check if wokwi-elements are loaded
export const isWokwiLoaded = (): boolean => {
  try {
    // First check if our script onload handler has fired
    const scriptLoaded = typeof window !== 'undefined' && window.wokwiElementsLoaded === true;
    
    // Then check if the components are actually available in the registry
    const componentsRegistered = 
      typeof window !== 'undefined' && 
      window.customElements && 
      !!window.customElements.get('wokwi-led');
    
    const isLoaded = scriptLoaded && componentsRegistered;
    
    if (isLoaded && !componentsLoadedSuccessfully) {
      console.log('✅ Wokwi components loaded successfully');
      componentsLoadedSuccessfully = true;
    }
    
    // Additional logging to help debug the issue
    if (!isLoaded && typeof window !== 'undefined') {
      console.log('Script loaded:', scriptLoaded);
      console.log('customElements available:', !!window.customElements);
      if (window.customElements) {
        console.log('wokwi-led defined:', !!window.customElements.get('wokwi-led'));
      }
    }
    
    return isLoaded;
  } catch (error) {
    console.error('Error checking if Wokwi is loaded:', error);
    return false;
  }
};

// Manually force loading of Wokwi elements if needed
export const forceLoadWokwiElements = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (isWokwiLoaded()) {
      resolve(true);
      return;
    }

    // Try to load the script manually if not already done
    const existingScript = document.getElementById('wokwi-elements-script');
    if (!existingScript) {
      const script = document.createElement('script');
      script.id = 'wokwi-elements-script';
      script.type = 'module';
      script.src = 'https://unpkg.com/wokwi-elements@1.7.0/dist/wokwi-elements.bundle.js';
      script.onload = () => {
        window.wokwiElementsLoaded = true;
        // Give a little time for custom elements to register
        setTimeout(() => resolve(true), 500);
      };
      script.onerror = () => resolve(false);
      document.head.appendChild(script);
    } else {
      // If script exists but components aren't registered yet, wait a bit
      setTimeout(() => resolve(isWokwiLoaded()), 1000);
    }
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
}

// Function to render a wokwi element with given properties
export const renderWokwiElement = (
  type: string, 
  elementId: string, 
  props: WokwiElementProps
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

  // Create the wokwi element
  const wokwiElement = document.createElement(type);
  
  // Set all properties
  Object.entries(props).forEach(([key, value]) => {
    wokwiElement.setAttribute(key, String(value));
  });
  
  // Clear existing content and append the new element
  element.innerHTML = '';
  element.appendChild(wokwiElement);
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
    pins: getComponentPinInfo(type)
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
