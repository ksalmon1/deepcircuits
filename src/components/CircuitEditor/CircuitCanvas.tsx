
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
  OnConnect
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import './CircuitCanvas/circuit-canvas.css';

// Import the sub-components we created
import WokwiComponentNode from './CircuitCanvas/WokwiComponentNode';
import CanvasControls from './CircuitCanvas/CanvasControls';
import LoadingOverlay from './CircuitCanvas/LoadingOverlay';
import { useCircuitCanvasState } from '@/hooks/useCircuitCanvasState';

interface CircuitCanvasProps {
  components: WokwiComponent[];
  onComponentsChange: (components: WokwiComponent[]) => void;
}

// Define the custom node types
const nodeTypes = {
  wokwiComponent: WokwiComponentNode as React.ComponentType<any>
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
  
  // Initialize wire system
  const { onConnect, connectionLineStyle } = useWireSystem(components);
  
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
    isLoadingDetails 
  } = useComponentLibrary();

  // Convert components to nodes
  useEffect(() => {
    const initialNodes = components.map(comp => componentToNode({
      id: comp.id,
      type: comp.type,
      left: comp.left,
      top: comp.top,
      attributes: comp.attributes,
      pins: comp.pins || []
    }));
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

  // Handle connect - create a wire
  const handleConnect: OnConnect = useCallback((params) => {
    onConnect(params);
  }, [onConnect]);

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
          onConnect={handleConnect}
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
