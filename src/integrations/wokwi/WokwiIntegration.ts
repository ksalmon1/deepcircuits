
/**
 * This file handles the integration with wokwi-elements 
 * via the global script loaded in index.html
 */

// Function to check if wokwi-elements are loaded
export const isWokwiLoaded = (): boolean => {
  return (
    typeof window !== 'undefined' && 
    window.customElements && 
    !!window.customElements.get('wokwi-led')
  );
};

// Type definition for wokwi element properties
export interface WokwiElementProps {
  [key: string]: string | number | boolean;
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
