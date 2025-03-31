
/**
 * Utility functions for SVG handling and manipulation
 */

/**
 * Process SVG content to ensure it has proper attributes for display
 * @param svgContent - The raw SVG content as a string
 * @returns - Processed SVG content
 */
export const processSvgContent = (svgContent: string): string => {
  if (!svgContent || !svgContent.trim().startsWith('<svg')) {
    console.warn('Invalid SVG content provided');
    return svgContent;
  }

  // Parse SVG to modify attributes
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgContent, 'image/svg+xml');
  const svgElement = doc.querySelector('svg');
  
  if (!svgElement) {
    console.warn('No SVG element found in content');
    return svgContent;
  }
  
  // Ensure proper attributes
  if (!svgElement.hasAttribute('width')) {
    svgElement.setAttribute('width', '100%');
  }
  
  if (!svgElement.hasAttribute('height')) {
    svgElement.setAttribute('height', '100%');
  }
  
  svgElement.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  
  // Serialize back to string
  return new XMLSerializer().serializeToString(svgElement);
};

/**
 * Set up an SVG element with proper attributes
 * @param svgElement - The SVG DOM element to set up
 */
export const setupSvgElement = (svgElement: SVGElement | null): void => {
  if (!svgElement) return;
  
  // Ensure the SVG is responsive
  if (!svgElement.hasAttribute('width')) {
    svgElement.setAttribute('width', '100%');
  }
  
  if (!svgElement.hasAttribute('height')) {
    svgElement.setAttribute('height', '100%');
  }
  
  svgElement.setAttribute('preserveAspectRatio', 'xMidYMid meet');
};

/**
 * Load SVG content from a URL
 * @param element - The element to inject the SVG into
 * @param svgPath - URL or path to the SVG file
 * @returns Promise that resolves when the SVG is loaded
 */
export const loadSvgFromPath = async (element: HTMLElement, svgPath: string): Promise<void> => {
  try {
    const response = await fetch(svgPath);
    if (!response.ok) {
      throw new Error(`Failed to load SVG: ${response.status} ${response.statusText}`);
    }
    
    const svgContent = await response.text();
    element.innerHTML = svgContent;
    setupSvgElement(element.querySelector('svg'));
  } catch (error) {
    console.error('Error loading SVG:', error);
    element.innerHTML = `<div class="error">Failed to load SVG: ${error instanceof Error ? error.message : 'Unknown error'}</div>`;
    throw error; // Re-throw to allow caller to handle
  }
};

/**
 * Renders SVG content into an element
 * @param element - The element to render the SVG into
 * @param svgContent - The SVG content as a string
 */
export const renderSvgContent = (element: HTMLElement, svgContent: string): void => {
  if (!svgContent || !svgContent.trim().startsWith('<svg')) {
    console.warn('Invalid SVG content provided');
    element.innerHTML = '<div class="error">Invalid SVG content</div>';
    return;
  }
  
  element.innerHTML = svgContent;
  setupSvgElement(element.querySelector('svg'));
};
