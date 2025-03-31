
/**
 * Component Registry
 * Central registry for component renderers
 */

/**
 * Component renderer interface
 */
export interface ComponentRenderer {
  /**
   * Check if the renderer can render the given component type
   */
  canRender(componentType: string): boolean;
  
  /**
   * Render the component into the provided HTMLElement
   */
  render(element: HTMLElement, componentType: string, options?: any): void;
  
  /**
   * Get pin information for a component type
   */
  getComponentPinInfo(componentType: string): Array<{ name: string; x: number; y: number; signals: string[] }>;
  
  /**
   * Clean up any resources when component is removed
   */
  cleanup(element: HTMLElement): void;
  
  /**
   * Internal helper methods can be prefixed with underscore
   */
  _renderPins?: (pins: Array<{ name: string; x: number; y: number; signals?: string[] }>) => HTMLElement[];
}

/**
 * Component registry to manage registered renderers
 */
class ComponentRegistry {
  private renderers: ComponentRenderer[] = [];
  
  /**
   * Register a new component renderer
   */
  registerRenderer(renderer: ComponentRenderer): void {
    this.renderers.push(renderer);
  }
  
  /**
   * Get a renderer for a specific component type
   */
  getRendererForComponent(componentType: string): ComponentRenderer | null {
    return this.renderers.find(renderer => renderer.canRender(componentType)) || null;
  }
  
  /**
   * Render a component into an element
   */
  renderComponent(element: HTMLElement, componentType: string, options?: any): void {
    const renderer = this.getRendererForComponent(componentType);
    if (renderer) {
      renderer.render(element, componentType, options);
    } else {
      console.warn(`No renderer found for component type: ${componentType}`);
      element.innerHTML = `<div class="error">No renderer for ${componentType}</div>`;
    }
  }
  
  /**
   * Get pin information for a component type
   */
  getComponentPinInfo(componentType: string): Array<{ name: string; x: number; y: number; signals: string[] }> {
    const renderer = this.getRendererForComponent(componentType);
    if (renderer) {
      return renderer.getComponentPinInfo(componentType);
    }
    return [];
  }
  
  /**
   * Clean up a component's resources
   */
  cleanupComponent(element: HTMLElement, componentType: string): void {
    const renderer = this.getRendererForComponent(componentType);
    if (renderer) {
      renderer.cleanup(element);
    }
  }
}

// Create and export a singleton instance
const componentRegistry = new ComponentRegistry();
export default componentRegistry;
