
import { ComponentLibraryItem } from '@/types/component';
import { mapComponentFromDb } from './converters';
import { supabase } from '@/integrations/supabase/client';
import { ComponentError } from '@/utils/errorHandling';

/**
 * Fetch all components from the library
 */
export async function getAllComponents(): Promise<ComponentLibraryItem[]> {
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
 * Fetch a single component by ID
 */
export async function getComponentById(id: string): Promise<ComponentLibraryItem | null> {
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
 * Fetch a component with all its details (pins, properties, etc.)
 */
export async function getComponentWithDetails(id: string): Promise<ComponentLibraryItem | null> {
  try {
    // Fetch component basic info
    const component = await getComponentById(id);
    
    if (!component) {
      return null;
    }
    
    console.log(`Mapped component data:`, {
      id: component.id,
      type: component.type,
      pins: component.pins?.length || 0,
      properties: Object.keys(component.properties || {}).length || 0
    });
    
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
      pins: pinsData.map(p => ({
        name: p.name,
        x: p.x,
        y: p.y,
        signals: p.signals || []
      })),
      properties: propsData.reduce((acc, prop) => {
        acc[prop.property_key] = prop.property_value;
        return acc;
      }, {} as Record<string, any>)
    };

    console.log(`Got details for ${component.name} (${component.type}):`, componentWithDetails);
    
    if (componentWithDetails.pins && componentWithDetails.pins.length > 0) {
      console.log(`${component.name} has ${componentWithDetails.pins.length} pins:`, componentWithDetails.pins);
    }
    
    return componentWithDetails;
  } catch (error) {
    if (error instanceof ComponentError) {
      throw error; // Re-throw our own error types
    }
    console.error(`Unexpected error fetching component details for ID ${id}:`, error);
    throw new ComponentError(`Failed to load component details for ID ${id}`, 'COMPONENT_DETAILS_ERROR');
  }
}
