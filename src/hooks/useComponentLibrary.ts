import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import {
  createComponent,
  updateComponent,
  deleteComponent,
  getComponentWithDetails
} from '@/services/componentLibrary/api';
import { ComponentLibraryItem } from '@/types/component';
import { useComponentLibraryData } from '@/context/ComponentLibraryContext';
import { toast } from 'sonner';

/**
 * Hook for interacting with the component library
 * Provides data fetching, caching, and CRUD operations
 */
export const useComponentLibrary = () => {
  const queryClient = useQueryClient();

  const { 
    components, 
    componentsDetailsMap, 
    isLoading: isLoadingContext,
    error: contextError,
    refetchLibrary
  } = useComponentLibraryData();

  const useComponentDetails = (componentId?: string) => {
    return useQuery({
      queryKey: ['component', componentId],
      queryFn: () => componentId ? getComponentWithDetails(componentId) : null,
      enabled: !!componentId,
      meta: {
        onError: (error: Error) => {
          console.error('Error fetching component details directly:', error);
        }
      }
    });
  };

  const createComponentMutation = useMutation({
    mutationFn: (newComponent: ComponentLibraryItem) => {
      return createComponent(newComponent);
    },
    onSuccess: () => {
      refetchLibrary();
      toast.success("Component created successfully!");
    }
  });

  const updateComponentMutation = useMutation({
    mutationFn: (updatedComponent: ComponentLibraryItem) => {
      return updateComponent(updatedComponent);
    },
    onSuccess: (_, variables) => {
      refetchLibrary();
      if (variables.id) {
        queryClient.invalidateQueries({ queryKey: ['component', variables.id] });
      }
      toast.success("Component updated successfully!");
    }
  });

  const deleteComponentMutation = useMutation({
    mutationFn: (componentId: string) => {
      return deleteComponent(componentId);
    },
    onSuccess: (_, componentId) => {
      refetchLibrary();
      queryClient.removeQueries({ queryKey: ['component', componentId] });
      toast.success("Component deleted successfully!");
    }
  });

  const getComponentDetailsWithPins = (componentId?: string) => {
    if (!componentId || !componentsDetailsMap) return null;
    return componentsDetailsMap[componentId];
  };

  return {
    components: components || [],
    isLoadingComponents: isLoadingContext,
    componentsError: contextError,
    refetchLibrary,
    componentsDetailsMap: componentsDetailsMap || {},
    isLoadingDetails: isLoadingContext,
    getComponentDetailsWithPins,
    useComponentDetails,
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
