
import { useToast } from "@/hooks/use-toast";
import { 
  getAllComponents, 
  getComponentWithDetails, 
  createComponent, 
  updateComponent, 
  deleteComponent 
} from "./api";
import { ComponentLibraryItem } from "./types";

/**
 * React hook wrapper for the component library service
 * Provides toast notifications for success/error states
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
    
    deleteComponent: async (componentId: string, componentName?: string) => {
      try {
        await deleteComponent(componentId);
        toast({
          title: "Component deleted",
          description: componentName ? `${componentName} has been removed from the library.` : "Component has been removed from the library.",
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
