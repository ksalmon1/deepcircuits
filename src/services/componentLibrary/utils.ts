
/**
 * @deprecated Use functions from componentConversion.ts instead
 */

import { ComponentLibraryItem } from "@/types/component";
import { CircuitComponent } from "@/types/component";
import { 
  libraryItemToCircuitComponent, 
  circuitComponentToNode 
} from '@/utils/componentConversion';

/**
 * Maps a database component record to our application model
 * @deprecated Use mapComponentFromDb from ../converters.ts instead
 */
export const mapComponentFromDb = (dbComponent: any): ComponentLibraryItem => {
  console.log(`Mapping component from DB: ${dbComponent.name}, type=${dbComponent.type}, svgPath=${dbComponent.svg_path ? 'exists' : 'missing'}`);
  
  return {
    id: dbComponent.id,
    name: dbComponent.name,
    type: dbComponent.type,
    category: dbComponent.category,
    description: dbComponent.description,
    svgPath: dbComponent.svg_path,
    enabled: dbComponent.enabled,
    isOriginal: dbComponent.is_original,
    createdAt: dbComponent.created_at,
    updatedAt: dbComponent.updated_at,
  };
};

/**
 * Convert a library item to a circuit component
 * @deprecated Use libraryItemToCircuitComponent from componentConversion.ts instead
 */
export const convertLibraryItemToCircuitComponent = libraryItemToCircuitComponent;

/**
 * Convert a circuit component to a node for the React Flow canvas
 * @deprecated Use circuitComponentToNode from componentConversion.ts instead
 */
export const componentToNode = circuitComponentToNode;
