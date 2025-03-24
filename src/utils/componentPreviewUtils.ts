
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
    
    // Create the element with the given properties
    const element = await renderWokwiElement(componentType, properties);
    
    if (element) {
      // Center the element in the container
      element.style.position = 'absolute';
      element.style.left = '50%';
      element.style.top = '50%';
      element.style.transform = 'translate(-50%, -50%)';
      
      container.appendChild(element);
    } else {
      console.error(`Failed to render ${componentType} preview`);
      container.innerHTML = `<div class="text-destructive text-center p-4">Failed to render component</div>`;
    }
  } catch (error) {
    console.error('Error rendering component preview:', error);
    container.innerHTML = `<div class="text-destructive text-center p-4">Error rendering component</div>`;
  }
};
