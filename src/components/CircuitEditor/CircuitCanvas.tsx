import React, { useState, useCallback, useEffect, useRef, DragEvent } from 'react';
import {
  ReactFlowProvider,
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  BackgroundVariant,
  ConnectionMode,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
  XYPosition,
  NodeTypes,
  EdgeTypes,
  ReactFlowInstance,
  Connection,
  addEdge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

// Import actual types
import { CircuitComponent } from '@/types/component';
import { WireEdge, WireData } from '@/types/circuit';
import { getPinSignalType, getWireColorFromSignal, createWireId } from '@/utils/wireUtils';
import { findComponentById, getPinByIndex } from '@/utils/pinManagement';

// Import validation function
import { isValidConnection } from '@/domain/connectionRules';
// Import toast for user feedback
import { toast } from 'sonner';

// Import the custom node component (exported as CircuitComponentNode)
import CircuitComponentNode from './CircuitComponentNode';

// Import the custom edge component AND the new connection line
import CustomWireEdge, { ManhattanConnectionLine } from './CircuitCanvas/CustomWireEdge';

// Import the component library hook
import { useComponentLibrary } from '@/hooks/useComponentLibrary';

// Import the circuit editor context with correct path
import { useCircuitEditor } from '@/context/CircuitEditorContext';

// Define props using actual types
interface CircuitCanvasProps {
  circuitComponents: CircuitComponent[];
  wireConnections: WireEdge[];
  onComponentsChange: (components: CircuitComponent[]) => void;
  onWiresChange: (wires: WireEdge[]) => void;
  // Add any other necessary props (e.g., selectedComponentId, onSelect)
}

// --- Define Custom Node Types ---
const nodeTypes: NodeTypes = {
  circuitComponent: CircuitComponentNode,
};
// ------------------------------

// --- Define Custom Edge Types ---
const edgeTypes: EdgeTypes = {
  customWire: CustomWireEdge, // Map the type name to the component
};
// ------------------------------

// Utility function - Update type to 'circuitComponent'
const circuitComponentToNode = (comp: CircuitComponent): Node => {
  return {
    id: comp.id,
    type: 'circuitComponent', // Use the new custom node type
    position: { x: comp.left, y: comp.top }, // Use left/top for position
    data: { ...comp }, // Pass component data to the node
  } as Node;
};

// Utility function - Update type to 'customWire' and remove basic style
const wireEdgeToFlowEdge = (wire: WireEdge): Edge => {
  return {
    id: wire.id,
    source: wire.source,
    target: wire.target,
    sourceHandle: wire.sourceHandle,
    targetHandle: wire.targetHandle,
    type: 'customWire', // Use the custom edge type
    data: { ...wire.data }, // Pass wire data to the edge data
    // style: { stroke: wire.data.color, strokeWidth: 2 }, // Remove basic style, CustomWireEdge handles it
    // animated: wire.data.signal === 'clock' || wire.data.signal === 'data', // Remove animation, CustomWireEdge handles it
  } as Edge;
};

// Need a utility to create unique IDs for components
const createComponentId = (type: string): string => {
  return `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

const CircuitCanvasInner: React.FC<CircuitCanvasProps> = ({
  circuitComponents,
  wireConnections,
  onComponentsChange,
  onWiresChange,
}) => {
  // Remove the wrapper ref again
  // const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChangeInternal] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);

  // Get component library data
  const { components: libraryComponents, componentsDetailsMap } = useComponentLibrary();
  // Get dragging state from context
  const { draggingComponentType } = useCircuitEditor();

  // Convert circuitComponents to React Flow nodes using the utility function
  useEffect(() => {
    const flowNodes = circuitComponents.map(circuitComponentToNode);
    setNodes(flowNodes);
  }, [circuitComponents, setNodes]);

  // Convert wireConnections (WireEdge[]) to React Flow edges using the utility function
  useEffect(() => {
    const flowEdges = wireConnections.map(wireEdgeToFlowEdge);
    setEdges(flowEdges);
  }, [wireConnections, setEdges]);

  // --- Interaction Handlers ---

  // Custom handler for node changes to intercept deletions
  const handleNodesChange: OnNodesChange = useCallback(
    (changes) => {
      // Apply changes to React Flow's internal state first
      onNodesChangeInternal(changes);

      // Check for node removals
      const removedNodeIds = changes
        .filter(change => change.type === 'remove')
        .map(change => change.id);

      if (removedNodeIds.length > 0) {
        console.log('Nodes removed:', removedNodeIds);
        // Update the parent component's state
        const updatedComponents = circuitComponents.filter(
          comp => !removedNodeIds.includes(comp.id)
        );
        onComponentsChange(updatedComponents);
      }
    },
    [onNodesChangeInternal, circuitComponents, onComponentsChange] // Add dependencies
  );

  const onConnect: OnConnect = useCallback((connection: Connection) => {
      console.log('Attempting connection:', connection);

      // Basic validation: Ensure source and target handles/nodes are present
      if (!connection.source || !connection.target || !connection.sourceHandle || !connection.targetHandle) {
        console.error('Connection information incomplete:', connection);
        return;
      }
      
      // Extract pin indices from handle IDs (assuming format 'pin-index')
      const sourcePinIndex = parseInt(connection.sourceHandle.split('-')[1]);
      const targetPinIndex = parseInt(connection.targetHandle.split('-')[1]);

      if (isNaN(sourcePinIndex) || isNaN(targetPinIndex)) {
        console.error("Could not parse pin indices from handles:", connection.sourceHandle, connection.targetHandle);
        return;
      }

      // --- Add Connection Validation ---
      if (!isValidConnection(circuitComponents, connection.source, sourcePinIndex, connection.target, targetPinIndex)) {
        toast.error('Invalid Connection', {
          description: 'These pins cannot be connected.',
          duration: 2000,
        });
        return; // Prevent connection creation
      }
      // ---------------------------------

      // Determine signal type and color from source pin
      const signal = getPinSignalType(circuitComponents, connection.source, sourcePinIndex);
      const color = getWireColorFromSignal(signal || '');
      
      // Create the new WireEdge object 
      const newWire: WireEdge = {
        id: createWireId(),
        source: connection.source,
        target: connection.target,
        sourceHandle: connection.sourceHandle,
        targetHandle: connection.targetHandle,
        type: 'customWire',
        data: {
          color: color,
          sourcePinIndex: sourcePinIndex,
          targetPinIndex: targetPinIndex,
          signal: signal || undefined,
        } as WireData,
      };

      console.log('Creating new WireEdge:', newWire);
      // Update the external state via the callback prop
      onWiresChange([...wireConnections, newWire]);

    },
    [circuitComponents, wireConnections, onWiresChange] // Add dependencies
  );

  const onNodeDragStop = useCallback((event: React.MouseEvent, node: Node) => {
      console.log('Node drag stop:', node);
      // Find the corresponding component and update its position (left/top)
      const updatedComponents = circuitComponents.map(comp =>
        comp.id === node.id ? { ...comp, left: node.position.x, top: node.position.y } : comp
      );
      onComponentsChange(updatedComponents);
    },
    [circuitComponents, onComponentsChange]
  );

  // --- React Flow Drag and Drop Handlers ---
  const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'copy'; 
    }
    // Removed log
    // console.log("ReactFlow onDragOver firing");
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      console.log("--- ReactFlow onDrop event fired ---");

      // Use component type from context state
      const componentType = draggingComponentType;

      if (!reactFlowInstance) {
        console.error("React Flow instance not available for drop.");
        return;
      }
      
      // Remove dataTransfer check
      /*
      if (!event.dataTransfer) {
        console.error("No dataTransfer object found on drop event.");
        return;
      }
      const componentType = event.dataTransfer.getData('application/reactflow');
      */

      // Check if a component type was being dragged (from context)
      if (!componentType) {
        console.warn("No component type was being dragged (check context state).");
        return;
      }

      // Find component details from the library
      const libraryComponentDef = libraryComponents?.find(comp => comp.type === componentType);
      let componentDetails = null;
      if (libraryComponentDef && libraryComponentDef.id && componentsDetailsMap) {
        componentDetails = componentsDetailsMap[libraryComponentDef.id];
      }

      if (!componentDetails) {
        console.error(`Component definition not found for type: ${componentType}`);
        toast.error("Component not found", { description: `Could not find details for type: ${componentType}` });
        return;
      }
      // Log the details fetched from the library
      console.log('Component details fetched:', componentDetails); 
      // -------------------------------------------------
      
      // Position calculation
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      // Component creation
      const newComponent: CircuitComponent = {
        id: createComponentId(componentType),
        type: componentType,
        left: position.x,
        top: position.y,
        attributes: componentDetails.properties || {}, 
        pins: componentDetails.pins || [], 
        svgPath: componentDetails.svgPath || null,
        isOriginal: componentDetails.isOriginal,
      };

      console.log('ReactFlow drop: creating component with details:', newComponent);
      onComponentsChange([...circuitComponents, newComponent]);
    },
    // Update dependencies to include draggingComponentType
    [reactFlowInstance, circuitComponents, onComponentsChange, libraryComponents, componentsDetailsMap, draggingComponentType]
  );
  // ----------------------------------------------------

  // TODO: Implement deletion logic (onNodesDelete, onEdgesDelete or key listeners)
  const onNodesDelete = useCallback(
    (deletedNodes: Node[]) => {
      console.log('Nodes deleted:', deletedNodes);
      const deletedNodeIds = new Set(deletedNodes.map(n => n.id));
      // Remove components corresponding to deleted nodes
      const remainingComponents = circuitComponents.filter(comp => !deletedNodeIds.has(comp.id));
      // Also remove wires connected to deleted nodes
      const remainingWires = wireConnections.filter(wire => 
        !deletedNodeIds.has(wire.source) && !deletedNodeIds.has(wire.target)
      );
      onComponentsChange(remainingComponents);
      onWiresChange(remainingWires);
    },
    [circuitComponents, wireConnections, onComponentsChange, onWiresChange]
  );

  const onEdgesDelete = useCallback(
    (deletedEdges: Edge[]) => {
      console.log('Edges deleted:', deletedEdges);
      const deletedEdgeIds = new Set(deletedEdges.map(e => e.id));
      // Remove wires corresponding to deleted edges
      const remainingWires = wireConnections.filter(wire => !deletedEdgeIds.has(wire.id));
      onWiresChange(remainingWires);
    },
    [wireConnections, onWiresChange]
  );

  // ---------------------------------------------

  return (
    // Remove ref from wrapper div
    <div 
      style={{ height: '100%', width: '100%' }} 
      // ref={reactFlowWrapper} 
    >
      {/* Restore ReactFlow rendering */}
      <ReactFlowProvider>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeDragStop={onNodeDragStop}
          onInit={setReactFlowInstance}
          onNodesDelete={onNodesDelete}
          onEdgesDelete={onEdgesDelete}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          connectionLineComponent={ManhattanConnectionLine}
          connectionMode={ConnectionMode.Loose}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          deleteKeyCode={['Backspace', 'Delete']}
          // Re-add ReactFlow specific handlers
          onDrop={onDrop}
          onDragOver={onDragOver}
        >
          <Controls />
          <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  );
};

// Export the inner component directly
export default CircuitCanvasInner; 