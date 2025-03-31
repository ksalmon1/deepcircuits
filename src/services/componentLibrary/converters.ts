
import { ComponentLibraryItem, CircuitComponent } from "@/types/component";
import { Node } from "@xyflow/react";
import { WokwiNodeData } from "@/types/circuit";
import { ComponentPin } from "@/types/pin";

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
    name: item.name,
    top: 0,
    left: 0,
    attributes: {},
    pins: item.pins ? item.pins.map(pin => ({
      name: pin.name,
      x: pin.x,
      y: pin.y,
      signals: pin.signals || []
    })) : [], 
    svgPath: item.svgPath,
    isOriginal: item.isOriginal
  };
};

/**
 * Convert a circuit component to a node for the React Flow canvas
 */
export const componentToNode = (component: CircuitComponent): Node => {
  return {
    id: component.id,
    type: 'wokwiComponent',
    position: { x: component.left, y: component.top },
    data: {
      type: component.type,
      label: component.name || component.type,
      attributes: component.attributes || {},
      pins: component.pins ? component.pins.map(pin => ({
        name: pin.name,
        x: pin.x,
        y: pin.y,
        signals: pin.signals || []
      })) : [],
      svgPath: component.svgPath,
      isOriginal: component.isOriginal,
    } as WokwiNodeData,
    draggable: true,
  };
};

/**
 * Convert a React Flow node back to a circuit component
 */
export const nodeToCircuitComponent = (node: Node): CircuitComponent => {
  const nodeData = node.data as WokwiNodeData;
  
  return {
    id: node.id,
    type: nodeData.type,
    name: nodeData.label || nodeData.type, // Use label as name if available
    top: node.position.y,
    left: node.position.x,
    attributes: nodeData.attributes || {},
    pins: (nodeData.pins || []).map(pin => ({
      name: pin.name,
      x: pin.x,
      y: pin.y,
      signals: pin.signals || []
    })),
    svgPath: nodeData.svgPath,
    isOriginal: nodeData.isOriginal
  };
};
