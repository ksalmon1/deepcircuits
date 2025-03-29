
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

// Registry of custom components - now empty as all components are loaded from the database
export const CUSTOM_COMPONENTS: Record<string, CustomComponentConfig> = {};

// Function to check if a component is a custom component
export const isCustomComponent = (type: string): boolean => {
  return type.startsWith('custom-');
};

// Function to get custom component config - now relies on database lookup done elsewhere
export const getCustomComponent = (type: string): CustomComponentConfig | null => {
  return CUSTOM_COMPONENTS[type] || null;
};

// Function to render a custom component
export const renderCustomComponent = (
  type: string,
  elementId: string,
  props: Record<string, any> = {}
): void => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with id ${elementId} not found`);
    return;
  }

  // Clear existing content
  element.innerHTML = '';
  
  // The SVG will now be loaded from the database and passed to this function
  // through the component library hooks
  const svgPath = element.getAttribute('data-svg-path');
  
  if (svgPath) {
    // Create an SVG element from the SVG path
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = svgPath.trim();
    const svg = tempDiv.firstChild as SVGElement;
    
    // Apply properties if needed
    if (props.voltage && svg) {
      const textElement = svg.querySelector('text[text-anchor="middle"]');
      if (textElement) {
        textElement.textContent = `${props.voltage}V`;
      }
    }
    
    element.appendChild(svg);
  } else {
    console.error(`No SVG data found for component ${type}`);
  }
};
