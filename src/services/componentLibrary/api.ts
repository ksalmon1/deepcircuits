
import { supabase } from "@/integrations/supabase/client";
import { mapComponentFromDb } from "./utils";
import { ComponentLibraryItem } from "./types";

/**
 * Get all components from the component library
 */
export const getAllComponents = async (): Promise<ComponentLibraryItem[]> => {
  try {
    const { data, error } = await supabase
      .from('component_library')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching components:', error);
      throw error;
    }

    return data.map(mapComponentFromDb);
  } catch (error) {
    console.error('Error in getAllComponents:', error);
    throw error;
  }
};

/**
 * Get a component with all its details (pins and properties)
 * First tries to use RPC function, falls back to direct queries if needed
 */
export const getComponentWithDetails = async (componentId: string): Promise<any> => {
  try {
    console.log('Fetching component details for ID:', componentId);
    
    // First try to use the RPC function
    const { data: rpcData, error: rpcError } = await supabase
      .rpc('get_component_with_details', { component_id: componentId });

    if (rpcError) {
      console.error('Error fetching component details via RPC:', rpcError);
      console.log('Falling back to direct queries');
      return await getComponentDetailsDirectly(componentId);
    }

    if (!rpcData) {
      // If no data returned from RPC, fall back to direct queries
      console.log('No data returned from RPC, falling back to direct queries');
      return await getComponentDetailsDirectly(componentId);
    }
    
    console.log('Component details fetched via RPC:', rpcData);
    return rpcData;
  } catch (error) {
    console.error('Error in getComponentWithDetails:', error);
    console.log('Falling back to direct queries due to error');
    return await getComponentDetailsDirectly(componentId);
  }
};

/**
 * Fallback function to get component details directly from the tables
 */
const getComponentDetailsDirectly = async (componentId: string): Promise<any> => {
  try {
    console.log('Getting component details directly for ID:', componentId);
    
    // Get component basic info
    const { data: componentData, error: componentError } = await supabase
      .from('component_library')
      .select('*')
      .eq('id', componentId)
      .single();

    if (componentError) {
      console.error('Error fetching component:', componentError);
      throw componentError;
    }

    // Get component pins
    const { data: pinsData, error: pinsError } = await supabase
      .from('component_pins')
      .select('*')
      .eq('component_id', componentId);

    if (pinsError) {
      console.error('Error fetching pins:', pinsError);
      throw pinsError;
    }

    // Get component properties
    const { data: propertiesData, error: propertiesError } = await supabase
      .from('component_properties')
      .select('*')
      .eq('component_id', componentId);

    if (propertiesError) {
      console.error('Error fetching properties:', propertiesError);
      throw propertiesError;
    }

    console.log('Component data:', componentData);
    console.log('Pins data:', pinsData);
    console.log('Properties data:', propertiesData);

    // Convert properties to key-value pairs
    const properties: Record<string, any> = {};
    propertiesData.forEach(prop => {
      properties[prop.property_key] = prop.property_value;
    });

    // Map pins to the expected format
    const pins = pinsData.map(pin => ({
      name: pin.name,
      x: pin.x,
      y: pin.y,
      signals: pin.signals || []
    }));

    // Construct the result object
    const component = mapComponentFromDb(componentData);
    
    return {
      component: component,
      pins: pins,
      properties: properties
    };
  } catch (error) {
    console.error('Error in getComponentDetailsDirectly:', error);
    throw error;
  }
};

/**
 * Create a new component with its pins and properties
 */
export const createComponent = async (component: ComponentLibraryItem): Promise<string> => {
  try {
    const { data: componentData, error: componentError } = await supabase
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

    if (componentError) {
      console.error('Error creating component:', componentError);
      throw componentError;
    }

    const componentId = componentData.id;

    if (component.pins && component.pins.length > 0) {
      await insertPins(componentId, component.pins);
    }

    if (component.properties && Object.keys(component.properties).length > 0) {
      await insertProperties(componentId, component.properties);
    }

    return componentId;
  } catch (error) {
    console.error('Error in createComponent:', error);
    throw error;
  }
};

/**
 * Update an existing component with its pins and properties
 */
export const updateComponent = async (component: ComponentLibraryItem): Promise<void> => {
  if (!component.id) {
    throw new Error('Component ID is required for update');
  }

  try {
    // Update component basic info
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
      throw componentError;
    }

    // Update pins if provided
    if (component.pins) {
      await updatePins(component.id, component.pins);
    }

    // Update properties if provided
    if (component.properties) {
      await updateProperties(component.id, component.properties);
    }
  } catch (error) {
    console.error('Error in updateComponent:', error);
    throw error;
  }
};

/**
 * Insert pins for a component
 */
const insertPins = async (componentId: string, pins: any[]): Promise<void> => {
  const pinsToInsert = pins.map(pin => ({
    component_id: componentId,
    name: pin.name,
    x: pin.x,
    y: pin.y,
    signals: pin.signals
  }));

  const { error } = await supabase
    .from('component_pins')
    .insert(pinsToInsert);

  if (error) {
    console.error('Error inserting pins:', error);
    throw error;
  }
};

/**
 * Update pins for a component (delete existing ones and insert new ones)
 */
const updatePins = async (componentId: string, pins: any[]): Promise<void> => {
  // Delete existing pins
  const { error: deletePinsError } = await supabase
    .from('component_pins')
    .delete()
    .eq('component_id', componentId);

  if (deletePinsError) {
    console.error('Error deleting existing pins:', deletePinsError);
    throw deletePinsError;
  }

  // Insert new pins if any
  if (pins.length > 0) {
    await insertPins(componentId, pins);
  }
};

/**
 * Insert properties for a component
 */
const insertProperties = async (componentId: string, properties: Record<string, any>): Promise<void> => {
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
    throw error;
  }
};

/**
 * Update properties for a component (delete existing ones and insert new ones)
 */
const updateProperties = async (componentId: string, properties: Record<string, any>): Promise<void> => {
  // Delete existing properties
  const { error: deletePropertiesError } = await supabase
    .from('component_properties')
    .delete()
    .eq('component_id', componentId);

  if (deletePropertiesError) {
    console.error('Error deleting existing properties:', deletePropertiesError);
    throw deletePropertiesError;
  }

  // Insert new properties if any
  if (Object.keys(properties).length > 0) {
    await insertProperties(componentId, properties);
  }
};

/**
 * Delete a component and its associated pins and properties
 */
export const deleteComponent = async (componentId: string): Promise<void> => {
  try {
    // No need to delete pins and properties separately due to cascade delete
    const { error } = await supabase
      .from('component_library')
      .delete()
      .eq('id', componentId);

    if (error) {
      console.error('Error deleting component:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in deleteComponent:', error);
    throw error;
  }
};
