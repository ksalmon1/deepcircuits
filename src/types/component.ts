import { ComponentPin } from "./pin";
import { SimulationState, ComponentSimulationState } from '@/utils/simulationUtils';
import { Node, XYPosition } from '@xyflow/react';

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
  rotation?: number;
  simulationState?: ComponentSimulationState | null;
}

/**
 * Component property definition for metadata
 */
export interface ComponentProperty {
  key: string;
  value: any;
  type?: 'string' | 'number' | 'boolean' | 'color' | 'select';
  label?: string;
  description?: string;
  options?: Array<{value: string, label: string}>;
  min?: number;
  max?: number;
  step?: number;
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

/**
 * Component rendering options
 */
export interface ComponentRenderOptions {
  showPins?: boolean;
  highlightPins?: boolean;
  showLabels?: boolean;
  interactive?: boolean;
  scale?: number;
}

/**
 * Component instance for simulation
 */
export interface ComponentInstance {
  component: CircuitComponent;
  state: Record<string, any>;
  pinStates: Record<number, any>;
  update: (delta: number) => void;
}

/**
 * Extended component details including additional metadata
 */
export interface ExtendedComponentDetails {
  id: string;
  type: string;
  name?: string;
  category?: string;
  description?: string;
  svgPath?: string;
  pins?: ComponentPin[];
  properties?: Record<string, any>;
  isOriginal?: boolean;
}

/**
 * Map of component IDs to their extended details
 */
export type ComponentDetailsMap = Record<string, ExtendedComponentDetails>;
