
import { ComponentLibraryItem } from '@/types/component';
import { supabaseClient } from '@/integrations/supabase/client';

/**
 * Create a new component in the library
 */
export async function createComponent(component: ComponentLibraryItem): Promise<string> {
  try {
    const { data, error } = await supabaseClient
      .from('components')
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
      throw new Error(`Failed to create component: ${error.message}`);
    }
    
    const componentId = data.id;
    
    // Create pins if provided
    if (component.pins && component.pins.length > 0) {
      const pinsToInsert = component.pins.map((pin, index) => ({
        component_id: componentId,
        name: pin.name,
        x: pin.x,
        y: pin.y,
        signals: pin.signals || [],
        index
      }));
      
      const { error: pinsError } = await supabaseClient
        .from('component_pins')
        .insert(pinsToInsert);
        
      if (pinsError) {
        console.error('Error creating component pins:', pinsError);
        throw new Error(`Failed to create component pins: ${pinsError.message}`);
      }
    }
    
    // Create properties if provided
    if (component.properties && Object.keys(component.properties).length > 0) {
      const propsToInsert = Object.entries(component.properties).map(([key, value]) => ({
        component_id: componentId,
        key,
        value
      }));
      
      const { error: propsError } = await supabaseClient
        .from('component_properties')
        .insert(propsToInsert);
        
      if (propsError) {
        console.error('Error creating component properties:', propsError);
        throw new Error(`Failed to create component properties: ${propsError.message}`);
      }
    }
    
    return componentId;
  } catch (error) {
    console.error('Unexpected error creating component:', error);
    throw error;
  }
}

/**
 * Update an existing component in the library
 */
export async function updateComponent(component: ComponentLibraryItem): Promise<void> {
  if (!component.id) {
    throw new Error('Component ID is required for updates');
  }
  
  try {
    // Update basic component info
    const { error } = await supabaseClient
      .from('components')
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
      throw new Error(`Failed to update component: ${error.message}`);
    }
    
    // Handle pins update if provided
    if (component.pins) {
      // Delete existing pins
      const { error: deleteError } = await supabaseClient
        .from('component_pins')
        .delete()
        .eq('component_id', component.id);
        
      if (deleteError) {
        console.error(`Error deleting pins for component ${component.id}:`, deleteError);
        throw new Error(`Failed to update component pins: ${deleteError.message}`);
      }
      
      // Create new pins
      if (component.pins.length > 0) {
        const pinsToInsert = component.pins.map((pin, index) => ({
          component_id: component.id,
          name: pin.name,
          x: pin.x,
          y: pin.y,
          signals: pin.signals || [],
          index
        }));
        
        const { error: pinsError } = await supabaseClient
          .from('component_pins')
          .insert(pinsToInsert);
          
        if (pinsError) {
          console.error(`Error creating pins for component ${component.id}:`, pinsError);
          throw new Error(`Failed to update component pins: ${pinsError.message}`);
        }
      }
    }
    
    // Handle properties update if provided
    if (component.properties) {
      // Delete existing properties
      const { error: deletePropsError } = await supabaseClient
        .from('component_properties')
        .delete()
        .eq('component_id', component.id);
        
      if (deletePropsError) {
        console.error(`Error deleting properties for component ${component.id}:`, deletePropsError);
        throw new Error(`Failed to update component properties: ${deletePropsError.message}`);
      }
      
      // Create new properties
      if (Object.keys(component.properties).length > 0) {
        const propsToInsert = Object.entries(component.properties).map(([key, value]) => ({
          component_id: component.id,
          key,
          value
        }));
        
        const { error: propsError } = await supabaseClient
          .from('component_properties')
          .insert(propsToInsert);
          
        if (propsError) {
          console.error(`Error creating properties for component ${component.id}:`, propsError);
          throw new Error(`Failed to update component properties: ${propsError.message}`);
        }
      }
    }
  } catch (error) {
    console.error(`Unexpected error updating component ${component.id}:`, error);
    throw error;
  }
}

/**
 * Delete a component from the library
 */
export async function deleteComponent(id: string): Promise<void> {
  try {
    // Cascade delete will handle pins and properties
    const { error } = await supabaseClient
      .from('components')
      .delete()
      .eq('id', id);
      
    if (error) {
      console.error(`Error deleting component ${id}:`, error);
      throw new Error(`Failed to delete component: ${error.message}`);
    }
  } catch (error) {
    console.error(`Unexpected error deleting component ${id}:`, error);
    throw error;
  }
}
