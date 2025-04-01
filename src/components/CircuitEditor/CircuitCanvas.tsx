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
import { wokwiComponentToNode } from '@/utils/componentConversion';
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
  ReactFlowInstance,
  ConnectionMode,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
  Node,
  XYPosition,
  EdgeTypes,
  NodeTypes,
  ReactFlowProvider
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import './CircuitCanvas/circuit-canvas.css';

import WokwiComponentNode from './CircuitCanvas/WokwiComponentNode';
import CustomWireEdge from './CircuitCanvas/CustomWireEdge';
import LoadingOverlay from './CircuitCanvas/LoadingOverlay';
import { useCircuitCanvasState } from '@/hooks/useCircuitCanvasState';

interface CircuitCanvasProps {
  components: WokwiComponent[];
  onComponentsChange: (components: WokwiComponent[]) => void;
}

// Define the custom node types
const nodeTypes = {
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
  
  // Directly use the useCircuitCanvasState hook
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
    handleCanvasClick,
    handleHandleClick,
    deleteWire,
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
    isLoadingDetails 
  } = useComponentLibrary();

  // Define connection line style for the dragging wire
  const connectionLineStyle = {
    stroke: '#9b87f5', // Default purple color
    strokeWidth: 2,
  };

  // Convert components to nodes
  useEffect(() => {
    if (!components || components.length === 0) return;
    
    console.log(`Converting ${components.length} components to nodes`);
    const initialNodes = components.map(comp => {
      console.log(`Component before conversion:`, {
        id: comp.id,
        type: comp.type,
        hasSvgPath: !!comp.svgPath,
        svgPathLength: comp.svgPath?.length || 0,
      });
      
      return wokwiComponentToNode(comp);
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
    
    const resizeTimer = setTimeout(updateSize, 100);
    
    return () => {
      window.removeEventListener('resize', updateSize);
      clearTimeout(resizeTimer);
    };
  }, [updateCanvasDimensions, setCanvasSize]);

  // Handle node drag end - update component positions
  const onNodeDragStop = useCallback((event: React.MouseEvent, node: any) => {
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

  // Listen for handle-click events from WokwiComponentNode
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

  // Handle drop to create new component
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    
    try {
      const componentData = e.dataTransfer.getData('component');
      if (!componentData) return;
      
      // Parse the component data
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
      
      const newComponent: WokwiComponent = {
        type: componentInfo.type,
        id: `comp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        top,
        left,
        attributes: { color: 'red' },
        pins,
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

  const onPaneClick = useCallback((event: React.MouseEvent) => {
    if (wireConnectionState.isConnecting) {
      event.preventDefault();
      event.stopPropagation();
      
      const reactFlowBounds = canvasRef.current?.getBoundingClientRect();
      if (reactFlowBounds && reactFlowInstance) {
        const position = reactFlowInstance.screenToFlowPosition({
          x: event.clientX,
          y: event.clientY
        });
        
        console.log('Pane clicked at screen coordinates:', event.clientX, event.clientY);
        console.log('Converted to flow coordinates:', position);
        
        handleCanvasClick(event, position);
        return;
      }
    }
  }, [wireConnectionState.isConnecting, reactFlowInstance, handleCanvasClick]);

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
          connectionLineComponent={CustomWireEdge}
          connectionLineType="customWire"
          connectionLineStyle={connectionLineStyle}
          onPaneClick={onPaneClick}
          minZoom={0.5}
          maxZoom={4}
          defaultViewport={{ x: 0, y: 0, zoom: 1 }}
          fitView
          snapToGrid={true}
          snapGrid={[25, 25]}
          deleteKeyCode={['Backspace', 'Delete']}
          elementsSelectable={!wireConnectionState.isConnecting}
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
