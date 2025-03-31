import { supabase } from '@/supabaseClient';
import { WokwiComponent } from '@/integrations/wokwi/WokwiIntegration';

export async function getComponents(): Promise<WokwiComponent[]> {
  try {
    const { data, error } = await supabase
      .from('components')
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

export async function getComponentById(id: string): Promise<WokwiComponent | null> {
  try {
    const { data, error } = await supabase
      .from('components')
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

export async function searchComponents(query: string): Promise<WokwiComponent[]> {
  try {
    const { data, error } = await supabase
      .from('components')
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

export async function getComponentWithDetails(id: string): Promise<WokwiComponent | null> {
  try {
    console.log('Getting component with details for ID:', id);

    // Use the new RPC procedure
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

    // Type check and handle RPC data
    if (typeof rpcData !== 'object' || rpcData === null) {
      console.error('RPC returned invalid data format for component ID:', id, rpcData);
      return null;
    }

    // Safely access and type check each property
    const componentData = typeof rpcData === 'object' && rpcData !== null && 'component' in rpcData && 
      typeof rpcData.component === 'object' && rpcData.component !== null ? 
      (rpcData.component as Record<string, any>) : {};
    
    const pins = typeof rpcData === 'object' && rpcData !== null && 'pins' in rpcData && 
      Array.isArray(rpcData.pins) ? 
      (rpcData.pins as Array<any>) : [];
    
    const properties = typeof rpcData === 'object' && rpcData !== null && 'properties' in rpcData && 
      typeof rpcData.properties === 'object' && rpcData.properties !== null ? 
      (rpcData.properties as Record<string, any>) : {};

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
