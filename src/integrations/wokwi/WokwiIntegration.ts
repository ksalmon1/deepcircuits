/**
 * This file handles the integration with wokwi-elements 
 * via the global script loaded in index.html
 */

// Function to check if wokwi-elements are loaded
export const isWokwiLoaded = (): boolean => {
  try {
    const isLoaded = (
      typeof window !== 'undefined' && 
      window.customElements && 
      !!window.customElements.get('wokwi-led')
    );
    
    console.log('Wokwi loaded check:', isLoaded);
    
    // Additional logging to help debug the issue
    if (!isLoaded && typeof window !== 'undefined') {
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
