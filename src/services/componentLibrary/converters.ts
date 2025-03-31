
import { ComponentLibraryItem, CircuitComponent } from "@/types/component";
import { Node } from "@xyflow/react";
import { WokwiNodeData } from "@/types/circuit";
import { ComponentPin } from "@/types/pin";
import { 
  libraryItemToCircuitComponent, 
  circuitComponentToNode, 
  nodeToCircuitComponent 
} from '@/utils/componentConversion';

/**
 * Maps a database component record to our application model
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
 */
export const convertLibraryItemToCircuitComponent = libraryItemToCircuitComponent;

/**
 * Convert a circuit component to a node for the React Flow canvas
 */
export const componentToNode = circuitComponentToNode;

/**
 * Convert a React Flow node back to a circuit component
 */
export const nodeToComponent = nodeToCircuitComponent;
