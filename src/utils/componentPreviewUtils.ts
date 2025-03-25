
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
    
    // Create a wrapper to position the component at the top-left (0,0)
    const wrapper = document.createElement('div');
    wrapper.style.position = 'relative';
    wrapper.style.width = '100%';
    wrapper.style.height = '100%';
    container.appendChild(wrapper);
    
    await renderWokwiElement(componentType, elementId, properties);
    
    // Style the container for proper display
    setTimeout(() => {
      const wokwiElement = document.getElementById(elementId)?.firstElementChild;
      if (wokwiElement instanceof HTMLElement) {
        // Position the element consistently at top-left (0,0)
        wokwiElement.style.position = 'absolute';
        wokwiElement.style.left = '0';
        wokwiElement.style.top = '0';
        wokwiElement.style.transformOrigin = 'top left';
        
        // Add a visible origin marker to help users see the (0,0) point
        const originMarker = document.createElement('div');
        originMarker.style.position = 'absolute';
        originMarker.style.width = '6px';
        originMarker.style.height = '6px';
        originMarker.style.backgroundColor = 'red';
        originMarker.style.borderRadius = '50%';
        originMarker.style.top = '0px';
        originMarker.style.left = '0px';
        originMarker.style.transform = 'translate(-50%, -50%)';
        originMarker.style.zIndex = '100';
        originMarker.title = 'Component origin (0,0)';
        wrapper.appendChild(originMarker);
        
        // Log element dimensions for debugging
        console.log(`Wokwi element ${componentType} dimensions:`, {
          width: wokwiElement.offsetWidth,
          height: wokwiElement.offsetHeight,
          position: {
            left: wokwiElement.offsetLeft,
            top: wokwiElement.offsetTop
          }
        });
      }
    }, 100); // Small delay to ensure the element has rendered
  } catch (error) {
    console.error('Error rendering component preview:', error);
    container.innerHTML = `<div class="text-destructive text-center p-4">Error rendering component</div>`;
  }
};
