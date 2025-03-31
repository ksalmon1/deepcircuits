
import { WokwiPin } from "@/integrations/wokwi/WokwiIntegration";

/**
 * Base interface for component library items
 */
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

/**
 * Extended component interface for circuit editor
 */
export interface CircuitComponent {
  id: string;
  type: string;
  top: number;
  left: number;
  attributes: Record<string, any>;
  pins?: WokwiPin[];
  svgPath?: string | null;
  isOriginal?: boolean;
}

/**
 * Database component property
 */
export interface ComponentProperty {
  key: string;
  value: any;
}

/**
 * Interface for component metadata in database
 */
export interface ComponentMetadata {
  id: string;
  name: string;
  type: string;
  category: string;
  description?: string;
  svgPath?: string;
  enabled: boolean;
  isOriginal: boolean;
  createdAt: string;
  updatedAt: string;
}
