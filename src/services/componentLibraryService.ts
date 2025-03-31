
import { supabase } from '@/integrations/supabase/client';
import { ComponentLibraryItem } from '@/services/componentLibrary/types';
import { WokwiComponent, WokwiPin } from '@/integrations/wokwi/WokwiIntegration';

export type { ComponentLibraryItem };

export async function getComponents(): Promise<ComponentLibraryItem[]> {
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
    console.error('Error in getComponents:', error);
    return [];
  }
}

export const getAllComponents = getComponents;

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

export async function getComponentWithDetails(id: string): Promise<ComponentLibraryItem | null> {
  try {
    console.log('Getting component with details for ID:', id);

    const { data: rpcData, error: rpcError } = await supabase.rpc('get_component_with_details', {
      component_id: id
    });

    if (rpcError) {
      console.error('Error in RPC get_component_with_details:', rpcError);
      return null;
    }

    if (!rpcData) {
      console.log('No data returned from RPC for component ID:', id);
      return null;
    }

    if (typeof rpcData !== 'object' || rpcData === null) {
      console.error('RPC returned invalid data format for component ID:', id, rpcData);
      return null;
    }

    const rpcDataObj = rpcData as Record<string, any>;
    const componentData = rpcDataObj.component as Record<string, any> || {};
    const pins = Array.isArray(rpcDataObj.pins) ? rpcDataObj.pins : [];
    const properties = typeof rpcDataObj.properties === 'object' ? rpcDataObj.properties as Record<string, any> : {};

    console.log('Mapped component data:', {
      id: componentData.id,
      type: componentData.type,
      pins: pins.length,
      properties: Object.keys(properties).length
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
}

export async function createComponent(component: ComponentLibraryItem): Promise<{ success: boolean; data?: ComponentLibraryItem; error?: string }> {
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
      return { success: false, error: error.message };
    }

    // Insert pins if provided
    if (component.pins && component.pins.length > 0) {
      await insertPins(data.id, component.pins);
    }

    // Insert properties if provided
    if (component.properties && Object.keys(component.properties).length > 0) {
      await insertProperties(data.id, component.properties);
    }

    return { 
      success: true, 
      data: {
        id: data.id,
        name: data.name,
        type: data.type,
        category: data.category,
        description: data.description,
        svgPath: data.svg_path,
        enabled: data.enabled,
        isOriginal: data.is_original,
        pins: component.pins || [],
        properties: component.properties || {},
        createdAt: data.created_at,
        updatedAt: data.updated_at
      }
    };
  } catch (error) {
    console.error('Error in createComponent:', error);
    return { success: false, error: 'Failed to create component' };
  }
}

export async function updateComponent(component: ComponentLibraryItem): Promise<{ success: boolean; error?: string }> {
  try {
    if (!component.id) {
      console.error('Component ID is missing for update');
      return { success: false, error: 'Component ID is required' };
    }

    console.log('Updating component ID:', component.id, 'with data:', {
      name: component.name,
      type: component.type,
      pins: component.pins?.length || 0,
      properties: component.properties ? Object.keys(component.properties).length : 0
    });

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
      return { success: false, error: componentError.message };
    }

    // Update pins if provided
    if (component.pins) {
      console.log(`Updating ${component.pins.length} pins for component ${component.id}:`, component.pins);
      const pinsResult = await updatePins(component.id, component.pins);
      if (!pinsResult.success) {
        return { success: false, error: pinsResult.error };
      }
    }

    // Update properties if provided
    if (component.properties) {
      console.log(`Updating ${Object.keys(component.properties).length} properties for component ${component.id}:`, component.properties);
      const propertiesResult = await updateProperties(component.id, component.properties);
      if (!propertiesResult.success) {
        return { success: false, error: propertiesResult.error };
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Error in updateComponent:', error);
    return { success: false, error: 'Failed to update component' };
  }
}

export async function deleteComponent(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('component_library')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting component:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in deleteComponent:', error);
    return { success: false, error: 'Failed to delete component' };
  }
}

// Helper functions for component pins
async function insertPins(componentId: string, pins: WokwiPin[]): Promise<{ success: boolean; error?: string }> {
  try {
    if (!pins || pins.length === 0) {
      return { success: true };
    }

    const pinsToInsert = pins.map(pin => ({
      component_id: componentId,
      name: pin.name,
      x: pin.x,
      y: pin.y,
      signals: Array.isArray(pin.signals) ? pin.signals : []
    }));

    const { error } = await supabase
      .from('component_pins')
      .insert(pinsToInsert);

    if (error) {
      console.error('Error inserting pins:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in insertPins:', error);
    return { success: false, error: 'Failed to insert pins' };
  }
}

async function updatePins(componentId: string, pins: WokwiPin[]): Promise<{ success: boolean; error?: string }> {
  try {
    // Delete existing pins
    const { error: deleteError } = await supabase
      .from('component_pins')
      .delete()
      .eq('component_id', componentId);

    if (deleteError) {
      console.error('Error deleting existing pins:', deleteError);
      return { success: false, error: deleteError.message };
    }

    // Skip insertion if no pins to add
    if (!pins || pins.length === 0) {
      return { success: true };
    }

    // Insert new pins
    return insertPins(componentId, pins);
  } catch (error) {
    console.error('Error in updatePins:', error);
    return { success: false, error: 'Failed to update pins' };
  }
}

// Helper functions for component properties
async function insertProperties(componentId: string, properties: Record<string, any>): Promise<{ success: boolean; error?: string }> {
  try {
    if (!properties || Object.keys(properties).length === 0) {
      return { success: true };
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
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in insertProperties:', error);
    return { success: false, error: 'Failed to insert properties' };
  }
}

async function updateProperties(componentId: string, properties: Record<string, any>): Promise<{ success: boolean; error?: string }> {
  try {
    // Delete existing properties
    const { error: deleteError } = await supabase
      .from('component_properties')
      .delete()
      .eq('component_id', componentId);

    if (deleteError) {
      console.error('Error deleting existing properties:', deleteError);
      return { success: false, error: deleteError.message };
    }

    // Skip insertion if no properties to add
    if (!properties || Object.keys(properties).length === 0) {
      return { success: true };
    }

    // Insert new properties
    return insertProperties(componentId, properties);
  } catch (error) {
    console.error('Error in updateProperties:', error);
    return { success: false, error: 'Failed to update properties' };
  }
}

export function convertLibraryItemToWokwiComponent(item: ComponentLibraryItem): WokwiComponent {
  return {
    id: item.id || crypto.randomUUID(),
    type: item.type,
    top: 0,
    left: 0,
    attributes: {},
    pins: item.pins || [],
    svgPath: item.svgPath,
    isOriginal: item.isOriginal
  };
}
