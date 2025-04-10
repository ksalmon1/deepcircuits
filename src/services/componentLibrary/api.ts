import { supabase } from '@/integrations/supabase/client';
import { ComponentLibraryItem, ComponentMetadata } from '@/types/component';
import { ComponentPin } from '@/types/pin';

/**
 * Fetch all components from the library
 */
export async function getAllComponents(): Promise<ComponentLibraryItem[]> {
  try {
    const { data, error } = await supabase
      .from('component_library')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching components:', error);
      return [];
    }

    return data.map(component => ({
      id: component.id,
      name: component.name,
      type: component.type,
      category: component.category,
      description: component.description,
      svgPath: component.svg_path,
      enabled: component.enabled,
      isOriginal: component.is_original,
      pins: [],
      properties: {},
      createdAt: component.created_at,
      updatedAt: component.updated_at
    }));
  } catch (error) {
    console.error('Error in getAllComponents:', error);
    return [];
  }
}

/**
 * Get a component by ID
 */
export async function getComponentById(id: string): Promise<ComponentLibraryItem | null> {
  try {
    const { data, error } = await supabase
      .from('component_library')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching component by ID:', id, error);
      return null;
    }

    if (!data) {
      console.log('Component not found with ID:', id);
      return null;
    }

    return {
      id: data.id,
      name: data.name,
      type: data.type,
      category: data.category,
      description: data.description,
      svgPath: data.svg_path,
      enabled: data.enabled,
      isOriginal: data.is_original,
      pins: [],
      properties: {},
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  } catch (error) {
    console.error('Error in getComponentById:', error);
    return null;
  }
}

/**
 * Search components by name
 */
export async function searchComponents(query: string): Promise<ComponentLibraryItem[]> {
  try {
    const { data, error } = await supabase
      .from('component_library')
      .select('*')
      .ilike('name', `%${query}%`)
      .limit(10);

    if (error) {
      console.error('Error searching components:', error);
      return [];
    }

    return data.map(component => ({
      id: component.id,
      name: component.name,
      type: component.type,
      category: component.category,
      description: component.description,
      svgPath: component.svg_path,
      enabled: component.enabled,
      isOriginal: component.is_original,
      pins: [],
      properties: {},
      createdAt: component.created_at,
      updatedAt: component.updated_at
    }));
  } catch (error) {
    console.error('Error in searchComponents:', error);
    return [];
  }
}

/**
 * Get component with details including pins and properties
 */
export async function getComponentWithDetails(id: string): Promise<ComponentLibraryItem | null> {
  try {
    //console.log('Getting component with details for ID:', id);

    const { data: rpcData, error: rpcError } = await supabase.rpc('get_component_with_details', {
      component_id_input: id 
    });

    if (rpcError) {
      console.error('Error in RPC get_component_with_details:', rpcError);
      throw new Error(`RPC Error (${rpcError.code}): ${rpcError.message}. Hint: ${rpcError.hint}`); 
    }

    if (!rpcData) {
      console.log('No data returned from RPC for component ID:', id);
      return null;
    }

    if (typeof rpcData !== 'object' || rpcData === null) {
      console.error('RPC returned invalid data format for component ID:', id, rpcData);
      throw new Error('Invalid data format received from component details RPC.');
    }

    const rpcDataObj = rpcData as {
      component: Record<string, any> | null;
      pins: ComponentPin[] | null;
      properties: Record<string, any> | null;
    };
    
    const componentData = rpcDataObj.component;
    const pins = rpcDataObj.pins || [];
    const properties = rpcDataObj.properties || {};

    if (!componentData) {
        console.warn('Component data was null in RPC response for ID:', id);
        return null;
    }

    // console.log('Mapped component data:', {
    //   id: componentData.id,
    //   type: componentData.type,
    //   pins: pins.length,
    //   properties: Object.keys(properties).length
    // });

    return {
      id: componentData.id,
      name: componentData.name,
      type: componentData.type,
      category: componentData.category,
      description: componentData.description,
      svgPath: componentData.svg_path,
      enabled: componentData.enabled,
      isOriginal: componentData.is_original,
      pins: pins.map(pin => ({
        id: pin.id,
        name: pin.name,
        x: pin.x,
        y: pin.y,
        signals: pin.signals,
        handle_id: pin.handle_id
      })),
      properties: properties,
      createdAt: componentData.created_at,
      updatedAt: componentData.updated_at
    };
  } catch (error) {
    console.error('Error caught in getComponentWithDetails wrapper:', error);
    throw error; 
  }
}

/**
 * Create a new component
 */
export async function createComponent(component: ComponentLibraryItem): Promise<string> {
  try {
    const { data, error } = await supabase.from('component_library').insert({
      name: component.name,
      type: component.type,
      category: component.category,
      description: component.description,
      svg_path: component.svgPath,
      enabled: component.enabled,
      is_original: component.isOriginal
    }).select().single();

    if (error) {
      console.error('Error creating component:', error);
      throw new Error(error.message);
    }

    // Insert pins if provided
    if (component.pins && component.pins.length > 0) {
      await insertPins(data.id, component.pins);
    }

    // Insert properties if provided
    if (component.properties && Object.keys(component.properties).length > 0) {
      await insertProperties(data.id, component.properties);
    }

    return data.id;
  } catch (error) {
    console.error('Error in createComponent:', error);
    throw error;
  }
}

/**
 * Update an existing component
 */
export async function updateComponent(component: ComponentLibraryItem): Promise<void> {
  try {
    if (!component.id) {
      console.error('Component ID is missing for update');
      throw new Error('Component ID is required');
    }

    // console.log('Updating component ID:', component.id, 'with data:', {
    //   name: component.name,
    //   type: component.type,
    //   pins: component.pins?.length || 0,
    //   properties: component.properties ? Object.keys(component.properties).length : 0
    // });

    // First, update the component basic info
    const { error: componentError } = await supabase
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

    if (componentError) {
      console.error('Error updating component:', componentError);
      throw new Error(componentError.message);
    }

    // Update pins if provided
    if (component.pins) {
      //console.log(`Updating ${component.pins.length} pins for component ${component.id}:`, component.pins);
      await updatePins(component.id, component.pins);
    }

    // Update properties if provided
    if (component.properties) {
      //console.log(`Updating ${Object.keys(component.properties).length} properties for component ${component.id}:`, component.properties);
      await updateProperties(component.id, component.properties);
    }
  } catch (error) {
    console.error('Error in updateComponent:', error);
    throw error;
  }
}

/**
 * Delete a component
 */
export async function deleteComponent(id: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('component_library')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting component:', error);
      throw new Error(error.message);
    }
  } catch (error) {
    console.error('Error in deleteComponent:', error);
    throw error;
  }
}

/**
 * Helper to insert pins for a component
 */
async function insertPins(componentId: string, pins: ComponentPin[]): Promise<void> {
  try {
    const pinsToInsert = pins.map((pin, index) => ({
      component_id: componentId,
      name: pin.name,
      x: pin.x,
      y: pin.y,
      signals: pin.signals,
      // Ensure the handle_id is included in the insert data
      handle_id: pin.handle_id || `pin-${index}` // Provide a default if missing, though it should be set in UI
    }));

    //console.log(`Inserting ${pinsToInsert.length} pins:`, pinsToInsert);

    const { error } = await supabase.from('component_pins').insert(pinsToInsert);

    if (error) {
      console.error('Error inserting pins:', error);
      throw new Error(error.message);
    }
  } catch (error) {
    console.error('Error in insertPins:', error);
    throw error;
  }
}

/**
 * Helper to update pins for a component (delete old, insert new)
 */
async function updatePins(componentId: string, pins: ComponentPin[]): Promise<void> {
  try {
    // Delete existing pins
    //console.log('Deleting existing pins for component:', componentId);
    const { error: deleteError } = await supabase
      .from('component_pins')
      .delete()
      .eq('component_id', componentId);

    if (deleteError) {
      console.error('Error deleting old pins:', deleteError);
      throw new Error(deleteError.message);
    }

    // Insert new pins if any exist
    if (pins.length > 0) {
      await insertPins(componentId, pins);
    }
    //console.log('Pins updated successfully for component:', componentId);
  } catch (error) {
    console.error('Error in updatePins:', error);
    throw error;
  }
}

// Helper functions for component properties
async function insertProperties(componentId: string, properties: Record<string, any>): Promise<void> {
  try {
    if (!properties || Object.keys(properties).length === 0) {
      return;
    }

    const propertiesToInsert = Object.entries(properties).map(([key, value]) => ({
      component_id: componentId,
      property_key: key,
      property_value: value
    }));

    const { error } = await supabase
      .from('component_properties')
      .insert(propertiesToInsert);

    if (error) {
      console.error('Error inserting properties:', error);
      throw new Error(error.message);
    }
  } catch (error) {
    console.error('Error in insertProperties:', error);
    throw error;
  }
}

async function updateProperties(componentId: string, properties: Record<string, any>): Promise<void> {
  try {
    // Delete existing properties
    const { error: deleteError } = await supabase
      .from('component_properties')
      .delete()
      .eq('component_id', componentId);

    if (deleteError) {
      console.error('Error deleting existing properties:', deleteError);
      throw new Error(deleteError.message);
    }

    // Skip insertion if no properties to add
    if (!properties || Object.keys(properties).length === 0) {
      return;
    }

    // Insert new properties
    await insertProperties(componentId, properties);
  } catch (error) {
    console.error('Error in updateProperties:', error);
    throw error;
  }
}
