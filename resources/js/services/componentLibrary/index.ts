/**
 * Main exports for the Component Library service
 */
import { ComponentLibraryItem, CircuitComponent } from '@/types/component';

export {
  getAllComponents,
  getComponentById,
  getComponentWithDetails,
  createComponent,
  updateComponent,
  deleteComponent,
} from './api';

export {
  convertLibraryItemToCircuitComponent,
  componentToNode,
  nodeToCircuitComponent,
} from './converters';

export type { ComponentLibraryItem, CircuitComponent };
