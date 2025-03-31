
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
import { useWireRouting } from '@/hooks/useWireRouting';
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
  Node,
  XYPosition,
  EdgeTypes,
  NodeTypes
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import './CircuitCanvas/circuit-canvas.css';

// Import the sub-components we created
import WokwiComponentNode from './CircuitCanvas/WokwiComponentNode';
import CustomWireEdge from './CircuitCanvas/CustomWireEdge';
import LoadingOverlay from './CircuitCanvas/LoadingOverlay';
import { useCircuitCanvasState } from '@/hooks/useCircuitCanvasState';

interface CircuitCanvasProps {
  components: WokwiComponent[];
  onComponentsChange: (components: WokwiComponent[]) => void;
}

// Define the custom node types
const nodeTypes: NodeTypes = {
  wokwiComponent: WokwiComponentNode
};

// Define the custom edge types
const edgeTypes: EdgeTypes = {
  customWire: CustomWireEdge
};

const CircuitCanvas = ({ components, onComponentsChange }: CircuitCanvasProps) => {
  // Refs
  const canvasRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Custom hooks
  const { isReady, loadingError, handleRetry } = useWokwiLoader();
  const { pinCache } = useComponentPinCache();
  
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
  
  // Initialize wire routing system
  const { 
    wireConnectionState,
    temporaryEdge,
    handleCanvasClick,
    handleHandleClick,
    deleteWire,
    connectionLineStyle,
  } = useWireRouting(components);
  
  // React Flow state
  const [reactFlowNodes, setReactFlowNodes, onNodesChange] = useNodesState([]);
  const [reactFlowEdges, setReactFlowEdges, onEdgesChange] = useEdgesState([]);
  
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
    isLoadingDetails,
    getComponentDetailsWithPins
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
    
    // Call updateSize after a short delay to make sure all elements are properly rendered
    const resizeTimer = setTimeout(updateSize, 100);
    
    return () => {
      window.removeEventListener('resize', updateSize);
      clearTimeout(resizeTimer);
    };
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
      
      // Find the library component by type to get detailed information
      const libraryComponent = libraryComponents?.find(c => c.type === componentInfo.type);
      
      // Get pins and properties from component details in Supabase
      let pins = [];
      let properties = {};
      
      if (libraryComponent?.id) {
        // First try to get from the details map (should be pre-loaded)
        const details = getComponentDetailsWithPins(libraryComponent.id);
        if (details) {
          console.log(`Found component details for ${componentInfo.type} from cache`);
          pins = details.pins || [];
          properties = details.properties || {};
        }
      }
      
      // Fallback: if no pins from Supabase, use the ones from the library component
      if (!pins.length && libraryComponent?.pins) {
        pins = libraryComponent.pins;
        console.log(`Using pins from library component for ${componentInfo.type}:`, pins);
      }
      
      // Final fallback: use default Wokwi pin info as last resort
      if (!pins.length) {
        pins = getComponentPinInfo(componentInfo.type);
        console.log(`Using default Wokwi pins for ${componentInfo.type}:`, pins);
      }
      
      // Create the new component with all available data
      const newComponent: WokwiComponent = {
        type: componentInfo.type,
        id: `comp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        top,
        left,
        attributes: { ...properties },  // Use properties from Supabase as attributes
        pins,
        svgPath: componentInfo.svgPath,
        isOriginal: componentInfo.isOriginal
      };
      
      console.log('Created new component with Supabase data:', newComponent);
      
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

  // Custom click handler for the pane
  const onPaneClick = useCallback((event: React.MouseEvent) => {
    // Check if we're in connecting mode
    if (wireConnectionState.isConnecting) {
      event.preventDefault();
      event.stopPropagation();
      
      // Get the mouse position relative to the flow container
      const reactFlowBounds = canvasRef.current?.getBoundingClientRect();
      if (reactFlowBounds && reactFlowInstance) {
        // Get the position directly from ReactFlow's screenToFlowPosition
        const position = reactFlowInstance.screenToFlowPosition({
          x: event.clientX,
          y: event.clientY
        });
        
        console.log('Pane clicked at screen coordinates:', event.clientX, event.clientY);
        console.log('Converted to flow coordinates:', position);
        
        // Pass the position to the handleCanvasClick function
        handleCanvasClick(event, position);
        return;
      }
    }
  }, [wireConnectionState.isConnecting, reactFlowInstance, handleCanvasClick]);
  
  // Handle pin click through custom event
  useEffect(() => {
    const handlePinClick = (event: CustomEvent) => {
      const { nodeId, handleId } = event.detail;
      handleHandleClick(nodeId, handleId);
    };
    
    document.addEventListener('handle-click', handlePinClick as EventListener);
    
    return () => {
      document.removeEventListener('handle-click', handlePinClick as EventListener);
    };
  }, [handleHandleClick]);

  return (
    <div className="h-full w-full bg-white relative flex flex-col overflow-hidden">
      <LoadingOverlay 
        isReady={isReady} 
        loadingError={loadingError} 
        onRetry={handleRetry} 
      />
      
      <div 
        ref={containerRef}
        className="h-full w-full overflow-hidden"
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      >
        <ReactFlow
          ref={canvasRef}
          nodes={reactFlowNodes}
          edges={reactFlowEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onInit={setReactFlowInstance}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onNodeDragStop={onNodeDragStop}
          connectionMode={ConnectionMode.Loose}
          connectionLineStyle={connectionLineStyle}
          onPaneClick={onPaneClick}
          minZoom={0.5}
          maxZoom={4}
          defaultViewport={{ x: 0, y: 0, zoom: 1 }}
          fitView
          snapToGrid={true}
          snapGrid={[25, 25]}
          deleteKeyCode={['Backspace', 'Delete']}
          elementsSelectable={!wireConnectionState.isConnecting} // Disable selection when wiring
          style={{ width: '100%', height: '100%' }}
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
