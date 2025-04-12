import { ComponentLibraryItem, CircuitComponent } from "@/types/component";
import { ComponentPin } from "@/types/pin";
import { supabase } from "@/integrations/supabase/client";
import { mapComponentFromDb, convertLibraryItemToCircuitComponent } from "@/services/componentLibrary/converters";
import { toast } from "sonner";
import { AppError, ComponentError } from "@/utils/errorHandling";
import { generateComponentId } from "@/utils/componentUtils";

/**
 * Component Repository
 * Centralizes data access for components
 */
export class ComponentRepository {
  /**
   * Get all components from the library
   */
  static async getAllComponents(): Promise<ComponentLibraryItem[]> {
    try {
      const { data, error } = await supabase
        .from('component_library')
        .select('*')
        .order('name');
        
      if (error) {
        console.error('Error fetching components:', error);
        throw new ComponentError(`Failed to fetch components: ${error.message}`, 'FETCH_COMPONENTS_ERROR');
      }
      
      return data.map(mapComponentFromDb);
    } catch (error) {
      if (error instanceof ComponentError) {
        throw error; // Re-throw our own error types
      }
      console.error('Unexpected error fetching components:', error);
      throw new ComponentError('Failed to load component library', 'COMPONENT_LIBRARY_ERROR');
    }
  }

  /**
   * Get component by ID
   */
  static async getComponentById(id: string): Promise<ComponentLibraryItem | null> {
    try {
      const { data, error } = await supabase
        .from('component_library')
        .select('*')
        .eq('id', id)
        .single();
        
      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned - component not found
          return null;
        }
        
        console.error(`Error fetching component with ID ${id}:`, error);
        throw new ComponentError(`Failed to fetch component: ${error.message}`, 'FETCH_COMPONENT_ERROR');
      }
      
      return data ? mapComponentFromDb(data) : null;
    } catch (error) {
      if (error instanceof ComponentError) {
        throw error; // Re-throw our own error types
      }
      console.error(`Unexpected error fetching component with ID ${id}:`, error);
      throw new ComponentError(`Failed to load component with ID ${id}`, 'COMPONENT_LOAD_ERROR');
    }
  }

  /**
   * Get component with details (pins, properties)
   */
  static async getComponentWithDetails(id: string): Promise<ComponentLibraryItem | null> {
    try {
      // Fetch component basic info
      const component = await this.getComponentById(id);
      
      if (!component) {
        return null;
      }
      
      // Fetch component pins
      const { data: pinsData, error: pinsError } = await supabase
        .from('component_pins')
        .select('*')
        .eq('component_id', id);
        
      if (pinsError) {
        console.error(`Error fetching pins for component ${id}:`, pinsError);
        throw new ComponentError(`Failed to fetch component pins: ${pinsError.message}`, 'FETCH_PINS_ERROR');
      }
      
      // Fetch component properties
      const { data: propsData, error: propsError } = await supabase
        .from('component_properties')
        .select('*')
        .eq('component_id', id);
        
      if (propsError) {
        console.error(`Error fetching properties for component ${id}:`, propsError);
        throw new ComponentError(`Failed to fetch component properties: ${propsError.message}`, 'FETCH_PROPERTIES_ERROR');
      }
      
      // Map pins and properties to component
      const componentWithDetails = {
        ...component,
        pins: pinsData.map((p: any) => ({
          id: p.id || `pin-${p.name}-${Math.random().toString(36).slice(2, 7)}`,
          name: p.name,
          x: p.x,
          y: p.y,
          signals: p.signals || []
        })),
        properties: propsData.reduce((acc: Record<string, any>, prop: any) => {
          acc[prop.property_key] = prop.property_value;
          return acc;
        }, {})
      };
      
      return componentWithDetails;
    } catch (error) {
      if (error instanceof ComponentError) {
        throw error; // Re-throw our own error types
      }
      console.error(`Unexpected error fetching component details for ID ${id}:`, error);
      throw new ComponentError(`Failed to load component details for ID ${id}`, 'COMPONENT_DETAILS_ERROR');
    }
  }

  /**
   * Create a new component instance from a library item
   */
  static createComponentInstance(
    libraryItem: ComponentLibraryItem, 
    position: { x: number, y: number } = { x: 0, y: 0 }
  ): CircuitComponent {
    const component = convertLibraryItemToCircuitComponent(libraryItem);
    component.left = position.x;
    component.top = position.y;
    
    // Generate a unique ID if one doesn't exist
    if (!component.id) {
      component.id = generateComponentId(libraryItem.type);
    }
    
    return component;
  }

  /**
   * Get pin information for a component
   */
  static async getComponentPins(componentId: string): Promise<ComponentPin[]> {
    try {
      const { data, error } = await supabase
        .from('component_pins')
        .select('*')
        .eq('component_id', componentId);
        
      if (error) {
        console.error(`Error fetching pins for component ${componentId}:`, error);
        throw new ComponentError(`Failed to fetch pins: ${error.message}`, 'FETCH_PINS_ERROR');
      }
      
      return data.map((p: any) => ({
        id: p.id || `pin-${p.name}-${Math.random().toString(36).slice(2, 7)}`,
        name: p.name,
        x: p.x,
        y: p.y,
        signals: p.signals || []
      }));
    } catch (error) {
      console.error(`Error in getComponentPins:`, error);
      throw error;
    }
  }

  /**
   * Save component pins
   */
  static async savePins(componentId: string, pins: ComponentPin[]): Promise<void> {
    try {
      // First delete existing pins
      const { error: deleteError } = await supabase
        .from('component_pins')
        .delete()
        .eq('component_id', componentId);
        
      if (deleteError) {
        console.error(`Error deleting pins for component ${componentId}:`, deleteError);
        throw new ComponentError(`Failed to update pins: ${deleteError.message}`, 'UPDATE_PINS_ERROR');
      }
      
      // Skip if no pins to add
      if (!pins || pins.length === 0) {
        return;
      }
      
      // Insert new pins
      const pinsToInsert = pins.map(pin => ({
        component_id: componentId,
        name: pin.name,
        x: pin.x,
        y: pin.y,
        signals: pin.signals || []
      }));
      
      const { error } = await supabase
        .from('component_pins')
        .insert(pinsToInsert);
        
      if (error) {
        console.error(`Error inserting pins for component ${componentId}:`, error);
        throw new ComponentError(`Failed to save pins: ${error.message}`, 'SAVE_PINS_ERROR');
      }
      
      toast.success('Component pins saved successfully');
    } catch (error) {
      console.error(`Error in savePins:`, error);
      toast.error('Failed to save component pins');
      throw error;
    }
  }
}
