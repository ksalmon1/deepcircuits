
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { 
  isWokwiLoaded, 
  forceLoadWokwiElements, 
  WokwiComponent,
  getComponentPinInfo 
} from '@/integrations/wokwi/WokwiIntegration';
import { toast } from 'sonner';
import { useComponentLibrary } from '@/hooks/useComponentLibrary';
import { useCanvasNavigation } from '@/hooks/useCanvasNavigation';
import { useWireSystem } from '@/hooks/useWireSystem';
import { componentToNode } from './CircuitCanvas/utils';
import { useWokwiLoader } from '@/hooks/useWokwiLoader';
import { useComponentPinCache } from '@/hooks/useComponentPinCache';
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Panel,
  useReactFlow,
  BackgroundVariant,
  ReactFlowProvider,
  ReactFlowInstance,
  ConnectionMode,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
  Connection,
  addEdge,
  Edge,
  Node
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import './CircuitCanvas/circuit-canvas.css';

// Import sub-components
import WokwiComponentNode from './CircuitCanvas/WokwiComponentNode';
import RoutingPointNode from './CircuitCanvas/RoutingPointNode';
import CanvasControls from './CircuitCanvas/CanvasControls';
import LoadingOverlay from './CircuitCanvas/LoadingOverlay';
import { useCircuitCanvasState } from '@/hooks/useCircuitCanvasState';
import { getPinSignalType, getWireColorFromSignal } from '@/utils/wireUtils';

// Define wiring state interface for multi-segment wires
interface WiringState {
  startNodeId: string;
  startHandleId: string;
  lastNodeId: string; 
  lastHandleId: string | null; 
  intermediateNodes: string[];
  intermediateEdges: string[];
  currentColor: string;
  currentSignalType: string;
}

interface CircuitCanvasProps {
  components: WokwiComponent[];
  onComponentsChange: (components: WokwiComponent[]) => void;
}

// Define the custom node types
const nodeTypes = {
  wokwiComponent: WokwiComponentNode as React.ComponentType<any>,
  routingPoint: RoutingPointNode as React.ComponentType<any>
};

const CircuitCanvas = ({ components, onComponentsChange }: CircuitCanvasProps) => {
  // Refs
  const canvasRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Custom hooks
  const { isReady, loadingError, handleRetry } = useWokwiLoader();
  const { pinCache } = useComponentPinCache();
  
  // Wire routing state
  const [wiringState, setWiringState] = useState<WiringState | null>(null);
  
  // Initialize circuit canvas state
  const {
    canvasSize,
    setCanvasSize,
    nodes,
    setNodes,
    edges,
    setEdges,
    reactFlowInstance,
    setReactFlowInstance,
    hoveredComponent,
    setHoveredComponent,
    visiblePins,
    setVisiblePins,
    hoveredPin,
    setHoveredPin,
    renderedComponents,
    setRenderedComponents,
    draggingComponent,
    setDraggingComponent,
    dragOffset,
    setDragOffset,
    handleRetry: retryLoading
  } = useCircuitCanvasState(components);
  
  // Initialize wire system
  const { onConnect: baseOnConnect, connectionLineStyle: baseConnectionLineStyle } = useWireSystem(components);
  
  // React Flow state
  const [reactFlowNodes, setReactFlowNodes, onNodesChange] = useNodesState([]);
  const [reactFlowEdges, setReactFlowEdges, onEdgesChange] = useEdgesState([]);
  
  // React Flow instance methods
  const { 
    project, 
    addNodes, 
    addEdges, 
    deleteElements,
    getNode,
    getEdge
  } = useReactFlow();
  
  const {
    zoom,
    offset,
    panMode,
    isDraggingCanvas,
    handleZoomIn,
    handleZoomOut,
    togglePanMode,
    startPan,
    pan,
    endPan,
    handleWheel,
    updateCanvasDimensions,
    screenToCanvasCoordinates
  } = useCanvasNavigation(1);
  
  const { 
    components: libraryComponents, 
    componentsDetailsMap, 
    isLoadingComponents, 
    isLoadingDetails 
  } = useComponentLibrary();

  // Convert components to nodes
  useEffect(() => {
    if (!components || components.length === 0) return;
    
    console.log(`Converting ${components.length} components to nodes`);
    const initialNodes = components.map(comp => {
      // Log each component before conversion for debugging
      console.log(`Component before conversion:`, {
        id: comp.id,
        type: comp.type,
        hasSvgPath: !!comp.svgPath,
        svgPathLength: comp.svgPath?.length || 0,
      });
      
      return componentToNode(comp);
    });
    
    setReactFlowNodes(initialNodes);
  }, [components, setReactFlowNodes]);
  
  // Update canvas dimensions when window size changes
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setCanvasSize({ width, height });
        updateCanvasDimensions(width, height);
      }
    };
    
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [updateCanvasDimensions, setCanvasSize]);

  // Handle node drag end - update component positions
  const onNodeDragStop = useCallback((event: React.MouseEvent, node: any) => {
    // Update the component position when a node is dragged
    const updatedComponents = components.map(comp => {
      if (comp.id === node.id) {
        return {
          ...comp,
          left: node.position.x,
          top: node.position.y
        };
      }
      return comp;
    });
    
    onComponentsChange(updatedComponents);
  }, [components, onComponentsChange]);

  // Handle drop to create new component
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    
    try {
      const componentData = e.dataTransfer.getData('component');
      if (!componentData) return;
      
      const componentInfo = JSON.parse(componentData);
      console.log('Dropped component data:', componentInfo);
      
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      
      const position = reactFlowInstance?.screenToFlowPosition({
        x: e.clientX,
        y: e.clientY
      }) || { x: 0, y: 0 };
      
      const gridSize = 25;
      const left = Math.floor(position.x / gridSize) * gridSize;
      const top = Math.floor(position.y / gridSize) * gridSize;
      
      const libraryComponent = libraryComponents?.find(c => c.type === componentInfo.type);
      
      let pins;
      if (libraryComponent?.id && componentsDetailsMap && componentsDetailsMap[libraryComponent.id]) {
        const details = componentsDetailsMap[libraryComponent.id];
        if (details && details.pins && details.pins.length > 0) {
          pins = details.pins.map((pin: any) => ({
            name: pin.name,
            x: Number(pin.x),
            y: Number(pin.y),
            signals: pin.signals || []
          }));
        }
      }
      
      if (!pins && libraryComponent?.pins) {
        pins = libraryComponent.pins.map(pin => ({
          name: pin.name,
          x: Number(pin.x),
          y: Number(pin.y),
          signals: pin.signals || []
        }));
      }
      
      if (!pins) {
        pins = getComponentPinInfo(componentInfo.type);
      }
      
      // Create the new component with svgPath and isOriginal values from the drag data
      const newComponent: WokwiComponent = {
        type: componentInfo.type,
        id: `comp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        top,
        left,
        attributes: { color: 'red' },
        pins,
        // Ensure svgPath and isOriginal are properly passed from the drag data
        svgPath: componentInfo.svgPath,
        isOriginal: componentInfo.isOriginal
      };
      
      console.log('Created new component:', newComponent);
      
      const updatedComponents = [...components, newComponent];
      onComponentsChange(updatedComponents);
      
      toast.success(`Added ${componentInfo.name || componentInfo.type}`, {
        description: `Component placed at position (${left}, ${top})`,
        duration: 2000,
      });
    } catch (error) {
      console.error('Error adding component:', error);
      toast.error('Failed to add component');
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  // Wire routing handlers
  const onConnectStart = useCallback((event: React.MouseEvent, { nodeId, handleId }: { nodeId: string, handleId: string }) => {
    if (!nodeId || !handleId) return;
    
    // Only start wiring from component nodes (not routing points)
    const sourceNode = getNode(nodeId);
    if (sourceNode?.type !== 'wokwiComponent') return;
    
    // Get the pin index from the handle ID
    const pinIndex = parseInt(handleId.split('-')[1]);
    if (isNaN(pinIndex)) return;
    
    // Determine signal type and color from the source pin
    const signalType = getPinSignalType(components, nodeId, pinIndex) || 'digital';
    const wireColor = getWireColorFromSignal(signalType);
    
    console.log(`Starting wire from ${nodeId}:${handleId} with color ${wireColor}`);
    
    // Initialize wiring state
    setWiringState({
      startNodeId: nodeId,
      startHandleId: handleId,
      lastNodeId: nodeId,
      lastHandleId: handleId,
      intermediateNodes: [],
      intermediateEdges: [],
      currentColor: wireColor,
      currentSignalType: signalType
    });
  }, [components, getNode]);

  const onPaneClick = useCallback((event: React.MouseEvent) => {
    // Only handle clicks during active wiring
    if (!wiringState) return;
    
    // Get the click position in flow coordinates
    const position = project({ x: event.clientX, y: event.clientY });
    
    // Create a new routing point node
    const routingNodeId = `routing-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newRoutingNode: Node = {
      id: routingNodeId,
      type: 'routingPoint',
      position,
      data: {},
      draggable: true
    };
    
    // Create an edge from the last node to this routing point
    const edgeId = `edge-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newEdge: Edge = {
      id: edgeId,
      source: wiringState.lastNodeId,
      sourceHandle: wiringState.lastHandleId || undefined,
      target: routingNodeId,
      targetHandle: `${routingNodeId}-target`,
      type: 'default',
      style: { 
        stroke: wiringState.currentColor, 
        strokeWidth: 2 
      },
      data: { 
        color: wiringState.currentColor,
        signalType: wiringState.currentSignalType,
        isRoutingSegment: true
      }
    };
    
    // Add the new node and edge to the flow
    addNodes(newRoutingNode);
    addEdges(newEdge);
    
    // Update wiring state
    setWiringState(prev => {
      if (!prev) return null;
      return {
        ...prev,
        lastNodeId: routingNodeId,
        lastHandleId: `${routingNodeId}-source`,
        intermediateNodes: [...prev.intermediateNodes, routingNodeId],
        intermediateEdges: [...prev.intermediateEdges, edgeId]
      };
    });
    
    console.log(`Added routing point at (${position.x}, ${position.y})`);
  }, [wiringState, addNodes, addEdges, project]);

  const onConnect = useCallback((connection: Connection) => {
    if (!connection.source || !connection.target || !connection.sourceHandle || !connection.targetHandle) {
      return;
    }
    
    if (wiringState) {
      // We're completing a multi-segment wire
      console.log('Completing multi-segment wire');
      
      // Create the final edge segment
      const finalEdgeId = `edge-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const finalEdge: Edge = {
        id: finalEdgeId,
        source: wiringState.lastNodeId,
        sourceHandle: wiringState.lastHandleId || undefined,
        target: connection.target,
        targetHandle: connection.targetHandle,
        type: 'default',
        style: { 
          stroke: wiringState.currentColor, 
          strokeWidth: 2 
        },
        data: { 
          color: wiringState.currentColor,
          signalType: wiringState.currentSignalType,
          sourcePinIndex: parseInt(wiringState.startHandleId.split('-')[1]),
          targetPinIndex: parseInt(connection.targetHandle.split('-')[1]),
          isRoutingSegment: false
        }
      };
      
      // Add the final edge
      addEdges(finalEdge);
      
      toast.success('Multi-segment wire connected', {
        description: 'Wire with routing points connected successfully',
        duration: 1500,
      });
      
      // Reset wiring state
      setWiringState(null);
    } else {
      // Standard direct connection
      baseOnConnect(connection);
    }
  }, [wiringState, addEdges, baseOnConnect]);

  const onConnectEnd = useCallback((event: MouseEvent) => {
    // Check if the connection was canceled (released on the pane)
    if (wiringState && event.target instanceof Element) {
      const targetElement = event.target as Element;
      
      // If released on the pane (not on a node), cancel the wiring
      if (targetElement.classList.contains('react-flow__pane')) {
        console.log('Wire connection canceled');
        
        // Delete all intermediate nodes and edges
        if (wiringState.intermediateNodes.length > 0 || wiringState.intermediateEdges.length > 0) {
          deleteElements({
            nodes: wiringState.intermediateNodes.map(id => ({ id })),
            edges: wiringState.intermediateEdges.map(id => ({ id }))
          });
          
          toast.info('Wire connection canceled', {
            duration: 1500,
          });
        }
        
        // Reset wiring state
        setWiringState(null);
      }
    }
  }, [wiringState, deleteElements]);

  const onNodesDelete = useCallback((nodes: Node[]) => {
    // Check if any routing points were deleted
    const deletedRoutingPoints = nodes.filter(node => node.type === 'routingPoint');
    if (deletedRoutingPoints.length > 0) {
      console.log(`Deleted ${deletedRoutingPoints.length} routing points`);
      // Any additional cleanup if needed
    }
  }, []);

  // Update connection line style based on current wiring
  const connectionLineStyle = wiringState 
    ? { ...baseConnectionLineStyle, stroke: wiringState.currentColor }
    : baseConnectionLineStyle;

  return (
    <div className="h-full w-full bg-white relative flex flex-col">
      <LoadingOverlay 
        isReady={isReady} 
        loadingError={loadingError} 
        onRetry={handleRetry} 
      />

      <CanvasControls 
        zoom={zoom}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        panMode={panMode}
        togglePanMode={togglePanMode}
      />
      
      <div 
        ref={containerRef}
        className="h-full w-full overflow-hidden"
      >
        <ReactFlow
          ref={canvasRef}
          nodes={reactFlowNodes}
          edges={reactFlowEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onConnectStart={onConnectStart}
          onConnectEnd={onConnectEnd}
          onPaneClick={onPaneClick}
          onNodesDelete={onNodesDelete}
          nodeTypes={nodeTypes}
          onInit={setReactFlowInstance}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onNodeDragStop={onNodeDragStop}
          connectionMode={ConnectionMode.Loose}
          connectionLineStyle={connectionLineStyle}
          minZoom={0.5}
          maxZoom={4}
          defaultViewport={{ x: 0, y: 0, zoom: 1 }}
          fitView
          snapToGrid={true}
          snapGrid={[25, 25]}
          deleteKeyCode={['Backspace', 'Delete']}
        >
          <Background 
            variant={BackgroundVariant.Dots} 
            gap={25} 
            size={1} 
            color="#e2e8f0" 
          />
          <Controls position="bottom-right" showInteractive={false} />
        </ReactFlow>
      </div>
    </div>
  );
};

export default function CircuitCanvasWithProvider({ components, onComponentsChange }: CircuitCanvasProps) {
  return (
    <ReactFlowProvider>
      <CircuitCanvas components={components} onComponentsChange={onComponentsChange} />
    </ReactFlowProvider>
  );
}
