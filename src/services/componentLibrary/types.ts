
import { WokwiPin } from "@/integrations/wokwi/WokwiIntegration";

export interface ComponentProperty {
  key: string;
  value: any;
}

export interface ComponentLibraryItem {
  id?: string;
  name: string;
  type: string;
  category: string;
  description?: string;
  svgPath?: string;
  enabled: boolean;
  isOriginal: boolean;
  pins?: WokwiPin[];
  properties?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}

// Extended WokwiComponent interface to match what's being used in the app
export interface ExtendedWokwiComponent extends ComponentLibraryItem {
  top: number;
  left: number;
  attributes: Record<string, any>;
}
