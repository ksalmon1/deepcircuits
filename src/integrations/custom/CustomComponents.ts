
import { WokwiPin } from '@/integrations/wokwi/WokwiIntegration';

// Interface for our custom component properties
export interface CustomComponentConfig {
  type: string;
  name: string;
  description: string;
  category: string;
  svgPath: string;
  pins: WokwiPin[];
  properties?: Record<string, any>;
}

// Registry of custom components
export const CUSTOM_COMPONENTS: Record<string, CustomComponentConfig> = {
  'custom-9v-battery': {
    type: 'custom-9v-battery',
    name: '9V Battery',
    description: 'A 9V power supply battery',
    category: 'power',
    svgPath: `
      <svg width="100" height="60" viewBox="0 0 100 60" xmlns="http://www.w3.org/2000/svg">
        <!-- Battery body -->
        <rect x="15" y="10" width="70" height="40" rx="2" fill="#333" />
        <rect x="10" y="20" width="5" height="20" fill="#333" />
        
        <!-- Battery terminals -->
        <rect x="85" y="20" width="5" height="20" fill="#5a5a5a" />
        <text x="50" y="35" font-family="Arial" font-size="14" text-anchor="middle" fill="white">9V</text>
        
        <!-- Positive terminal mark -->
        <circle cx="90" cy="30" r="2" fill="red" />
        <text x="88" y="25" font-family="Arial" font-size="10" fill="white">+</text>
        
        <!-- Negative terminal mark -->
        <circle cx="10" cy="30" r="2" fill="blue" />
        <text x="12" y="25" font-family="Arial" font-size="10" fill="white">-</text>
      </svg>
    `,
    pins: [
      { name: '+', x: 90, y: 30, signals: ['power'] },
      { name: '-', x: 10, y: 30, signals: ['ground'] }
    ],
    properties: {
      voltage: {
        type: 'number',
        default: 9,
        min: 0,
        max: 12,
        label: 'Voltage (V)'
      }
    }
  }
};

// Function to check if a component is a custom component
export const isCustomComponent = (type: string): boolean => {
  return type.startsWith('custom-') && !!CUSTOM_COMPONENTS[type];
};

// Function to get custom component config
export const getCustomComponent = (type: string): CustomComponentConfig | null => {
  return CUSTOM_COMPONENTS[type] || null;
};

// Function to render a custom component
export const renderCustomComponent = (
  type: string,
  elementId: string,
  props: Record<string, any> = {}
): void => {
  const component = getCustomComponent(type);
  if (!component) {
    console.error(`Custom component ${type} not found`);
    return;
  }

  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with id ${elementId} not found`);
    return;
  }

  // Clear existing content
  element.innerHTML = '';
  
  // Create an SVG element from the SVG path
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = component.svgPath.trim();
  const svg = tempDiv.firstChild as SVGElement;
  
  // Apply properties if needed
  if (props.voltage && svg) {
    const textElement = svg.querySelector('text[text-anchor="middle"]');
    if (textElement) {
      textElement.textContent = `${props.voltage}V`;
    }
  }
  
  element.appendChild(svg);
};
