
import { useState, useCallback } from 'react';
import { WokwiComponent } from '@/integrations/wokwi/WokwiIntegration';
import { Node, Edge, ReactFlowInstance } from '@xyflow/react';
import { WokwiNodeData } from '@/types/circuit';
import { AppError } from '@/utils/errorHandling';

/**
 * Custom hook to manage the state of the circuit canvas
 * This hook separates UI state from domain state more clearly
 */
export function useCircuitCanvasState(components: WokwiComponent[]) {
  // Canvas state - UI related
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [loadingAttempts, setLoadingAttempts] = useState(0);
  
  // Ready state - tracks if the canvas is ready to interact with
  const [isReady, setIsReady] = useState(false);
  
  // React Flow state - related to the visualization library
  // Note: We're using Node type without generic constraint to avoid type issues
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  
  // Component interaction state - UI interactions with components
  const [hoveredComponent, setHoveredComponent] = useState<string | null>(null);
  const [hoveredPins, setHoveredPins] = useState<any[]>([]);
  const [visiblePins, setVisiblePins] = useState<{[componentId: string]: boolean}>({});
  const [hoveredPin, setHoveredPin] = useState<{componentId: string, pinIndex: number} | null>(null);
  const [renderedComponents, setRenderedComponents] = useState<Record<string, boolean>>({});
  
  // Drag state - UI interaction for dragging
  const [draggingComponent, setDraggingComponent] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  // Handle retry when loading fails
  const handleRetry = useCallback(() => {
    try {
      setLoadingError(null);
      setLoadingAttempts(prev => prev + 1);
    } catch (error) {
      console.error('Error during canvas retry:', error);
      if (error instanceof AppError) {
        setLoadingError(error.message);
      } else if (error instanceof Error) {
        setLoadingError(error.message);
      } else {
        setLoadingError('Unknown error occurred while retrying');
      }
    }
  }, []);
  
  // Reset canvas state
  const resetCanvasState = useCallback(() => {
    try {
      setNodes([]);
      setEdges([]);
      setHoveredComponent(null);
      setHoveredPins([]);
      setVisiblePins({});
      setHoveredPin(null);
      setDraggingComponent(null);
      setDragOffset({ x: 0, y: 0 });
    } catch (error) {
      console.error('Error resetting canvas state:', error);
      // We don't set loading error here since this is not a loading operation
    }
  }, []);

  // Update component visibility
  const setComponentVisibility = useCallback((componentId: string, isVisible: boolean) => {
    setRenderedComponents(prev => ({
      ...prev,
      [componentId]: isVisible
    }));
  }, []);

  // Add node to canvas
  const addNode = useCallback((node: Node) => {
    setNodes(prev => [...prev, node]);
  }, []);

  // Remove node from canvas
  const removeNode = useCallback((nodeId: string) => {
    setNodes(prev => prev.filter(node => node.id !== nodeId));
  }, []);

  // Add edge to canvas
  const addEdge = useCallback((edge: Edge) => {
    setEdges(prev => [...prev, edge]);
  }, []);

  // Remove edge from canvas
  const removeEdge = useCallback((edgeId: string) => {
    setEdges(prev => prev.filter(edge => edge.id !== edgeId));
  }, []);

  return {
    // Canvas state
    canvasSize,
    setCanvasSize,
    isReady,
    setIsReady,
    loadingError,
    setLoadingError,
    loadingAttempts,
    setLoadingAttempts,
    
    // React Flow state
    nodes,
    setNodes,
    edges,
    setEdges,
    reactFlowInstance,
    setReactFlowInstance,
    
    // Component interaction state
    hoveredComponent,
    setHoveredComponent,
    hoveredPins,
    setHoveredPins,
    visiblePins,
    setVisiblePins,
    hoveredPin,
    setHoveredPin,
    renderedComponents,
    setRenderedComponents,
    
    // Drag state
    draggingComponent,
    setDraggingComponent,
    dragOffset,
    setDragOffset,
    
    // Functions
    handleRetry,
    resetCanvasState,
    setComponentVisibility,
    addNode,
    removeNode,
    addEdge,
    removeEdge,
  };
}
