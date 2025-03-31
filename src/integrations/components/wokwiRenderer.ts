
import { ComponentRenderer } from './registry';
import { getComponentPinInfo as getWokwiComponentPinInfo } from '@/integrations/wokwi/WokwiIntegration';
import { isWokwiLoaded, forceLoadWokwiElements } from '@/integrations/wokwi/WokwiIntegration';

/**
 * Wokwi component renderer implementation
 */
export const wokwiRenderer: ComponentRenderer = {
  canRender(componentType: string): boolean {
    // Wokwi components typically have wokwi- prefix, but not all do
    const wokwiComponents = [
      'wokwi-',
      'arduino-uno',
      'esp32-devkit-v1',
      'raspberry-pi-pico',
      'led',
      'resistor',
      'capacitor',
      'button',
      'switch',
      'potentiometer',
      'buzzer',
      'servo',
      'lcd1602',
      'microphone',
      'speaker'
    ];
    
    return wokwiComponents.some(prefix => 
      typeof componentType === 'string' && 
      (componentType.startsWith(prefix) || componentType === prefix.slice(0, -1))
    );
  },
  
  async render(element: HTMLElement, componentType: string, options?: any): Promise<void> {
    // Ensure Wokwi elements are loaded
    if (!isWokwiLoaded()) {
      await forceLoadWokwiElements();
    }
    
    // Clear any existing content
    element.innerHTML = '';
    
    try {
      // Create the component element
      const componentEl = document.createElement(componentType);
      
      // Set attributes from options if provided
      if (options && options.attributes) {
        Object.entries(options.attributes).forEach(([key, value]) => {
          componentEl.setAttribute(key, String(value));
        });
      }
      
      // Add to the DOM
      element.appendChild(componentEl);
    } catch (error) {
      console.error(`Error rendering Wokwi component ${componentType}:`, error);
      element.innerHTML = `<div class="error">Failed to render ${componentType}</div>`;
    }
  },
  
  getComponentPinInfo(componentType: string): Array<{ name: string; x: number; y: number; signals: string[] }> {
    // Ensure that signals is always present, even if empty
    const pins = getWokwiComponentPinInfo(componentType);
    return pins.map(pin => ({
      name: pin.name,
      x: pin.x,
      y: pin.y,
      signals: pin.signals || []
    }));
  },
  
  cleanup(element: HTMLElement): void {
    // Wokwi components might need special cleanup
    element.innerHTML = '';
  }
};
