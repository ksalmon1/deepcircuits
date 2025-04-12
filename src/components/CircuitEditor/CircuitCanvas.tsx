import React, { useState, useCallback, useEffect, useRef, DragEvent, useMemo } from 'react';
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
  NodeMouseHandler,
  XYPosition,
  NodeTypes,
  EdgeTypes,
  ReactFlowInstance,
  Connection,
  addEdge,
  useOnViewportChange,
  Viewport,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

// Import actual types
import { CircuitComponent } from '@/types/component';
import { WireEdge, WireData } from '@/types/circuit';
import { getPinSignalType, getWireColorFromSignal, createWireId } from '@/utils/wireUtils';
import { findComponentById, getPinByIndex } from '@/utils/pinManagement';
import { generateComponentId } from '@/utils/componentUtils';

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

/**
 * The main canvas component for the circuit editor.
 * 
 * @requires ErrorProvider - Required for error handling through useCircuitEditor
 * @requires ProjectProvider - Required for project state through useCircuitEditor
 * @requires CircuitEditorProvider - Required for editor state and actions
 * 
 * This component must be used within the necessary providers, either:
 * 1. Inside CircuitEditorPage which provides all required contexts
 * 2. Wrapped with withCircuitProviders HOC
 * 
 * @example
 * // Inside CircuitEditorPage:
 * <CircuitCanvas {...props} />
 * 
 * // Standalone usage:
 * const WrappedCircuitCanvas = withCircuitProviders(CircuitCanvas);
 * <WrappedCircuitCanvas {...props} />
 */

// Move nodeTypes and edgeTypes outside the component and memoize them
const nodeTypes = {
  circuitComponent: CircuitComponentNode,
} as const;

const edgeTypes = {
  customWire: CustomWireEdge,
} as const;

// Define props using actual types
interface CircuitCanvasProps {
  circuitComponents: CircuitComponent[];
  wireConnections: WireEdge[];
  onComponentsChange: (components: CircuitComponent[]) => void;
  onWiresChange: (wires: WireEdge[]) => void;
  onModified?: () => void;
}

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
    // Restore custom type and data
    type: 'customWire',
    data: { ...wire.data },
    // Remove basic styling
    // style: { stroke: '#555', strokeWidth: 2 },
  } as Edge;
};

// Need a utility to create unique IDs for components
const createComponentId = (type: string): string => {
  return generateComponentId(type);
};

const CircuitCanvasInner: React.FC<CircuitCanvasProps> = ({
  circuitComponents,
  wireConnections,
  onComponentsChange,
  onWiresChange,
  onModified,
}) => {
  // Remove the wrapper ref again
  // const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChangeInternal] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);

  // Get component library data
  const { components: libraryComponents, componentsDetailsMap } = useComponentLibrary();
  // Get context state/functions
  const { draggingComponentType, selectComponent, viewport, setViewport } = useCircuitEditor();

  // --- Viewport Persistence --- 
  
  // Use onMoveEnd to save the final viewport state to context
  const handleMoveEnd = useCallback((event: any, vp: Viewport) => {
    // console.log('Move ended, saving viewport:', vp); // Optional debug log
    setViewport(vp);
  }, [setViewport]);

  // Restore viewport on mount or when instance becomes available
  useEffect(() => {
    if (reactFlowInstance && viewport) {
      // console.log('Restoring viewport:', viewport); // Optional debug log
      // Ensure we only restore if the current instance viewport doesn't match
      // This prevents potential loops if setViewport triggers another change
      const currentViewport = reactFlowInstance.getViewport();
      if (currentViewport.x !== viewport.x || currentViewport.y !== viewport.y || currentViewport.zoom !== viewport.zoom) {
           reactFlowInstance.setViewport(viewport, { duration: 0 }); // duration 0 for instant set
      }
    } 
  }, [reactFlowInstance, viewport]); // Run when instance is ready or stored viewport changes
  
  // --- End Viewport Persistence ---

  // Convert circuitComponents to React Flow nodes using the utility function
  useEffect(() => {
    //console.log("CircuitCanvas: useEffect for circuitComponents running. Count:", circuitComponents.length);
    const flowNodes = circuitComponents.map(circuitComponentToNode);
    setNodes(flowNodes);
  }, [circuitComponents, setNodes]);

  // Convert wireConnections (WireEdge[]) to React Flow edges using the utility function
  useEffect(() => {
    //console.log("CircuitCanvas: useEffect for wireConnections running. Count:", wireConnections.length);
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
        //console.log('Nodes removed:', removedNodeIds);
        // Update the parent component's state
        const updatedComponents = circuitComponents.filter(
          comp => !removedNodeIds.includes(comp.id)
        );
        onComponentsChange(updatedComponents);
        onModified?.();
      }
    },
    [onNodesChangeInternal, circuitComponents, onComponentsChange, onModified]
  );

  const onConnect: OnConnect = useCallback((connection: Connection) => {
      //console.log('!!! onConnect CALLED !!!', connection);
      //console.log('Attempting connection (Raw):', connection);

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
      onModified?.();
    },
    [circuitComponents, wireConnections, onWiresChange, onModified]
  );

  const onNodeDragStop = useCallback((event: React.MouseEvent, node: Node) => {
      console.log('Node drag stop:', node);
      // Find the corresponding component and update its position (left/top)
      const updatedComponents = circuitComponents.map(comp =>
        comp.id === node.id ? { ...comp, left: node.position.x, top: node.position.y } : comp
      );
      onComponentsChange(updatedComponents);
      onModified?.();
    },
    [circuitComponents, onComponentsChange, onModified]
  );

  // --- React Flow Selection Handlers ---
  const handleNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    console.log('Node clicked:', node);
    // Ensure node.data exists and is a CircuitComponent before selecting
    if (node.data && typeof node.data === 'object' && 'id' in node.data) {
      selectComponent(node.data as unknown as CircuitComponent);
    } else {
      console.warn('Clicked node data is not a valid CircuitComponent:', node.data);
      selectComponent(null); // Clear selection if data is invalid
    }
    onModified?.();
  }, [selectComponent, onModified]);

  const handlePaneClick = useCallback((event: React.MouseEvent) => {
    console.log('Pane clicked, clearing selection.');
    selectComponent(null);
    onModified?.();
  }, [selectComponent, onModified]);

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
      //console.log('Component details fetched:', componentDetails); 
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

      //console.log('ReactFlow drop: creating component with details:', newComponent);
      onComponentsChange([...circuitComponents, newComponent]);
      onModified?.();
    },
    // Update dependencies to include draggingComponentType
    [reactFlowInstance, circuitComponents, onComponentsChange, libraryComponents, componentsDetailsMap, draggingComponentType, onModified]
  );
  // ----------------------------------------------------

  // TODO: Implement deletion logic (onNodesDelete, onEdgesDelete or key listeners)
  const onNodesDelete = useCallback(
    (deletedNodes: Node[]) => {
      //console.log('Nodes deleted:', deletedNodes);
      const deletedNodeIds = new Set(deletedNodes.map(n => n.id));
      // Remove components corresponding to deleted nodes
      const remainingComponents = circuitComponents.filter(comp => !deletedNodeIds.has(comp.id));
      // Also remove wires connected to deleted nodes
      const remainingWires = wireConnections.filter(wire => 
        !deletedNodeIds.has(wire.source) && !deletedNodeIds.has(wire.target)
      );
      onComponentsChange(remainingComponents);
      onWiresChange(remainingWires);
      onModified?.();
    },
    [circuitComponents, wireConnections, onComponentsChange, onWiresChange, onModified]
  );

  const onEdgesDelete = useCallback(
    (deletedEdges: Edge[]) => {
      //console.log('Edges deleted:', deletedEdges);
      const deletedEdgeIds = new Set(deletedEdges.map(e => e.id));
      // Remove wires corresponding to deleted edges
      const remainingWires = wireConnections.filter(wire => !deletedEdgeIds.has(wire.id));
      onWiresChange(remainingWires);
      onModified?.();
    },
    [wireConnections, onWiresChange, onModified]
  );

  // Add edge deletion handling
  const handleEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      // Apply changes internally
      onEdgesChange(changes);
      
      // Find removed edges
      const removedEdgeIds = changes
        .filter(change => change.type === 'remove')
        .map(change => change.id);
      
      if (removedEdgeIds.length > 0) {
        //console.log("Edges removed:", removedEdgeIds);
        // Update parent state
        const updatedEdges = wireConnections.filter(
          edge => !removedEdgeIds.includes(edge.id)
        );
        onWiresChange(updatedEdges);
        onModified?.();
      }
    },
    [onEdgesChange, wireConnections, onWiresChange, onModified]
  );

  // Handle React Flow instance initialization
  const handleInit = (instance: ReactFlowInstance) => {
    setReactFlowInstance(instance);
    // Only fitView on the very first init if no viewport is stored
    if (!viewport) { 
      instance.fitView({ duration: 0 }); 
    }
  };

  // Memoize nodeTypes and edgeTypes to prevent unnecessary re-renders
  const memoizedNodeTypes = useMemo(() => nodeTypes, []);
  const memoizedEdgeTypes = useMemo(() => edgeTypes, []);

  return (
    // Remove ref from wrapper div
    <div className="flex-grow h-full relative" /* Removed ref={reactFlowWrapper} */ >
      {/* Restore ReactFlow rendering */}
      <ReactFlowProvider>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onConnect={onConnect}
          onNodeDragStop={onNodeDragStop}
          // Use handleInit instead of onInit directly to manage restore/fitView logic
          onInit={handleInit}
          onNodesDelete={onNodesDelete}
          onEdgesDelete={onEdgesDelete}
          onNodeClick={handleNodeClick}
          onPaneClick={handlePaneClick}
          nodeTypes={memoizedNodeTypes}
          // Restore edgeTypes
          edgeTypes={memoizedEdgeTypes}
          // Restore custom connection line
          connectionLineComponent={ManhattanConnectionLine}
          connectionMode={ConnectionMode.Loose}
          // Use onMoveEnd to capture the final viewport state
          onMoveEnd={handleMoveEnd}
          className="circuit-canvas"
          proOptions={{ hideAttribution: true }}
          deleteKeyCode={['Backspace', 'Delete']}
          onDrop={onDrop}
          onDragOver={onDragOver}
          // Set initial viewport only if explicitly needed and not restoring
          // defaultViewport={viewport} // Let useEffect handle restore
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