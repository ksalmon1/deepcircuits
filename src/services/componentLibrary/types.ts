import { ComponentPin } from "@/types/pin";

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
  pins?: ComponentPin[];
  properties?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}

// Keep any other types that might exist below...
