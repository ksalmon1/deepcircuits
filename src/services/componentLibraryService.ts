
import { ComponentLibraryItem, CircuitComponent } from '@/types/component';
import { 
  getAllComponents, 
  getComponentById, 
  getComponentWithDetails, 
  createComponent as apiCreateComponent, 
  updateComponent as apiUpdateComponent, 
  deleteComponent as apiDeleteComponent 
} from './componentLibrary/api';
import { convertLibraryItemToCircuitComponent } from './componentLibrary/utils';

export type { ComponentLibraryItem, CircuitComponent };

// Re-export API functions for direct use
export { getAllComponents, getComponentById, getComponentWithDetails };

/**
 * Create a new component in the library
 */
export async function createComponent(component: ComponentLibraryItem): Promise<string> {
  return apiCreateComponent(component);
}

/**
 * Update an existing component in the library
 */
export async function updateComponent(component: ComponentLibraryItem): Promise<void> {
  return apiUpdateComponent(component);
}

/**
 * Delete a component from the library
 */
export async function deleteComponent(id: string): Promise<void> {
  return apiDeleteComponent(id);
}

/**
 * Convert a library item to a circuit component for use in the editor
 */
export { convertLibraryItemToCircuitComponent };
