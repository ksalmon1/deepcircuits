import { ComponentPin } from "@/types/pin";
import { useCallback, useEffect } from 'react';
import { useComponentLibrary } from '@/hooks/useComponentLibrary';
import { ComponentLibraryItem } from '@/services/componentLibrary/types';

// In-memory cache for pin configurations
const pinCache: Record<string, ComponentPin[]> = {};

/**
 * Custom hook to manage a cache of component pins
 */
export function useComponentPinCache() {
  const { 
    components: libraryComponents, 
    componentsDetailsMap, 
    isLoadingComponents, 
    isLoadingDetails 
  } = useComponentLibrary();

  // Populate the pin cache with data from the component library
  const populatePinCache = useCallback(() => {
    // Check if libraryComponents is an array before proceeding
    if (Array.isArray(libraryComponents) && componentsDetailsMap && Object.keys(componentsDetailsMap).length > 0) {
      console.log('Loading pin data from componentsDetailsMap:', Object.keys(componentsDetailsMap).length);
      
      libraryComponents.forEach((component: ComponentLibraryItem) => {
        if (component.id && componentsDetailsMap[component.id]) {
          const details = componentsDetailsMap[component.id];
          if (details && details.pins && Array.isArray(details.pins) && details.pins.length > 0) {
            console.log(`Found pins for ${component.name} (${component.type}) from details:`, details.pins);
            pinCache[component.type] = details.pins.map((pin: any) => ({
              id: pin.id || `pin-${pin.name}-${Math.random().toString(36).slice(2, 7)}`,
              name: pin.name,
              x: Number(pin.x),
              y: Number(pin.y),
              signals: pin.signals || []
            }));
          }
        }
      });
      
      console.log('Pin cache after loading from details:', pinCache);
    } else if (Array.isArray(libraryComponents) && libraryComponents.length > 0) {
      console.log('Loading pin data from library components:', libraryComponents.length);
      
      libraryComponents.forEach((component: ComponentLibraryItem) => {
        if (component.pins && Array.isArray(component.pins) && component.pins.length > 0) {
          console.log(`Found pins for ${component.name} (${component.type}):`, component.pins);
          pinCache[component.type] = component.pins.map(pin => ({
            id: pin.id || `pin-${pin.name}-${Math.random().toString(36).slice(2, 7)}`,
            name: pin.name,
            x: Number(pin.x), 
            y: Number(pin.y),
            signals: pin.signals || []
          }));
        }
      });
      
      console.log('Pin cache after loading:', pinCache);
    }
  }, [libraryComponents, componentsDetailsMap]);

  // Load pin data when component library data is available
  useEffect(() => {
    populatePinCache();
  }, [libraryComponents, componentsDetailsMap, populatePinCache]);

  return {
    pinCache,
    populatePinCache
  };
}
