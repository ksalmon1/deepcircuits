
import { ComponentRenderer } from './registry';

// Helper function to set up SVG element properties
function setupSvgElement(svgElement: SVGElement | null): void {
  if (svgElement) {
    // Ensure the SVG is responsive
    if (!svgElement.hasAttribute('width')) {
      svgElement.setAttribute('width', '100%');
    }
    if (!svgElement.hasAttribute('height')) {
      svgElement.setAttribute('height', '100%');
    }
    svgElement.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  }
}

// Helper function to load SVG from a URL
function loadSvgFromPath(element: HTMLElement, svgPath: string): Promise<void> {
  return fetch(svgPath)
    .then(response => {
      if (!response.ok) {
        throw new Error(`Failed to load SVG: ${response.status} ${response.statusText}`);
      }
      return response.text();
    })
    .then(svgContent => {
      element.innerHTML = svgContent;
      setupSvgElement(element.querySelector('svg'));
    })
    .catch(error => {
      console.error('Error loading SVG:', error);
      element.innerHTML = `<div class="error">Failed to load SVG: ${error.message}</div>`;
      throw error; // Re-throw to allow caller to handle
    });
}

// Helper function to get SVG content for predefined types
function getSvgContentForType(componentType: string): string | null {
  // Example implementation - in a real app this would be more sophisticated
  const svgMap: Record<string, string> = {
    'svg-resistor': `<svg viewBox="0 0 100 30" xmlns="http://www.w3.org/2000/svg">
      <rect x="30" y="10" width="40" height="10" fill="#f5f5f5" stroke="#333" />
      <line x1="0" y1="15" x2="30" y2="15" stroke="#333" />
      <line x1="70" y1="15" x2="100" y2="15" stroke="#333" />
    </svg>`,
    
    'svg-led': `<svg viewBox="0 0 100 50" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="25" r="20" fill="#ff0000" stroke="#333" />
      <line x1="0" y1="25" x2="30" y2="25" stroke="#333" />
      <line x1="70" y1="25" x2="100" y2="25" stroke="#333" />
    </svg>`
  };
  
  return svgMap[componentType] || null;
}

/**
 * SVG component renderer implementation
 * Handles rendering custom SVG-based components
 */
export const svgRenderer: ComponentRenderer = {
  canRender(componentType: string): boolean {
    // This renderer handles types that start with 'svg-'
    return componentType.startsWith('svg-');
  },
  
  render(element: HTMLElement, componentType: string, options?: any): void {
    try {
      console.log('Rendering SVG component:', componentType);
      element.innerHTML = '';
      
      // If SVG content is directly provided in options
      if (options && options.svgContent) {
        element.innerHTML = options.svgContent;
        setupSvgElement(element.querySelector('svg'));
        return;
      }
      
      // If a path to an SVG file is provided
      if (options && options.svgPath) {
        loadSvgFromPath(element, options.svgPath)
          .catch(error => {
            console.error(`Failed to load SVG from path for ${componentType}:`, error);
          });
        return;
      }
      
      // If this is a predefined SVG component
      const svgContent = getSvgContentForType(componentType);
      if (svgContent) {
        element.innerHTML = svgContent;
        setupSvgElement(element.querySelector('svg'));
        return;
      }
      
      // If we couldn't render anything
      element.innerHTML = `<div class="error">Could not render SVG component: ${componentType}</div>`;
    } catch (error) {
      console.error(`Error rendering SVG component ${componentType}:`, error);
      element.innerHTML = `<div class="error">Failed to render ${componentType}</div>`;
    }
  },
  
  getComponentPinInfo(componentType: string): Array<{ name: string; x: number; y: number; signals: string[] }> {
    // Return predefined pin configurations for known SVG components
    // In a real implementation, this could be loaded from a database or configuration
    
    // Default empty array for unknown components
    return [];
  },
  
  cleanup(element: HTMLElement): void {
    element.innerHTML = '';
  }
};
