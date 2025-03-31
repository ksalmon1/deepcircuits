
/**
 * Main exports for Component Library Service
 */
import { ComponentLibraryItem, CircuitComponent } from '@/types/component';
import * as queries from './queries';
import * as mutations from './mutations';
import * as converters from './converters';

// Re-export queries
export const {
  getAllComponents,
  getComponentById,
  getComponentWithDetails
} = queries;

// Re-export mutations
export const {
  createComponent,
  updateComponent,
  deleteComponent
} = mutations;

// Re-export converter functions
export const {
  convertLibraryItemToCircuitComponent,
  mapComponentFromDb,
  componentToNode
} = converters;

// Re-export types
export type { ComponentLibraryItem, CircuitComponent };
