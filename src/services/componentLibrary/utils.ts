
import { ComponentLibraryItem } from "@/types/component";
import { CircuitComponent } from "@/types/component";

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
export const convertLibraryItemToCircuitComponent = (item: ComponentLibraryItem): CircuitComponent => {
  return {
    id: item.id || crypto.randomUUID(),
    type: item.type,
    top: 0,
    left: 0,
    attributes: {},
    pins: item.pins || [],
    svgPath: item.svgPath,
    isOriginal: item.isOriginal
  };
};

/**
 * Convert a circuit component to a node for the React Flow canvas
 */
export const componentToNode = (component: CircuitComponent) => {
  return {
    id: component.id,
    type: 'wokwiComponent',
    position: { x: component.left, y: component.top },
    data: {
      type: component.type,
      attributes: component.attributes || {},
      pins: component.pins || [],
      svgPath: component.svgPath,
      isOriginal: component.isOriginal,
    },
    draggable: true,
  };
};
