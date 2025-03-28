import { WokwiPin } from '@/integrations/wokwi/WokwiIntegration';
import { getComponentPinInfo } from '@/integrations/wokwi/WokwiIntegration';
import { getCustomComponent } from '@/integrations/custom/CustomComponents';

// Function to fetch component pins from various sources
export const fetchComponentPins = (type: string, pinCache: Record<string, WokwiPin[]> = {}): WokwiPin[] => {
  try {
    // First check if pins are in the cache
    if (pinCache[type]) {
      console.log(`Using cached pins for ${type}:`, pinCache[type]);
      return pinCache[type];
    }
    
    // Check if it's a custom component
    if (type.startsWith('custom')) {
      console.log(`Fetching pins for custom component: ${type}`);
      const customComponent = getCustomComponent(type);
      if (customComponent && customComponent.pins) {
        pinCache[type] = customComponent.pins;
        return customComponent.pins;
      }
    }
    
    // Otherwise fallback to default Wokwi pin information
    console.log(`Fetching default pins for ${type}`);
    const defaultPins = getComponentPinInfo(type);
    pinCache[type] = defaultPins;
    return defaultPins;
  } catch (err) {
    console.error(`Error fetching pins for ${type}:`, err);
    return getComponentPinInfo(type);
  }
};
