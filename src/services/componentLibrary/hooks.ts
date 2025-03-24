
import { useToast } from "@/hooks/use-toast";
import { 
  getAllComponents, 
  getComponentWithDetails, 
  createComponent, 
  updateComponent, 
  deleteComponent 
} from "./api";
import { ComponentLibraryItem } from "./types";
import { useEffect, useState } from "react";

/**
 * React hook wrapper for the component library service
 * Provides toast notifications for success/error states
 */
export const useComponentLibraryService = () => {
  const { toast } = useToast();
  
  const [allComponents, setAllComponents] = useState<ComponentLibraryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [componentsWithDetails, setComponentsWithDetails] = useState<Record<string, any>>({});

  // Load all components on mount
  useEffect(() => {
    const loadComponents = async () => {
      setIsLoading(true);
      try {
        const components = await getAllComponents();
        setAllComponents(components);
        
        // Load details for each component
        const details: Record<string, any> = {};
        for (const component of components) {
          if (component.id) {
            try {
              const componentDetails = await getComponentWithDetails(component.id);
              if (componentDetails) {
                details[component.id] = componentDetails;
                
                // Update component with pins and properties from details
                const updatedComponent = {
                  ...component,
                  pins: componentDetails.pins || [],
                  properties: componentDetails.properties || {}
                };
                
                // Update the component in the local state
                setAllComponents(prev => 
                  prev.map(c => c.id === component.id ? updatedComponent : c)
                );
              }
            } catch (detailError) {
              console.error(`Error loading details for component ${component.id}:`, detailError);
            }
          }
        }
        setComponentsWithDetails(details);
      } catch (error) {
        console.error("Error loading components:", error);
        setError(error instanceof Error ? error : new Error("Failed to load components"));
        toast({
          title: "Error fetching components",
          description: error instanceof Error ? error.message : "An unknown error occurred",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadComponents();
  }, [toast]);

  return {
    components: allComponents,
    componentsWithDetails,
    isLoading,
    error,
    
    getAllComponents: async () => {
      try {
        const components = await getAllComponents();
        setAllComponents(components);
        return components;
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
        const details = await getComponentWithDetails(componentId);
        
        // Update the cache
        if (details) {
          setComponentsWithDetails(prev => ({
            ...prev,
            [componentId]: details
          }));
        }
        
        return details;
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
        
        // Refresh the components list
        await getAllComponents().then(setAllComponents);
        
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
        
        // Refresh the components list
        await getAllComponents().then(setAllComponents);
      } catch (error) {
        toast({
          title: "Error updating component",
          description: error instanceof Error ? error.message : "An unknown error occurred",
          variant: "destructive"
        });
        throw error;
      }
    },
    
    deleteComponent: async (componentId: string, componentName?: string) => {
      try {
        await deleteComponent(componentId);
        toast({
          title: "Component deleted",
          description: componentName ? `${componentName} has been removed from the library.` : "Component has been removed from the library.",
        });
        
        // Refresh the components list
        await getAllComponents().then(setAllComponents);
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
