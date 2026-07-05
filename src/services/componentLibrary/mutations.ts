
import { ComponentLibraryItem } from '@/types/component';
import { supabase } from '@/integrations/supabase/client';
import { ComponentError } from '@/utils/errorHandling';
import type { Json } from '@/integrations/supabase/types';

/**
 * Create a new component in the library
 */
export async function createComponent(component: ComponentLibraryItem): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('component_library')
      .insert({
        name: component.name,
        type: component.type,
        category: component.category,
        description: component.description,
        svg_path: component.svgPath,
        enabled: component.enabled,
        is_original: component.isOriginal
      })
      .select('id')
      .single();
      
    if (error) {
      console.error('Error creating component:', error);
      throw new ComponentError(`Failed to create component: ${error.message}`, 'CREATE_COMPONENT_ERROR');
    }
    
    const componentId = data.id;
    
    // Create pins if provided
    if (component.pins && component.pins.length > 0) {
      const pinsToInsert = component.pins.map(pin => ({
        component_id: componentId,
        name: pin.name,
        x: pin.x,
        y: pin.y,
        signals: pin.signals
      }));
      
      const { error: pinsError } = await supabase
        .from('component_pins')
        .insert(pinsToInsert);
        
      if (pinsError) {
        console.error('Error creating component pins:', pinsError);
        throw new ComponentError(`Failed to create component pins: ${pinsError.message}`, 'CREATE_PINS_ERROR');
      }
    }
    
    // Create properties if provided
    if (component.properties && Object.keys(component.properties).length > 0) {
      const propsToInsert = Object.entries(component.properties).map(([key, value]) => ({
        component_id: componentId,
        property_key: key,
        property_value: value as Json
      }));
      
      const { error: propsError } = await supabase
        .from('component_properties')
        .insert(propsToInsert);
        
      if (propsError) {
        console.error('Error creating component properties:', propsError);
        throw new ComponentError(`Failed to create component properties: ${propsError.message}`, 'CREATE_PROPERTIES_ERROR');
      }
    }
    
    return componentId;
  } catch (error) {
    if (error instanceof ComponentError) {
      throw error; // Re-throw our own error types
    }
    console.error('Unexpected error creating component:', error);
    throw new ComponentError('Failed to create component due to an unexpected error', 'COMPONENT_CREATE_ERROR');
  }
}

/**
 * Update an existing component in the library
 */
export async function updateComponent(component: ComponentLibraryItem): Promise<void> {
  if (!component.id) {
    throw new ComponentError('Component ID is required for updates', 'MISSING_COMPONENT_ID');
  }
  
  try {
    // Update basic component info
    const { error } = await supabase
      .from('component_library')
      .update({
        name: component.name,
        type: component.type,
        category: component.category,
        description: component.description,
        svg_path: component.svgPath,
        enabled: component.enabled,
        is_original: component.isOriginal
      })
      .eq('id', component.id);
      
    if (error) {
      console.error(`Error updating component ${component.id}:`, error);
      throw new ComponentError(`Failed to update component: ${error.message}`, 'UPDATE_COMPONENT_ERROR');
    }
    
    // Handle pins update if provided
    if (component.pins) {
      // Delete existing pins
      const { error: deleteError } = await supabase
        .from('component_pins')
        .delete()
        .eq('component_id', component.id);
        
      if (deleteError) {
        console.error(`Error deleting pins for component ${component.id}:`, deleteError);
        throw new ComponentError(`Failed to update component pins: ${deleteError.message}`, 'DELETE_PINS_ERROR');
      }
      
      // Create new pins
      if (component.pins.length > 0) {
        const pinsToInsert = component.pins.map(pin => ({
          component_id: component.id,
          name: pin.name,
          x: pin.x,
          y: pin.y,
          signals: pin.signals
        }));
        
        const { error: pinsError } = await supabase
          .from('component_pins')
          .insert(pinsToInsert);
          
        if (pinsError) {
          console.error(`Error creating pins for component ${component.id}:`, pinsError);
          throw new ComponentError(`Failed to update component pins: ${pinsError.message}`, 'CREATE_PINS_ERROR');
        }
      }
    }
    
    // Handle properties update if provided
    if (component.properties) {
      // Delete existing properties
      const { error: deletePropsError } = await supabase
        .from('component_properties')
        .delete()
        .eq('component_id', component.id);
        
      if (deletePropsError) {
        console.error(`Error deleting properties for component ${component.id}:`, deletePropsError);
        throw new ComponentError(`Failed to update component properties: ${deletePropsError.message}`, 'DELETE_PROPERTIES_ERROR');
      }
      
      // Create new properties
      if (Object.keys(component.properties).length > 0) {
        const propsToInsert = Object.entries(component.properties).map(([key, value]) => ({
          component_id: component.id,
          property_key: key,
          property_value: value as Json
        }));
        
        const { error: propsError } = await supabase
          .from('component_properties')
          .insert(propsToInsert);
          
        if (propsError) {
          console.error(`Error creating properties for component ${component.id}:`, propsError);
          throw new ComponentError(`Failed to update component properties: ${propsError.message}`, 'CREATE_PROPERTIES_ERROR');
        }
      }
    }
  } catch (error) {
    if (error instanceof ComponentError) {
      throw error; // Re-throw our own error types
    }
    console.error(`Unexpected error updating component ${component.id}:`, error);
    throw new ComponentError(`Failed to update component due to an unexpected error`, 'COMPONENT_UPDATE_ERROR');
  }
}

/**
 * Delete a component from the library
 */
export async function deleteComponent(id: string): Promise<void> {
  try {
    // Cascade delete will handle pins and properties
    const { error } = await supabase
      .from('component_library')
      .delete()
      .eq('id', id);
      
    if (error) {
      console.error(`Error deleting component ${id}:`, error);
      throw new ComponentError(`Failed to delete component: ${error.message}`, 'DELETE_COMPONENT_ERROR');
    }
  } catch (error) {
    if (error instanceof ComponentError) {
      throw error; // Re-throw our own error types
    }
    console.error(`Unexpected error deleting component ${id}:`, error);
    throw new ComponentError(`Failed to delete component due to an unexpected error`, 'COMPONENT_DELETE_ERROR');
  }
}
