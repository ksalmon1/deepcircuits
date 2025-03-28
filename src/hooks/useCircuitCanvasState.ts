
import { useState, useCallback, useRef, useEffect } from 'react';
import { WokwiComponent } from '@/integrations/wokwi/WokwiIntegration';
import { Node, Edge, ReactFlowInstance } from '@xyflow/react';
import { WokwiNodeData } from '@/types/circuit';
import { toast } from 'sonner';

/**
 * Custom hook to manage the state of the circuit canvas
 */
export function useCircuitCanvasState(components: WokwiComponent[]) {
  // Canvas state
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [isReady, setIsReady] = useState(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [loadingAttempts, setLoadingAttempts] = useState(0);
  
  // React Flow state
  const [nodes, setNodes] = useState<Node<WokwiNodeData>[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  
  // Component interaction state
  const [hoveredComponent, setHoveredComponent] = useState<string | null>(null);
  const [hoveredPins, setHoveredPins] = useState<any[]>([]);
  const [visiblePins, setVisiblePins] = useState<{[componentId: string]: boolean}>({});
  const [hoveredPin, setHoveredPin] = useState<{componentId: string, pinIndex: number} | null>(null);
  const [renderedComponents, setRenderedComponents] = useState<Record<string, boolean>>({});
  
  // Drag state
  const [draggingComponent, setDraggingComponent] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  // Handle retry when loading fails
  const handleRetry = useCallback(() => {
    setLoadingError(null);
    setLoadingAttempts(0);
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
    handleRetry
  };
}
