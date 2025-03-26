import { supabase } from '@/integrations/supabase/client';
import { ComponentLibraryItem } from './componentLibrary/types';
import { CUSTOM_COMPONENTS } from '@/integrations/custom/CustomComponents';

// Get all components from the library
export const getAllComponents = async (): Promise<ComponentLibraryItem[]> => {
  try {
    const { data: supabaseComponents, error } = await supabase
      .from('components')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching components:', error);
      throw error;
    }

    // Convert array of CUSTOM_COMPONENTS to ComponentLibraryItem array
    const customComponents: ComponentLibraryItem[] = Object.values(CUSTOM_COMPONENTS).map(comp => ({
      id: comp.type,
      name: comp.name,
      type: comp.type,
      category: comp.category,
      description: comp.description,
      svgPath: comp.svgPath,
      enabled: true,
      isOriginal: false,
      pins: comp.pins,
      properties: comp.properties,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));

    // Combine database components with custom components
    return [...(supabaseComponents || []), ...customComponents];
  } catch (error) {
    console.error('Error in getAllComponents:', error);
    return [];
  }
};

// Get a component by ID
export const getComponent = async (id: string): Promise<ComponentLibraryItem | null> => {
  try {
    const { data, error } = await supabase
      .from('components')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching component:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in getComponent:', error);
    return null;
  }
};

// Create a new component
export const createComponent = async (component: ComponentLibraryItem): Promise<ComponentLibraryItem | null> => {
  try {
    const { data, error } = await supabase
      .from('components')
      .insert([component])
      .select()
      .single();

    if (error) {
      console.error('Error creating component:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in createComponent:', error);
    return null;
  }
};

// Update an existing component
export const updateComponent = async (component: ComponentLibraryItem): Promise<ComponentLibraryItem | null> => {
  try {
    const { data, error } = await supabase
      .from('components')
      .update(component)
      .eq('id', component.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating component:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in updateComponent:', error);
    return null;
  }
};

// Delete a component by ID
export const deleteComponent = async (id: string): Promise<string | null> => {
  try {
    const { data, error } = await supabase
      .from('components')
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
  // Check if it's a custom component first
  if (id.startsWith('custom-')) {
    const customComp = CUSTOM_COMPONENTS[id];
    if (customComp) {
      return {
        id: customComp.type,
        name: customComp.name,
        type: customComp.type,
        category: customComp.category,
        description: customComp.description,
        svgPath: customComp.svgPath,
        enabled: true,
        isOriginal: false,
        pins: customComp.pins,
        properties: customComp.properties,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }
  }

  try {
    const { data, error } = await supabase
      .from('components')
      .select(`
        *,
        pins (*)
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching component details:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in getComponentWithDetails:', error);
    return null;
  }
};
