
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getAllComponents, 
  getComponentWithDetails, 
  createComponent, 
  updateComponent, 
  deleteComponent 
} from '@/services/componentLibrary/api';
import { ComponentLibraryItem } from '@/types/component';

/**
 * Hook for interacting with the component library
 * Provides data fetching, caching, and CRUD operations
 */
export const useComponentLibrary = () => {
  const queryClient = useQueryClient();
  
  // Query to fetch all components
  const { 
    data: components = [], 
    isLoading: isLoadingComponents,
    error: componentsError,
    refetch: refetchComponents
  } = useQuery({
    queryKey: ['components'],
    queryFn: getAllComponents
  });
  
  // Fetch all component details on load
  const { 
    data: componentsDetailsMap = {},
    isLoading: isLoadingDetails 
  } = useQuery({
    queryKey: ['componentsDetails'],
    queryFn: async () => {
      const detailsMap: Record<string, ComponentLibraryItem> = {};
      
      if (components && components.length > 0) {
        console.log(`Fetching details for ${components.length} components`);
        for (const component of components) {
          if (component.id) {
            try {
              const details = await getComponentWithDetails(component.id);
              if (details) {
                console.log(`Got details for ${component.name} (${component.type}):`, details);
                detailsMap[component.id] = details;
                
                // Log SVG path for debugging
                if (details.svgPath) {
                  console.log(`Component ${component.name} has SVG path`);
                }
                
                // If the details contain pins, log them for debugging
                if (details.pins && details.pins.length > 0) {
                  console.log(`${component.name} has ${details.pins.length} pins:`, details.pins);
                }
              }
            } catch (error) {
              console.error(`Error fetching details for component ${component.id}:`, error);
            }
          }
        }
      }
      
      console.log(`Fetched details for ${Object.keys(detailsMap).length} components`);
      return detailsMap;
    },
    enabled: Array.isArray(components) && components.length > 0
  });
  
  // Query factory for fetching a single component with details
  const useComponentDetails = (componentId?: string) => {
    return useQuery({
      queryKey: ['component', componentId],
      queryFn: () => componentId ? getComponentWithDetails(componentId) : null,
      enabled: !!componentId,
      meta: {
        onError: (error: Error) => {
          console.error('Error fetching component details:', error);
        }
      }
    });
  };
  
  // Mutation for creating a component
  const createComponentMutation = useMutation({
    mutationFn: (newComponent: ComponentLibraryItem) => {
      return createComponent(newComponent);
    },
    onSuccess: () => {
      // Invalidate the components list query to trigger a refetch
      queryClient.invalidateQueries({ queryKey: ['components'] });
      queryClient.invalidateQueries({ queryKey: ['componentsDetails'] });
    }
  });
  
  // Mutation for updating a component
  const updateComponentMutation = useMutation({
    mutationFn: (updatedComponent: ComponentLibraryItem) => {
      return updateComponent(updatedComponent);
    },
    onSuccess: (_, variables) => {
      // Invalidate both the components list and the specific component query
      queryClient.invalidateQueries({ queryKey: ['components'] });
      queryClient.invalidateQueries({ queryKey: ['componentsDetails'] });
      if (variables.id) {
        queryClient.invalidateQueries({ queryKey: ['component', variables.id] });
      }
    }
  });
  
  // Mutation for deleting a component
  const deleteComponentMutation = useMutation({
    mutationFn: (componentId: string) => {
      return deleteComponent(componentId);
    },
    onSuccess: (_, componentId) => {
      // Invalidate the components list query to trigger a refetch
      queryClient.invalidateQueries({ queryKey: ['components'] });
      queryClient.invalidateQueries({ queryKey: ['componentsDetails'] });
      // Remove the specific component from the cache
      queryClient.removeQueries({ queryKey: ['component', componentId] });
    }
  });
  
  // Helper to get component details including pins from the cache
  const getComponentDetailsWithPins = (componentId?: string) => {
    if (!componentId || !componentsDetailsMap) return null;
    return componentsDetailsMap[componentId];
  };
  
  return {
    // Queries
    components,
    isLoadingComponents,
    componentsError,
    refetchComponents,
    useComponentDetails,
    
    // Component details
    componentsDetailsMap,
    isLoadingDetails,
    getComponentDetailsWithPins,
    
    // Mutations
    createComponent: createComponentMutation.mutate,
    isCreatingComponent: createComponentMutation.isPending,
    createComponentError: createComponentMutation.error,
    
    updateComponent: updateComponentMutation.mutate,
    isUpdatingComponent: updateComponentMutation.isPending,
    updateComponentError: updateComponentMutation.error,
    
    deleteComponent: deleteComponentMutation.mutate,
    isDeletingComponent: deleteComponentMutation.isPending,
    deleteComponentError: deleteComponentMutation.error
  };
};
