
import { ComponentLibraryItem } from "@/types/component";

/**
 * Component renderer type - functions that can render different types of components
 */
export type ComponentRenderer = {
  canRender: (componentType: string) => boolean;
  render: (element: HTMLElement, componentType: string, options?: any) => void;
  getComponentPinInfo: (componentType: string) => Array<{ name: string; x: number; y: number; signals?: string[] }>;
  cleanup?: (element: HTMLElement) => void;
};

/**
 * Registry for component renderers
 */
class ComponentRegistry {
  private renderers: ComponentRenderer[] = [];
  private componentCache: Map<string, ComponentLibraryItem> = new Map();
  
  /**
   * Register a new component renderer
   */
  registerRenderer(renderer: ComponentRenderer): void {
    this.renderers.push(renderer);
  }
  
  /**
   * Get the appropriate renderer for a component type
   */
  getRendererForComponent(componentType: string): ComponentRenderer | null {
    return this.renderers.find(renderer => renderer.canRender(componentType)) || null;
  }
  
  /**
   * Cache a component for quick access
   */
  cacheComponent(component: ComponentLibraryItem): void {
    if (component.id) {
      this.componentCache.set(component.id, component);
    }
  }
  
  /**
   * Get a component from cache by ID
   */
  getCachedComponent(id: string): ComponentLibraryItem | undefined {
    return this.componentCache.get(id);
  }
  
  /**
   * Get all cached components
   */
  getAllCachedComponents(): ComponentLibraryItem[] {
    return Array.from(this.componentCache.values());
  }
  
  /**
   * Clear the component cache
   */
  clearCache(): void {
    this.componentCache.clear();
  }
  
  /**
   * Get pin information for a component type
   */
  getComponentPinInfo(componentType: string): Array<{ name: string; x: number; y: number; signals?: string[] }> {
    const renderer = this.getRendererForComponent(componentType);
    if (renderer) {
      return renderer.getComponentPinInfo(componentType);
    }
    return [];
  }
  
  /**
   * Render a component to an HTML element
   */
  renderComponent(element: HTMLElement, componentType: string, options?: any): void {
    const renderer = this.getRendererForComponent(componentType);
    if (renderer) {
      renderer.render(element, componentType, options);
    } else {
      console.warn(`No renderer found for component type: ${componentType}`);
      element.textContent = `[No renderer for ${componentType}]`;
    }
  }
  
  /**
   * Clean up rendered component
   */
  cleanupComponent(element: HTMLElement, componentType: string): void {
    const renderer = this.getRendererForComponent(componentType);
    if (renderer && renderer.cleanup) {
      renderer.cleanup(element);
    }
  }
}

// Create singleton instance
export const componentRegistry = new ComponentRegistry();

export default componentRegistry;
