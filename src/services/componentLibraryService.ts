
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface ComponentPin {
  id?: string;
  name: string;
  x: number;
  y: number;
  signals?: string[];
}

export interface ComponentProperty {
  key: string;
  value: any;
}

export interface ComponentLibraryItem {
  id?: string;
  name: string;
  type: string;
  category: string;
  description?: string;
  svgPath?: string;
  enabled: boolean;
  isOriginal: boolean;
  pins?: ComponentPin[];
  properties?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}

// Convert database response to our frontend model
const mapComponentFromDb = (dbComponent: any): ComponentLibraryItem => {
  return {
    id: dbComponent.id,
    name: dbComponent.name,
    type: dbComponent.type,
    category: dbComponent.category,
    description: dbComponent.description,
    svgPath: dbComponent.svg_path,
    enabled: dbComponent.enabled,
    isOriginal: dbComponent.is_original,
    createdAt: dbComponent.created_at,
    updatedAt: dbComponent.updated_at,
  };
};

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
 */
export const getComponentWithDetails = async (componentId: string): Promise<any> => {
  try {
    const { data, error } = await supabase
      .rpc('get_component_with_details', { component_id: componentId });

    if (error) {
      console.error('Error fetching component details:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in getComponentWithDetails:', error);
    throw error;
  }
};

/**
 * Create a new component with its pins and properties
 */
export const createComponent = async (component: ComponentLibraryItem): Promise<string> => {
  try {
    // Start a transaction to ensure all operations succeed or fail together
    // 1. Insert the component
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

    // 2. Insert pins if they exist
    if (component.pins && component.pins.length > 0) {
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
        console.error('Error creating pins:', pinsError);
        throw pinsError;
      }
    }

    // 3. Insert properties if they exist
    if (component.properties && Object.keys(component.properties).length > 0) {
      const propertiesToInsert = Object.entries(component.properties).map(([key, value]) => ({
        component_id: componentId,
        property_key: key,
        property_value: value
      }));

      const { error: propertiesError } = await supabase
        .from('component_properties')
        .insert(propertiesToInsert);

      if (propertiesError) {
        console.error('Error creating properties:', propertiesError);
        throw propertiesError;
      }
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
    // 1. Update the component
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

    // 2. Handle pins: Remove existing ones and add new ones
    if (component.pins) {
      // Delete all existing pins
      const { error: deletePinsError } = await supabase
        .from('component_pins')
        .delete()
        .eq('component_id', component.id);

      if (deletePinsError) {
        console.error('Error deleting existing pins:', deletePinsError);
        throw deletePinsError;
      }

      // Add new pins
      if (component.pins.length > 0) {
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
          throw insertPinsError;
        }
      }
    }

    // 3. Handle properties: Remove existing ones and add new ones
    if (component.properties) {
      // Delete all existing properties
      const { error: deletePropertiesError } = await supabase
        .from('component_properties')
        .delete()
        .eq('component_id', component.id);

      if (deletePropertiesError) {
        console.error('Error deleting existing properties:', deletePropertiesError);
        throw deletePropertiesError;
      }

      // Add new properties
      if (Object.keys(component.properties).length > 0) {
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
          throw insertPropertiesError;
        }
      }
    }
  } catch (error) {
    console.error('Error in updateComponent:', error);
    throw error;
  }
};

/**
 * Delete a component and its associated pins and properties
 */
export const deleteComponent = async (componentId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('component_library')
      .delete()
      .eq('id', componentId);

    if (error) {
      console.error('Error deleting component:', error);
      throw error;
    }
    // No need to delete pins and properties separately as they have ON DELETE CASCADE
  } catch (error) {
    console.error('Error in deleteComponent:', error);
    throw error;
  }
};

/**
 * React Query hook wrapper for the component library service
 */
export const useComponentLibraryService = () => {
  const { toast } = useToast();

  return {
    getAllComponents: async () => {
      try {
        return await getAllComponents();
      } catch (error) {
        toast({
          title: "Error fetching components",
          description: error instanceof Error ? error.message : "An unknown error occurred",
          variant: "destructive"
        });
        return [];
      }
    },
    
    getComponentWithDetails: async (componentId: string) => {
      try {
        return await getComponentWithDetails(componentId);
      } catch (error) {
        toast({
          title: "Error fetching component details",
          description: error instanceof Error ? error.message : "An unknown error occurred",
          variant: "destructive"
        });
        return null;
      }
    },
    
    createComponent: async (component: ComponentLibraryItem) => {
      try {
        const id = await createComponent(component);
        toast({
          title: "Component created",
          description: `${component.name} has been added to the library.`,
        });
        return id;
      } catch (error) {
        toast({
          title: "Error creating component",
          description: error instanceof Error ? error.message : "An unknown error occurred",
          variant: "destructive"
        });
        throw error;
      }
    },
    
    updateComponent: async (component: ComponentLibraryItem) => {
      try {
        await updateComponent(component);
        toast({
          title: "Component updated",
          description: `${component.name} has been updated successfully.`,
        });
      } catch (error) {
        toast({
          title: "Error updating component",
          description: error instanceof Error ? error.message : "An unknown error occurred",
          variant: "destructive"
        });
        throw error;
      }
    },
    
    deleteComponent: async (componentId: string, componentName: string) => {
      try {
        await deleteComponent(componentId);
        toast({
          title: "Component deleted",
          description: `${componentName} has been removed from the library.`,
        });
      } catch (error) {
        toast({
          title: "Error deleting component",
          description: error instanceof Error ? error.message : "An unknown error occurred",
          variant: "destructive"
        });
        throw error;
      }
    }
  };
};
