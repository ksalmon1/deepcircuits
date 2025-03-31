
import { useCallback, useEffect } from 'react';
import { WokwiPin } from '@/integrations/wokwi/WokwiIntegration';
import { useComponentLibrary } from '@/hooks/useComponentLibrary';

// Create a module-level cache that persists between hook instances
const pinCache: Record<string, WokwiPin[]> = {};

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
      
      libraryComponents.forEach(component => {
        if (component.id && componentsDetailsMap[component.id]) {
          const details = componentsDetailsMap[component.id];
          if (details && details.pins && Array.isArray(details.pins) && details.pins.length > 0) {
            console.log(`Found pins for ${component.name} (${component.type}) from details:`, details.pins);
            pinCache[component.type] = details.pins.map((pin: any) => ({
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
      
      libraryComponents.forEach(component => {
        if (component.pins && Array.isArray(component.pins) && component.pins.length > 0) {
          console.log(`Found pins for ${component.name} (${component.type}):`, component.pins);
          pinCache[component.type] = component.pins.map(pin => ({
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
