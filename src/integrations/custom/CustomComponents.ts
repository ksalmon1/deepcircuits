
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
  
  // First, check if SVG path is provided via data attribute
  const svgPath = element.getAttribute('data-svg-path');
  
  if (svgPath) {
    console.log(`Rendering custom component ${type} using SVG path`);
    // Create an SVG element from the SVG path
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = svgPath.trim();
    const svg = tempDiv.firstChild as SVGElement;
    
    if (svg) {
      // Make sure SVG has width and height attributes
      if (!svg.hasAttribute('width')) {
        svg.setAttribute('width', '100%');
      }
      if (!svg.hasAttribute('height')) {
        svg.setAttribute('height', '100%');
      }
      
      // Apply properties if needed
      if (props.voltage && svg) {
        const textElement = svg.querySelector('text[text-anchor="middle"]');
        if (textElement) {
          textElement.textContent = `${props.voltage}V`;
        }
      }
      
      element.appendChild(svg);
    } else {
      console.error(`Invalid SVG data for component ${type}`);
    }
  } else {
    console.error(`No SVG data found for component ${type}`);
    // Fallback to a default visual representation
    const defaultSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    defaultSvg.setAttribute('width', '100%');
    defaultSvg.setAttribute('height', '100%');
    defaultSvg.setAttribute('viewBox', '0 0 100 100');
    
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', '10');
    rect.setAttribute('y', '10');
    rect.setAttribute('width', '80');
    rect.setAttribute('height', '80');
    rect.setAttribute('fill', '#f0f0f0');
    rect.setAttribute('stroke', '#888');
    rect.setAttribute('stroke-width', '2');
    
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', '50');
    text.setAttribute('y', '55');
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('fill', '#333');
    text.setAttribute('font-size', '14');
    text.textContent = type;
    
    defaultSvg.appendChild(rect);
    defaultSvg.appendChild(text);
    element.appendChild(defaultSvg);
  }
};
