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
      .single();

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
    console.error('Error in createComponent:', error);
    return null;
  }
};

// Update an existing component
export const updateComponent = async (component: ComponentLibraryItem): Promise<ComponentLibraryItem | null> => {
  if (!component.id) {
    throw new Error('Component ID is required for update');
  }

  try {
    console.log('Updating component:', component);
    
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

    console.log('Component basic info updated successfully');

    // Update pins if provided
    if (component.pins) {
      await updatePins(component.id, component.pins);
      console.log('Component pins updated successfully');
    }

    // Update properties if provided
    if (component.properties) {
      await updateProperties(component.id, component.properties);
      console.log('Component properties updated successfully');
    }
    
    // Return the updated component
    return component;
  } catch (error) {
    console.error('Error in updateComponent:', error);
    throw error;
  }
};

// Delete a component by ID
export const deleteComponent = async (id: string): Promise<string | null> => {
  try {
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
    const { data, error } = await supabase
      .from('component_library')
      .select(`
        *,
        component_pins(*)
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching component details:', error);
      throw error;
    }

    if (!data) return null;

    // Get properties separately since we can't do a nested select easily
    const { data: propertiesData, error: propertiesError } = await supabase
      .from('component_properties')
      .select('*')
      .eq('component_id', id);

    if (propertiesError) {
      console.error('Error fetching component properties:', propertiesError);
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
      id: data.id,
      name: data.name,
      type: data.type,
      category: data.category,
      description: data.description,
      svgPath: data.svg_path,
      enabled: data.enabled,
      isOriginal: data.is_original,
      pins: data.component_pins || [],
      properties: properties,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  } catch (error) {
    console.error('Error in getComponentWithDetails:', error);
    return null;
  }
};

// Helper functions for managing pins and properties
const insertPins = async (componentId: string, pins: any[]): Promise<void> => {
  try {
    await supabase
      .from('component_pins')
      .insert(pins.map(pin => ({
        component_id: componentId,
        name: pin.name,
        type: pin.type,
        position: pin.position,
        orientation: pin.orientation,
        value: pin.value,
        enabled: pin.enabled
      })));
  } catch (error) {
    console.error('Error inserting pins:', error);
  }
};

const updatePins = async (componentId: string, pins: any[]): Promise<void> => {
  try {
    await supabase
      .from('component_pins')
      .update(pins.map(pin => ({
        name: pin.name,
        type: pin.type,
        position: pin.position,
        orientation: pin.orientation,
        value: pin.value,
        enabled: pin.enabled
      }))
      .eq('component_id', componentId);
  } catch (error) {
    console.error('Error updating pins:', error);
  }
};

const insertProperties = async (componentId: string, properties: Record<string, any>): Promise<void> => {
  try {
    await supabase
      .from('component_properties')
      .insert(Object.entries(properties).map(([key, value]) => ({
        component_id: componentId,
        property_key: key,
        property_value: value
      })));
  } catch (error) {
    console.error('Error inserting properties:', error);
  }
};

const updateProperties = async (componentId: string, properties: Record<string, any>): Promise<void> => {
  try {
    await supabase
      .from('component_properties')
      .update(properties)
      .eq('component_id', componentId);
  } catch (error) {
    console.error('Error updating properties:', error);
  }
};

// Export ComponentLibraryItem type
export type { ComponentLibraryItem };
