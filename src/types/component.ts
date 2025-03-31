
import { WokwiPin } from "@/integrations/wokwi/WokwiIntegration";
import { ComponentPin } from "@/types/pin";

/**
 * Base interface for common component properties
 */
export interface BaseComponent {
  id?: string;
  type: string;
  name?: string;
  pins?: ComponentPin[];
}

/**
 * Base interface for component library items
 */
export interface ComponentLibraryItem extends BaseComponent {
  name: string;
  category: string;
  description?: string;
  svgPath?: string;
  enabled: boolean;
  isOriginal: boolean;
  properties?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Extended component interface for circuit editor
 */
export interface CircuitComponent extends BaseComponent {
  id: string;
  top: number;
  left: number;
  attributes: Record<string, any>;
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
