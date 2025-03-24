
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getAllComponents, 
  getComponentWithDetails, 
  createComponent, 
  updateComponent, 
  deleteComponent,
  ComponentLibraryItem
} from '@/services/componentLibraryService';

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
      // Remove the specific component from the cache
      queryClient.removeQueries({ queryKey: ['component', componentId] });
    }
  });
  
  return {
    // Queries
    components,
    isLoadingComponents,
    componentsError,
    refetchComponents,
    useComponentDetails,
    
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
