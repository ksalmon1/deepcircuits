
/**
 * Utilities for working with SVG elements in the circuit editor
 */

/**
 * Set up an SVG element in a container
 * @param container - The DOM element to contain the SVG
 * @param width - SVG width
 * @param height - SVG height
 * @returns The created SVG element
 */
export function setupSvgElement(
  container: HTMLElement,
  width: number = 100, 
  height: number = 100
): SVGSVGElement {
  // Clear any existing content
  container.innerHTML = '';
  
  // Create SVG element
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', `${width}px`);
  svg.setAttribute('height', `${height}px`);
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  
  // Append to container
  container.appendChild(svg);
  
  return svg;
}

/**
 * Render SVG content directly into a container
 * @param container - The DOM element to render into
 * @param svgContent - SVG content as a string
 */
export function renderSvgContent(container: HTMLElement, svgContent: string): void {
  if (!container) {
    console.error('Invalid container for SVG rendering');
    return;
  }
  
  if (!svgContent || typeof svgContent !== 'string') {
    console.error('Invalid SVG content for rendering');
    return;
  }
  
  try {
    // Clear existing content
    container.innerHTML = '';
    
    // Insert SVG content
    if (svgContent.trim().startsWith('<svg')) {
      container.innerHTML = svgContent;
      
      // Get the SVG element we just inserted
      const svgElement = container.querySelector('svg');
      
      // Ensure SVG has proper dimensions
      if (svgElement && (!svgElement.hasAttribute('width') || !svgElement.hasAttribute('height'))) {
        const originalViewBox = svgElement.getAttribute('viewBox');
        if (originalViewBox) {
          const [, , width, height] = originalViewBox.split(' ').map(Number);
          if (width && height) {
            svgElement.setAttribute('width', `${width}px`);
            svgElement.setAttribute('height', `${height}px`);
          }
        }
        
        // Default size if no viewBox found
        if (!svgElement.hasAttribute('width')) {
          svgElement.setAttribute('width', '100px');
        }
        if (!svgElement.hasAttribute('height')) {
          svgElement.setAttribute('height', '100px');
        }
      }
    } else {
      console.warn('Invalid SVG content - must start with <svg> tag');
    }
  } catch (error) {
    console.error('Error rendering SVG content:', error);
    // Fallback - display error message
    container.innerHTML = '<div style="color: red; padding: 10px;">Error rendering component</div>';
  }
}
