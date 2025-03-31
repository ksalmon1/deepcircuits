
import { ComponentRenderer } from './registry';

/**
 * SVG component renderer implementation for custom components
 */
export const svgRenderer: ComponentRenderer = {
  canRender(componentType: string): boolean {
    // This renderer can handle any component type that's meant to be rendered as SVG
    // Typically, these would be custom components or components with SVG paths
    return componentType.startsWith('custom-') || componentType.includes('svg');
  },
  
  render(element: HTMLElement, componentType: string, options?: any): void {
    // Clear any existing content
    element.innerHTML = '';
    
    try {
      if (options && options.svgPath) {
        // Direct SVG path provided
        element.innerHTML = options.svgPath;
      } else {
        // Create a placeholder SVG
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', '100%');
        svg.setAttribute('viewBox', '0 0 100 100');
        
        // Create a default shape based on component type
        const shape = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        shape.setAttribute('x', '10');
        shape.setAttribute('y', '10');
        shape.setAttribute('width', '80');
        shape.setAttribute('height', '80');
        shape.setAttribute('fill', '#e2e8f0');
        shape.setAttribute('stroke', '#94a3b8');
        shape.setAttribute('stroke-width', '2');
        
        svg.appendChild(shape);
        
        // Add label
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', '50');
        text.setAttribute('y', '55');
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('fill', '#475569');
        text.setAttribute('font-size', '12');
        text.textContent = componentType;
        
        svg.appendChild(text);
        element.appendChild(svg);
      }
      
      // Add pins visually if provided
      if (options && options.pins && Array.isArray(options.pins)) {
        const pinElements = this.renderPins(options.pins);
        
        // Add the pin elements to the main element
        pinElements.forEach(pinEl => {
          element.appendChild(pinEl);
        });
      }
    } catch (error) {
      console.error(`Error rendering SVG component ${componentType}:`, error);
      element.innerHTML = `<div class="error">Failed to render ${componentType}</div>`;
    }
  },
  
  getComponentPinInfo(componentType: string): Array<{ name: string; x: number; y: number; signals?: string[] }> {
    // Return empty array for unknown components
    return [];
  },
  
  cleanup(element: HTMLElement): void {
    element.innerHTML = '';
  },
  
  // Helper method to render pins
  private renderPins(pins: Array<{ name: string; x: number; y: number; signals?: string[] }>): HTMLElement[] {
    return pins.map(pin => {
      const pinEl = document.createElement('div');
      pinEl.className = 'component-pin';
      pinEl.style.position = 'absolute';
      pinEl.style.left = `${pin.x}px`;
      pinEl.style.top = `${pin.y}px`;
      pinEl.style.width = '6px';
      pinEl.style.height = '6px';
      pinEl.style.backgroundColor = '#3b82f6';
      pinEl.style.borderRadius = '50%';
      pinEl.style.transform = 'translate(-50%, -50%)';
      pinEl.setAttribute('data-pin-name', pin.name);
      
      // Add tooltip
      const tooltip = document.createElement('div');
      tooltip.className = 'pin-tooltip';
      tooltip.textContent = pin.name;
      tooltip.style.position = 'absolute';
      tooltip.style.left = '10px';
      tooltip.style.top = '0';
      tooltip.style.backgroundColor = '#334155';
      tooltip.style.color = 'white';
      tooltip.style.padding = '2px 6px';
      tooltip.style.borderRadius = '4px';
      tooltip.style.fontSize = '10px';
      tooltip.style.pointerEvents = 'none';
      tooltip.style.opacity = '0';
      tooltip.style.transition = 'opacity 0.2s';
      
      pinEl.appendChild(tooltip);
      
      pinEl.addEventListener('mouseenter', () => {
        tooltip.style.opacity = '1';
      });
      
      pinEl.addEventListener('mouseleave', () => {
        tooltip.style.opacity = '0';
      });
      
      return pinEl;
    });
  }
};
