import { ComponentLibraryItem, CircuitComponent } from "@/types/component";
import { Node } from "@xyflow/react";
import { CircuitNodeData } from "@/types/circuit";
import { normalizePins } from "@/utils/pinUtils";

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
    pins: normalizePins(item.pins),
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
    type: 'circuitComponent',
    position: { x: component.left, y: component.top },
    data: {
      type: component.type,
      label: component.name || component.type,
      attributes: component.attributes || {},
      pins: normalizePins(component.pins),
      svgPath: component.svgPath,
      isOriginal: component.isOriginal,
    } as CircuitNodeData,
    draggable: true,
  };
};

/**
 * Convert a React Flow node back to a circuit component
 */
export const nodeToCircuitComponent = (node: Node): CircuitComponent => {
  const nodeData = node.data as CircuitNodeData;
  
  return {
    id: node.id,
    type: nodeData.type,
    name: nodeData.label || nodeData.type, // Use label as name if available
    top: node.position.y,
    left: node.position.x,
    attributes: nodeData.attributes || {},
    pins: normalizePins(nodeData.pins),
    svgPath: nodeData.svgPath,
    isOriginal: nodeData.isOriginal
  };
};
