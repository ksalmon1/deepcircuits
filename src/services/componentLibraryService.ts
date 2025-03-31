
/**
 * Component Library Service
 * Main service file that re-exports everything from the refactored modules
 */
import { ComponentLibraryItem, CircuitComponent } from '@/types/component';
import * as componentLibrary from './componentLibrary';

// Re-export all from component library
export * from './componentLibrary';

// Also re-export the types for convenience
export type { ComponentLibraryItem, CircuitComponent };
