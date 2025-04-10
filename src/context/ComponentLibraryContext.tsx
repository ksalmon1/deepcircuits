import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { ComponentLibraryItem, ComponentDetailsMap, ExtendedComponentDetails } from '@/types/component';
// Correct the import path and function names based on useComponentLibrary.ts
import { getAllComponents, getComponentWithDetails } from '@/services/componentLibrary/api'; 
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
  const [components, setComponents] = useState<ComponentLibraryItem[]>([]);
  const [componentsDetailsMap, setComponentsDetailsMap] = useState<ComponentDetailsMap>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  // Move fetching logic into a useCallback to be callable
  const loadComponentData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    //console.log("ComponentLibraryProvider: Fetching initial library...");
    try {
      const libraryItems = await getAllComponents();
      setComponents(libraryItems);
      //console.log(`ComponentLibraryProvider: Fetched ${libraryItems.length} library items.`);

      const detailsMap: ComponentDetailsMap = {};
      //console.log(`ComponentLibraryProvider: Fetching details for ${libraryItems.length} components...`);
      
      await Promise.all(
        libraryItems.map(async (item) => {
          if (item.id) {
            try {
              const details = await getComponentWithDetails(item.id); 
              if (details) {
                detailsMap[item.id] = details;
                // console.log(`ComponentLibraryProvider: Got details for ${item.name} (${item.type})`); // Reduce noise
              } else {
                 console.warn(`ComponentLibraryProvider: No details found for ${item.name} (ID: ${item.id})`);
              }
            } catch (detailError) {
               console.error(`ComponentLibraryProvider: Error fetching details for ${item.name} (ID: ${item.id}):`, detailError);
               toast.error(`Failed to load details for ${item.name}`); 
            }
          } else {
             console.warn(`ComponentLibraryProvider: Library item ${item.name} is missing an ID.`);
          }
        })
      );

      setComponentsDetailsMap(detailsMap);
      //console.log(`ComponentLibraryProvider: Finished fetching details.`);
      
    } catch (fetchError: any) {
      console.error("ComponentLibraryProvider: Error fetching component library:", fetchError);
      setError(fetchError instanceof Error ? fetchError : new Error('Failed to load component library'));
      toast.error("Failed to load component library");
    } finally {
      setIsLoading(false);
    }
  }, []); // Keep useCallback dependency array empty

  // useEffect to load data on initial mount
  useEffect(() => {
    loadComponentData();
  }, [loadComponentData]); // Depend on the memoized function

  const contextValue: ComponentLibraryContextType = {
    components,
    componentsDetailsMap,
    isLoading,
    error,
    // Provide the load function as refetchLibrary
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