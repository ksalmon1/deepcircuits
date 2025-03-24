
/**
 * Component Library Service
 * 
 * This file re-exports the modular component library functionality
 * from the componentLibrary folder to maintain backward compatibility.
 */

// Export types
export type { ComponentLibraryItem, ComponentProperty } from './componentLibrary/types';

// Export data access functions
export { 
  getAllComponents, 
  getComponentWithDetails, 
  createComponent, 
  updateComponent, 
  deleteComponent 
} from './componentLibrary/api';

// Export utils
export { mapComponentFromDb } from './componentLibrary/utils';

// Export hooks
export { useComponentLibraryService } from './componentLibrary/hooks';
