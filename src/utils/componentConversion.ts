
import { Node } from '@xyflow/react';
import { WokwiComponent } from '@/integrations/wokwi/WokwiIntegration';
import { WokwiNodeData } from '@/types/circuit';
import { ComponentLibraryItem, CircuitComponent } from "@/types/component";

/**
 * Converts a Wokwi component to an XY Flow node
 */
export const wokwiComponentToNode = (component: WokwiComponent): Node => {
  // Create node data with explicit WokwiNodeData properties
  const nodeData: WokwiNodeData = {
    type: component.type,
    label: component.type, // Use type as label if name is not available
    attributes: component.attributes || {},
    pins: component.pins || [],
    svgPath: component.svgPath,
    isOriginal: component.isOriginal
  };
  
  // Log the node data for debugging
  console.log(`Node data created:`, {
    nodeId: component.id,
    type: nodeData.type,
    hasSvgPath: !!nodeData.svgPath,
    svgPathLength: nodeData.svgPath?.length || 0,
    pins: nodeData.pins.length
  });
  
  // Return a properly typed Node
  return {
    id: component.id,
    type: 'wokwiComponent',
    position: { x: component.left, y: component.top },
    data: nodeData,
    draggable: true,
  };
};

/**
 * Convert a library item to a circuit component
 */
export const libraryItemToCircuitComponent = (item: ComponentLibraryItem): CircuitComponent => {
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
export const circuitComponentToNode = (component: CircuitComponent): Node => {
  const nodeData: WokwiNodeData = {
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
  };

  return {
    id: component.id,
    type: 'wokwiComponent',
    position: { x: component.left, y: component.top },
    data: nodeData,
    draggable: true,
  };
};

/**
 * Convert a React Flow node back to a circuit component
 */
export const nodeToCircuitComponent = (node: Node): CircuitComponent => {
  // Type assertion with safe fallbacks
  const nodeData = node.data as unknown as WokwiNodeData;
  
  return {
    id: node.id,
    type: nodeData.type || 'unknown',
    name: nodeData.label || nodeData.type || 'unknown',
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
