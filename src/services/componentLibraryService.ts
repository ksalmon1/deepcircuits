
import { supabase } from '@/integrations/supabase/client';
import { WokwiPin } from '@/integrations/wokwi/WokwiIntegration';
import { CUSTOM_COMPONENTS } from '@/integrations/custom/CustomComponents';
import { ComponentLibraryItem } from './componentLibrary/types';

// Get all components from the library
export const getAllComponents = async (): Promise<ComponentLibraryItem[]> => {
  try {
    const { data: supabaseComponents, error } = await supabase
      .from('component_library')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching components:', error);
      throw error;
    }

    // Map database components to ComponentLibraryItem format
    const mappedDbComponents: ComponentLibraryItem[] = (supabaseComponents || []).map(comp => ({
      id: comp.id,
      name: comp.name,
      type: comp.type,
      category: comp.category,
      description: comp.description,
      svgPath: comp.svg_path,
      enabled: comp.enabled,
      isOriginal: comp.is_original,
      createdAt: comp.created_at,
      updatedAt: comp.updated_at
    }));

    return mappedDbComponents;
  } catch (error) {
    console.error('Error in getAllComponents:', error);
    return [];
  }
};

// Get a component by ID
export const getComponent = async (id: string): Promise<ComponentLibraryItem | null> => {
  try {
    const { data, error } = await supabase
      .from('component_library')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching component:', error);
      throw error;
    }

    if (!data) return null;

    return {
      id: data.id,
      name: data.name,
      type: data.type,
      category: data.category,
      description: data.description,
      svgPath: data.svg_path,
      enabled: data.enabled,
      isOriginal: data.is_original,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  } catch (error) {
    console.error('Error in getComponent:', error);
    return null;
  }
};

// Create a new component
export const createComponent = async (component: ComponentLibraryItem): Promise<ComponentLibraryItem | null> => {
  try {
    console.log('Creating component with data:', {
      name: component.name,
      type: component.type,
      pins: component.pins?.length,
      properties: component.properties ? Object.keys(component.properties).length : 0
    });

    // First, insert the component basic information
    const { data, error } = await supabase
      .from('component_library')
      .insert([{
        name: component.name,
        type: component.type,
        category: component.category,
        description: component.description,
        svg_path: component.svgPath,
        enabled: component.enabled,
        is_original: component.isOriginal
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating component:', error);
      throw error;
    }

    const componentId = data.id;
    console.log('Component created with ID:', componentId);

    // Insert pins if provided
    if (component.pins && component.pins.length > 0) {
      console.log(`Inserting ${component.pins.length} pins for component ${componentId}`);
      const pinsToInsert = component.pins.map(pin => ({
        component_id: componentId,
        name: pin.name,
        x: pin.x,
        y: pin.y,
        signals: pin.signals || []
      }));

      const { error: pinsError } = await supabase
        .from('component_pins')
        .insert(pinsToInsert);

      if (pinsError) {
        console.error('Error inserting pins:', pinsError);
        // Continue despite pin errors
      }
    }

    // Insert properties if provided
    if (component.properties && Object.keys(component.properties).length > 0) {
      console.log(`Inserting ${Object.keys(component.properties).length} properties for component ${componentId}`);
      const propertiesToInsert = Object.entries(component.properties).map(([key, value]) => ({
        component_id: componentId,
        property_key: key,
        property_value: value
      }));

      const { error: propertiesError } = await supabase
        .from('component_properties')
        .insert(propertiesToInsert);

      if (propertiesError) {
        console.error('Error inserting properties:', propertiesError);
        // Continue despite property errors
      }
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
      pins: component.pins,
      properties: component.properties,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  } catch (error) {
    console.error('Error in createComponent:', error);
    return null;
  }
};

// Update an existing component
export const updateComponent = async (component: ComponentLibraryItem): Promise<ComponentLibraryItem | null> => {
  try {
    console.log('Updating component with ID:', component.id);
    console.log('Component data:', {
      name: component.name,
      type: component.type,
      pins: component.pins?.length,
      properties: component.properties ? Object.keys(component.properties).length : 0
    });

    // Update basic component information
    const { data, error } = await supabase
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
      .eq('id', component.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating component:', error);
      throw error;
    }

    // Handle pins update - first delete existing pins
    console.log(`Deleting existing pins for component ${component.id}`);
    const { error: deletePinsError } = await supabase
      .from('component_pins')
      .delete()
      .eq('component_id', component.id);

    if (deletePinsError) {
      console.error('Error deleting existing pins:', deletePinsError);
      // Continue despite errors
    }

    // Insert new pins if provided
    if (component.pins && component.pins.length > 0) {
      console.log(`Inserting ${component.pins.length} pins for component ${component.id}`);
      const pinsToInsert = component.pins.map(pin => ({
        component_id: component.id,
        name: pin.name,
        x: pin.x,
        y: pin.y,
        signals: pin.signals || []
      }));

      const { error: insertPinsError } = await supabase
        .from('component_pins')
        .insert(pinsToInsert);

      if (insertPinsError) {
        console.error('Error inserting pins:', insertPinsError);
        // Continue despite errors
      }
    }

    // Handle properties update - first delete existing properties
    console.log(`Deleting existing properties for component ${component.id}`);
    const { error: deletePropertiesError } = await supabase
      .from('component_properties')
      .delete()
      .eq('component_id', component.id);

    if (deletePropertiesError) {
      console.error('Error deleting existing properties:', deletePropertiesError);
      // Continue despite errors
    }

    // Insert new properties if provided
    if (component.properties && Object.keys(component.properties).length > 0) {
      console.log(`Inserting ${Object.keys(component.properties).length} properties for component ${component.id}`);
      const propertiesToInsert = Object.entries(component.properties).map(([key, value]) => ({
        component_id: component.id,
        property_key: key,
        property_value: value
      }));

      const { error: insertPropertiesError } = await supabase
        .from('component_properties')
        .insert(propertiesToInsert);

      if (insertPropertiesError) {
        console.error('Error inserting properties:', insertPropertiesError);
        // Continue despite errors
      }
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
      pins: component.pins,
      properties: component.properties,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  } catch (error) {
    console.error('Error in updateComponent:', error);
    return null;
  }
};

// Delete a component by ID
export const deleteComponent = async (id: string): Promise<string | null> => {
  try {
    // Note: We don't need to manually delete pins and properties 
    // as they should have ON DELETE CASCADE constraints
    const { data, error } = await supabase
      .from('component_library')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting component:', error);
      throw error;
    }

    return id;
  } catch (error) {
    console.error('Error in deleteComponent:', error);
    return null;
  }
};

// Get a component with all its details
export const getComponentWithDetails = async (id: string): Promise<ComponentLibraryItem | null> => {
  try {
    console.log('Fetching component details for ID:', id);

    // First try to use the RPC function
    const { data: rpcData, error: rpcError } = await supabase
      .rpc('get_component_with_details', { component_id: id });

    if (rpcError) {
      console.error('Error fetching component details via RPC:', rpcError);
      console.log('Falling back to direct queries');
      
      // Get component basic info
      const { data: componentData, error: componentError } = await supabase
        .from('component_library')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (componentError) {
        console.error('Error fetching component:', componentError);
        throw componentError;
      }

      if (!componentData) {
        console.log(`No component found with ID: ${id}`);
        return null;
      }

      // Get component pins
      const { data: pinsData, error: pinsError } = await supabase
        .from('component_pins')
        .select('*')
        .eq('component_id', id);

      if (pinsError) {
        console.error('Error fetching pins:', pinsError);
        // Continue despite errors
      }

      // Get component properties
      const { data: propertiesData, error: propertiesError } = await supabase
        .from('component_properties')
        .select('*')
        .eq('component_id', id);

      if (propertiesError) {
        console.error('Error fetching properties:', propertiesError);
        // Continue despite errors
      }

      // Convert properties to key-value object
      let properties: Record<string, any> = {};
      if (propertiesData && propertiesData.length > 0) {
        properties = propertiesData.reduce((props, prop) => {
          props[prop.property_key] = prop.property_value;
          return props;
        }, {} as Record<string, any>);
      }

      return {
        id: componentData.id,
        name: componentData.name,
        type: componentData.type,
        category: componentData.category,
        description: componentData.description,
        svgPath: componentData.svg_path,
        enabled: componentData.enabled,
        isOriginal: componentData.is_original,
        pins: pinsData || [],
        properties: properties,
        createdAt: componentData.created_at,
        updatedAt: componentData.updated_at
      };
    }

    // If RPC was successful, map the data to our ComponentLibraryItem format
    console.log('RPC successful, mapping data...');
    
    if (!rpcData) {
      console.error('RPC returned no data for component ID:', id);
      return null;
    }

    // Type check and handle RPC data
    if (typeof rpcData !== 'object' || rpcData === null) {
      console.error('RPC returned invalid data format for component ID:', id, rpcData);
      return null;
    }

    // Extract data with proper type checking
    const componentData = rpcData.component ? 
      (typeof rpcData.component === 'object' ? rpcData.component : {}) : {};
    
    const pins = rpcData.pins ? 
      (Array.isArray(rpcData.pins) ? rpcData.pins : []) : [];
    
    const properties = rpcData.properties ? 
      (typeof rpcData.properties === 'object' ? rpcData.properties : {}) : {};

    console.log('Mapped component data:', {
      id: componentData.id,
      type: componentData.type,
      pins: Array.isArray(pins) ? pins.length : 0,
      properties: properties ? Object.keys(properties).length : 0
    });

    return {
      id: componentData.id,
      name: componentData.name,
      type: componentData.type,
      category: componentData.category,
      description: componentData.description,
      svgPath: componentData.svg_path,
      enabled: componentData.enabled,
      isOriginal: componentData.is_original,
      pins: pins,
      properties: properties,
      createdAt: componentData.created_at,
      updatedAt: componentData.updated_at
    };
  } catch (error) {
    console.error('Error in getComponentWithDetails:', error);
    return null;
  }
};

// Export ComponentLibraryItem type
export type { ComponentLibraryItem };
