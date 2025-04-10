/**
 * Component Registry for managing component renderers
 */
class ComponentRegistry {
  private renderers: Record<string, any> = {};

  /**
   * Register a renderer for components
   */
  registerRenderer(renderer: any) {
    if (!renderer || !renderer.id) {
      console.warn('Invalid renderer provided to registry');
      return;
    }
    
    this.renderers[renderer.id] = renderer;
  }

  /**
   * Get renderer by ID
   */
  getRenderer(id: string) {
    return this.renderers[id] || null;
  }

  /**
   * Get all registered renderers
   */
  getAllRenderers() {
    return Object.values(this.renderers);
  }
}

// Create and export a singleton instance
export const componentRegistry = new ComponentRegistry(); 