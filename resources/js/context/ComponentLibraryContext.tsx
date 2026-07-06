import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { ComponentLibraryItem, ComponentDetailsMap, ExtendedComponentDetails } from '@/types/component';
import { getAllComponents } from '@/services/componentLibrary/api';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

// Define the shape of the context data
interface ComponentLibraryContextType {
  components: ComponentLibraryItem[];
  componentsDetailsMap: ComponentDetailsMap;
  isLoading: boolean;
  error: Error | null;
  refetchLibrary: () => Promise<void>;
}

// Create the context with a default undefined value
const ComponentLibraryContext = createContext<ComponentLibraryContextType | undefined>(undefined);

// Define the props for the provider
interface ComponentLibraryProviderProps {
  children: ReactNode;
}

// Create the Provider component
export const ComponentLibraryProvider: React.FC<ComponentLibraryProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [components, setComponents] = useState<ComponentLibraryItem[]>([]);
  const [componentsDetailsMap, setComponentsDetailsMap] = useState<ComponentDetailsMap>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const loadComponentData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // The list endpoint returns pins and properties inline, so a single
      // request populates both the list and the details map.
      const libraryItems = await getAllComponents();
      setComponents(libraryItems);

      const detailsMap: ComponentDetailsMap = {};
      for (const item of libraryItems) {
        if (item.id) {
          detailsMap[item.id] = { ...item, id: item.id } as ExtendedComponentDetails;
        }
      }
      setComponentsDetailsMap(detailsMap);
    } catch (fetchError) {
      console.error('ComponentLibraryProvider: Error fetching component library:', fetchError);
      setError(fetchError instanceof Error ? fetchError : new Error('Failed to load component library'));
      toast.error('Failed to load component library');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // The library requires an authenticated session; skip fetching on public pages.
  useEffect(() => {
    if (user) {
      loadComponentData();
    } else {
      setIsLoading(false);
    }
  }, [user, loadComponentData]);

  const contextValue: ComponentLibraryContextType = {
    components,
    componentsDetailsMap,
    isLoading,
    error,
    refetchLibrary: loadComponentData,
  };

  return (
    <ComponentLibraryContext.Provider value={contextValue}>
      {children}
    </ComponentLibraryContext.Provider>
  );
};

// Create the consumer hook
export const useComponentLibraryData = (): ComponentLibraryContextType => {
  const context = useContext(ComponentLibraryContext);
  if (context === undefined) {
    throw new Error('useComponentLibraryData must be used within a ComponentLibraryProvider');
  }
  return context;
};
