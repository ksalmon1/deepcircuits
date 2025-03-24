
import { renderWokwiElement } from "@/integrations/wokwi/WokwiIntegration";

/**
 * Renders a Wokwi component preview in the specified container
 * 
 * @param componentType - The Wokwi component type (e.g., "wokwi-led")
 * @param container - The DOM element to render the component in
 * @param properties - Optional properties to pass to the component
 * @returns Promise that resolves when the component is rendered
 */
export const renderWokwiComponentPreview = async (
  componentType: string,
  container: HTMLElement,
  properties: Record<string, any> = {}
): Promise<void> => {
  try {
    // Clear existing content
    container.innerHTML = '';
    
    // Create a unique element ID for this preview
    const elementId = `wokwi-preview-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    // Create a placeholder element
    const placeholderElement = document.createElement('div');
    placeholderElement.id = elementId;
    placeholderElement.style.position = 'relative';
    container.appendChild(placeholderElement);
    
    // Call renderWokwiElement with the correct arguments
    renderWokwiElement(componentType, elementId, properties);
    
    // Style the container for proper display
    setTimeout(() => {
      const wokwiElement = document.getElementById(elementId)?.firstElementChild;
      if (wokwiElement instanceof HTMLElement) {
        // Position the element at (0,0) of the container without centering
        // This ensures the component's top-left corner is at a known position
        wokwiElement.style.position = 'absolute';
        wokwiElement.style.left = '0';
        wokwiElement.style.top = '0';
        
        // Log element dimensions for debugging
        console.log(`Wokwi element ${componentType} dimensions:`, {
          width: wokwiElement.offsetWidth,
          height: wokwiElement.offsetHeight
        });
      }
    }, 100); // Small delay to ensure the element has rendered
  } catch (error) {
    console.error('Error rendering component preview:', error);
    container.innerHTML = `<div class="text-destructive text-center p-4">Error rendering component</div>`;
  }
};
