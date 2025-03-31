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

import WokwiComponentNode from './CircuitCanvas/WokwiComponentNode';
import CustomWireEdge from './CircuitCanvas/CustomWireEdge';
import LoadingOverlay from './CircuitCanvas/LoadingOverlay';
import { useCircuitCanvasState } from '@/hooks/useCircuitCanvasState';
import { convertToCanvasCoordinates } from '@/utils/canvasUtils';

interface CircuitCanvasProps {
  components: WokwiComponent[];
  onComponentsChange: (components: WokwiComponent[]) => void;
}

const nodeTypes = {
  wokwiComponent: WokwiComponentNode
};

const edgeTypes: EdgeTypes = {
  customWire: CustomWireEdge
};

const CircuitCanvas = ({ components, onComponentsChange }: CircuitCanvasProps) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const reactFlowWrapperRef = useRef<HTMLDivElement>(null);
  
  const { isReady, loadingError, handleRetry } = useWokwiLoader();
  const { pinCache } = useComponentPinCache();
  
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
  
  const { 
    wireConnectionState,
    temporaryEdge,
    handleCanvasClick,
    handleHandleClick,
    deleteWire,
    connectionLineStyle,
    showHorizontalGuide,
    showVerticalGuide,
    lastFixedPointPosition,
    mousePosition
  } = useWireRouting(components);
  
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
  
  const reactFlowUtils = useReactFlow();
  
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
        ref={reactFlowWrapperRef}
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
          
          {wireConnectionState.isConnecting && (showHorizontalGuide || showVerticalGuide) && (
            <svg
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                zIndex: 5,
              }}
            >
              {showHorizontalGuide && (() => {
                const projectedFixed = reactFlowUtils.flowToScreenPosition(lastFixedPointPosition);
                const projectedMouse = reactFlowUtils.flowToScreenPosition(mousePosition);
                
                return (
                  <line
                    x1={projectedFixed.x}
                    y1={projectedFixed.y}
                    x2={projectedMouse.x}
                    y2={projectedFixed.y}
                    stroke="#3082f6"
                    strokeWidth={1}
                    strokeDasharray="5,5"
                    // pointerEvents="none"
                  />
                );
              })()}
              
              {showVerticalGuide && (() => {
                const projectedFixed = reactFlowUtils.flowToScreenPosition(lastFixedPointPosition);
                const projectedMouse = reactFlowUtils.flowToScreenPosition(mousePosition);
                
                return (
                  <line
                    x1={projectedFixed.x}
                    y1={projectedFixed.y}
                    x2={projectedFixed.x}
                    y2={projectedMouse.y}
                    stroke="#3082f6"
                    strokeWidth={1}
                    strokeDasharray="5,5"
                    // pointerEvents="none"
                  />
                );
              })()}
            </svg>
          )}
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
