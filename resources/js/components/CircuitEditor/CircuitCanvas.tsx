import React, { useState, useCallback, useEffect, useRef, DragEvent, useMemo } from 'react';
import {
  ReactFlowProvider,
  ReactFlow,
  Background,
  Controls,
  useEdgesState,
  useNodesState,
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
import { produce } from 'immer';

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

// Import the simulation context
import { useSimulation } from '@/context/SimulationContext';

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

// Utility to get wired component IDs
function getWiredComponentIds(components, wires) {
  // Build AppComponentModel and AppConnectionModel for compatibility with findConnectedGroups
  const appComponents = components.map(comp => ({
    id: comp.id,
    type: comp.type,
    properties: comp.properties || comp.attributes || {},
    pins: (comp.pins || []).map(pin => ({ id: pin.handle_id || pin.id, name: pin.name })),
  }));
  const appConnections = (wires || []).map(edge => ({
    id: edge.id,
    from: { componentId: edge.source, pinId: edge.sourceHandle || '' },
    to: { componentId: edge.target, pinId: edge.targetHandle || '' },
  }));
  // Inline findConnectedGroups (copied from SimulationContext)
  const graph = new Map();
  appComponents.forEach(comp => {
    comp.pins?.forEach(pin => {
      const pinKey = `${comp.id}_${pin.id}`;
      if (!graph.has(pinKey)) graph.set(pinKey, new Set());
    });
  });
  appConnections.forEach(conn => {
    const fromKey = `${conn.from.componentId}_${conn.from.pinId}`;
    const toKey = `${conn.to.componentId}_${conn.to.pinId}`;
    if (graph.has(fromKey) && graph.has(toKey)) {
      graph.get(fromKey).add(toKey);
      graph.get(toKey).add(fromKey);
    }
  });
  const visited = new Set();
  const connectedGroups = [];
  graph.forEach((_, pinKey) => {
    if (visited.has(pinKey)) return;
    const group = new Set();
    const queue = [pinKey];
    visited.add(pinKey);
    group.add(pinKey);
    while (queue.length > 0) {
      const current = queue.shift();
      graph.get(current)?.forEach(neighbor => {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          group.add(neighbor);
          queue.push(neighbor);
        }
      });
    }
    connectedGroups.push(group);
  });
  // Only include components that are in a group with pins from more than one component
  const wiredComponentIds = new Set();
  connectedGroups.forEach(group => {
    // Get all component IDs in this group
    const compIds = new Set();
    group.forEach(pinKey => {
      const compId = pinKey.split('_')[0];
      compIds.add(compId);
    });
    if (compIds.size > 1) {
      // Only add if this group connects more than one component
      compIds.forEach(id => wiredComponentIds.add(id));
    }
  });
  return wiredComponentIds;
}

const CircuitCanvasInner: React.FC<CircuitCanvasProps> = ({
  circuitComponents,
  wireConnections,
  onComponentsChange,
  onWiresChange,
  onModified,
}) => {
  // Remove the wrapper ref again
  // const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);

  // Get component library data
  const { components: libraryComponents, componentsDetailsMap } = useComponentLibrary();
  // Get context state/functions
  const { draggingComponentType, selectComponent, viewport, setViewport } = useCircuitEditor();
  // Add simulation context
  const { isSimulationRunning, notifyCircuitChanged, simulationState } = useSimulation();

  // --- Track previous wire and wired component state ---
  const prevStateRef = useRef({
    wireIds: new Set(),
    wiredComponentIds: new Set(),
    attributesFingerprint: '',
  });

  // --- Viewport Persistence --- 
  
  // Use onMoveEnd to save the final viewport state to context
  const handleMoveEnd = useCallback((_event: MouseEvent | TouchEvent | null, vp: Viewport) => {
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

  // Convert circuitComponents to React Flow nodes and update the internal nodes state
  useEffect(() => {
    const flowNodes = circuitComponents.map(comp => ({
      // Attach the live simulation state so component renderers can
      // animate from real pin voltages.
      ...circuitComponentToNode({ ...comp, simulationState: simulationState?.[comp.id] ?? null }),
      // Ensure these properties are explicitly set for proper initialization
      draggable: true,
      selectable: true,
      connectable: true
    }));
    setNodes(flowNodes);
  }, [circuitComponents, setNodes, simulationState]);

  // Sync nodes changes back to parent component - with debounce to avoid conflicts
  useEffect(() => {
    if (nodes.length === 0 || circuitComponents.length === 0) return;
    
    // Skip position updates during active drags to avoid conflicts
    const isDragging = nodes.some(node => node.dragging);
    if (isDragging) return;

    // Map nodes back to circuit components by updating position
    const updatedComponents = circuitComponents.map(comp => {
      const node = nodes.find(n => n.id === comp.id);
      if (node) {
        return {
          ...comp,
          left: node.position.x,
          top: node.position.y
        };
      }
      return comp;
    });
    
    // Check if positions actually changed to avoid infinite update loop
    const positionsChanged = updatedComponents.some((comp, i) => 
      circuitComponents[i] && 
      (comp.left !== circuitComponents[i].left || comp.top !== circuitComponents[i].top)
    );
    
    if (positionsChanged) {
      onComponentsChange(updatedComponents);
    }
  }, [nodes, circuitComponents, onComponentsChange]);

  // Helper to call onModified
  const handleModified = useCallback(() => {
    onModified?.();
  }, [onModified]);

  // Persist a wire's edited bend points back into project state.
  const handleWaypointsChange = useCallback((wireId: string, waypoints: Array<{ x: number; y: number }>) => {
    onWiresChange(wireConnections.map(wire =>
      wire.id === wireId
        ? { ...wire, data: { ...wire.data, routingPoints: waypoints } }
        : wire
    ));
    handleModified();
  }, [wireConnections, onWiresChange, handleModified]);

  // How many wires attach to each component pin; a pin with exactly one
  // wire carries precisely that wire's current.
  const wireDegree = useMemo(() => {
    const counts = new Map<string, number>();
    wireConnections.forEach(w => {
      const a = `${w.source}:${w.data?.sourcePinIndex}`;
      const b = `${w.target}:${w.data?.targetPinIndex}`;
      counts.set(a, (counts.get(a) ?? 0) + 1);
      counts.set(b, (counts.get(b) ?? 0) + 1);
    });
    return counts;
  }, [wireConnections]);

  /**
   * Which way energy flows along a wire and how much, from the simulated
   * per-pin currents of the attached components. Prefer an endpoint whose
   * pin has a single wire (its device current IS the wire current); at
   * junctions where both pins are shared, the smaller magnitude is the
   * better approximation of this wire's share.
   */
  const wireFlow = useCallback((wire: WireEdge): { direction: 'forward' | 'reverse'; current: number } | undefined => {
    const THRESHOLD = 1e-7;
    const fromSide = (componentId: string, pinIndex: number | undefined, entering: boolean) => {
      if (pinIndex === undefined) return undefined;
      const enteringCurrent = simulationState?.[componentId]?.pinCurrents?.[pinIndex];
      if (enteringCurrent === undefined || Math.abs(enteringCurrent) < THRESHOLD) return undefined;
      // Along the wire, source->target is positive when current leaves the
      // source component or enters the target component.
      const alongWire = entering ? enteringCurrent : -enteringCurrent;
      return {
        direction: alongWire > 0 ? ('forward' as const) : ('reverse' as const),
        current: Math.abs(enteringCurrent),
      };
    };
    const sourceSide = fromSide(wire.source, wire.data?.sourcePinIndex, false);
    const targetSide = fromSide(wire.target, wire.data?.targetPinIndex, true);
    if (sourceSide && targetSide) {
      const sourceDegree = wireDegree.get(`${wire.source}:${wire.data?.sourcePinIndex}`) ?? 1;
      const targetDegree = wireDegree.get(`${wire.target}:${wire.data?.targetPinIndex}`) ?? 1;
      if (sourceDegree === 1 && targetDegree > 1) return sourceSide;
      if (targetDegree === 1 && sourceDegree > 1) return targetSide;
      return targetSide.current < sourceSide.current ? targetSide : sourceSide;
    }
    return sourceSide ?? targetSide;
  }, [simulationState, wireDegree]);

  // Convert wireConnections (WireEdge[]) to React Flow edges, enriched with
  // runtime-only data: the waypoint editor callback and the flow direction.
  // Selection state lives on the flow edges, so carry it across rebuilds.
  useEffect(() => {
    setEdges(previousEdges => wireConnections.map(wire => {
      const edge = wireEdgeToFlowEdge(wire);
      const flow = wireFlow(wire);
      edge.data = {
        ...edge.data,
        onWaypointsChange: handleWaypointsChange,
        flowDirection: flow?.direction,
        flowCurrent: flow?.current,
      };
      edge.selected = previousEdges.find(prev => prev.id === edge.id)?.selected ?? false;
      return edge;
    }));
  }, [wireConnections, setEdges, handleWaypointsChange, wireFlow]);

  // --- Topology change detection for simulation rerun ---
  useEffect(() => {
    if (!isSimulationRunning) return;
    // Compute current sets
    const currentWireIds = new Set(wireConnections.map(w => w.id));
    const currentWiredComponentIds = getWiredComponentIds(circuitComponents, wireConnections);
    // Compare to previous
    const prevWireIds = prevStateRef.current.wireIds;
    const prevWiredComponentIds = prevStateRef.current.wiredComponentIds;

    // Debug logs
    console.log('[TOPOLOGY EFFECT]');
    console.log('currentWireIds:', [...currentWireIds]);
    console.log('prevWireIds:', [...prevWireIds]);
    console.log('currentWiredComponentIds:', [...currentWiredComponentIds]);
    console.log('prevWiredComponentIds:', [...prevWiredComponentIds]);

    // Electrical attributes of wired components matter too: toggling a
    // switch or editing a resistance must re-run the live simulation.
    const currentAttributesFingerprint = JSON.stringify(
      circuitComponents
        .filter(comp => currentWiredComponentIds.has(comp.id))
        .map(comp => [comp.id, comp.attributes])
    );

    let wireChanged = false;
    let wiredComponentChanged = false;
    if (currentWireIds.size !== prevWireIds.size || [...currentWireIds].some(id => !prevWireIds.has(id))) {
      wireChanged = true;
    }
    if (currentWiredComponentIds.size !== prevWiredComponentIds.size || [...currentWiredComponentIds].some(id => !prevWiredComponentIds.has(id))) {
      wiredComponentChanged = true;
    }
    const attributesChanged = currentAttributesFingerprint !== prevStateRef.current.attributesFingerprint;
    // Only notify if a wire, wired component set, or electrical attribute changed
    if (wireChanged || wiredComponentChanged || attributesChanged) {
      console.log('[TOPOLOGY EFFECT] Circuit changed, rerunning simulation.');
      notifyCircuitChanged();
      // Update previous state
      prevStateRef.current = {
        wireIds: currentWireIds,
        wiredComponentIds: currentWiredComponentIds,
        attributesFingerprint: currentAttributesFingerprint,
      };
    } else {
      console.log('[TOPOLOGY EFFECT] No circuit change, no rerun.');
    }
  }, [circuitComponents, wireConnections, isSimulationRunning, notifyCircuitChanged]);

  // --- Interaction Handlers ---

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
      handleModified();
    },
    [circuitComponents, wireConnections, onWiresChange, handleModified]
  );

  const onNodeDragStop = useCallback((event: React.MouseEvent, node: Node) => {
      console.log('Node drag stop:', node.id, 'Final position:', node.position);
      
      // Directly update the component position in parent state to ensure consistency
      const updatedComponents = circuitComponents.map(comp => 
        comp.id === node.id 
          ? { ...comp, left: node.position.x, top: node.position.y } 
          : comp
      );
      
      onComponentsChange(updatedComponents);
      handleModified();
    },
    [circuitComponents, onComponentsChange, handleModified]
  );

  // --- Interactive components: double-click toggles a switch/button ---
  const TOGGLEABLE_TYPES = ['switch', 'pushbutton', 'pushbutton-6mm', 'slide-switch', 'wokwi-pushbutton'];
  const handleNodeDoubleClick = useCallback((event: React.MouseEvent, node: Node) => {
    const component = circuitComponents.find(comp => comp.id === node.id);
    if (!component || !TOGGLEABLE_TYPES.includes(component.type.toLowerCase())) return;
    event.stopPropagation();
    const isClosed = component.attributes?.closed === true || component.attributes?.closed === 'true';
    const updatedComponents = circuitComponents.map(comp =>
      comp.id === node.id
        ? { ...comp, attributes: { ...comp.attributes, closed: !isClosed } }
        : comp
    );
    onComponentsChange(updatedComponents);
    handleModified();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [circuitComponents, onComponentsChange, handleModified]);

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
    handleModified();
  }, [selectComponent, handleModified]);

  const handlePaneClick = useCallback((event: React.MouseEvent) => {
    console.log('Pane clicked, clearing selection.');
    selectComponent(null);
    handleModified();
  }, [selectComponent, handleModified]);

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
      
      // Log state before and the component being added
      // console.log('[onDrop] State BEFORE add:', circuitComponents);
      // console.log('[onDrop] Adding component:', newComponent);
      
      onComponentsChange([...circuitComponents, newComponent]);
      
      // Log after calling the state update function
      // console.log('[onDrop] onComponentsChange called.');
      
      handleModified();
    },
    // Update dependencies to include draggingComponentType
    [reactFlowInstance, circuitComponents, onComponentsChange, libraryComponents, componentsDetailsMap, draggingComponentType, handleModified]
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
      handleModified();
    },
    [circuitComponents, wireConnections, onComponentsChange, onWiresChange, handleModified]
  );

  const onEdgesDelete = useCallback(
    (deletedEdges: Edge[]) => {
      //console.log('Edges deleted:', deletedEdges);
      const deletedEdgeIds = new Set(deletedEdges.map(e => e.id));
      // Remove wires corresponding to deleted edges
      const remainingWires = wireConnections.filter(wire => !deletedEdgeIds.has(wire.id));
      onWiresChange(remainingWires);
      handleModified();
    },
    [wireConnections, onWiresChange, handleModified]
  );

  // Add edge deletion handling
  const handleEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
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
        handleModified();
      }
    },
    [wireConnections, onWiresChange, handleModified]
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

  // Memoize the nodes and edges to prevent unnecessary re-renders
  // This helps with React Flow's internal optimizations for drag operations
  const memoizedNodes = useMemo(() => nodes, [nodes]);
  const memoizedEdges = useMemo(() => edges, [edges]);

  return (
    // Remove ref from wrapper div
    <div className="flex-grow h-full relative" /* Removed ref={reactFlowWrapper} */ >
      {/* Restore ReactFlow rendering */}
      <ReactFlowProvider>
        {/* 
          To fix: "It seems that you are trying to drag a node that is not initialized"
          1. We use useNodesState and onNodesChange for proper ReactFlow node handling
          2. We ensure nodes have explicit draggable/selectable properties
          3. We avoid updating parent state during active dragging
          4. We use memoized nodes and edges to prevent unnecessary re-renders
        */}
        <ReactFlow
          nodes={memoizedNodes}
          edges={memoizedEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
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
          onNodeDoubleClick={handleNodeDoubleClick}
          zoomOnDoubleClick={false}
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

// Export the inner component directly, wrapped with React.memo
export default React.memo(CircuitCanvasInner); 