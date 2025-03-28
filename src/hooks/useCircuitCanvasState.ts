
import { useState, useCallback, useRef, useEffect } from 'react';
import { WokwiComponent } from '@/integrations/wokwi/WokwiIntegration';
import { Node, Edge, ReactFlowInstance } from '@xyflow/react';
import { WokwiNodeData, WireEdgeData } from '@/types/circuit';
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
  const [nodes, setNodes, onNodesChange] = useState<Node<WokwiNodeData>[]>([]);
  const [edges, setEdges, onEdgesChange] = useState<Edge<WireEdgeData>[]>([]);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  
  // Wire editing state
  const [editingEdgeId, setEditingEdgeId] = useState<string | null>(null);
  const [controlPoints, setControlPoints] = useState<Record<string, { x: number, y: number }[]>>({});
  const [isDraggingControlPoint, setIsDraggingControlPoint] = useState(false);
  const [activeControlPoint, setActiveControlPoint] = useState<{edgeId: string, pointIndex: number} | null>(null);
  
  // Component interaction state
  const [hoveredComponent, setHoveredComponent] = useState<string | null>(null);
  const [hoveredPins, setHoveredPins] = useState<any[]>([]);
  const [visiblePins, setVisiblePins] = useState<{[componentId: string]: boolean}>({});
  const [hoveredPin, setHoveredPin] = useState<{componentId: string, pinIndex: number} | null>(null);
  const [renderedComponents, setRenderedComponents] = useState<Record<string, boolean>>({});
  
  // Drag state
  const [draggingComponent, setDraggingComponent] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  // Start wire editing mode
  const startEdgeEdit = useCallback((edgeId: string) => {
    setEditingEdgeId(edgeId);
    
    toast.info('Editing wire path. Drag control points to adjust the wire.', {
      duration: 3000,
    });
  }, []);
  
  // Finish wire editing mode
  const finishEdgeEdit = useCallback((edgeId: string) => {
    setEditingEdgeId(null);
    
    toast.success('Wire path updated', {
      duration: 2000,
    });
  }, []);
  
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
    onNodesChange,
    edges,
    setEdges,
    onEdgesChange,
    reactFlowInstance,
    setReactFlowInstance,
    
    // Wire editing state
    editingEdgeId,
    setEditingEdgeId,
    controlPoints,
    setControlPoints,
    isDraggingControlPoint,
    setIsDraggingControlPoint,
    activeControlPoint,
    setActiveControlPoint,
    
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
    startEdgeEdit,
    finishEdgeEdit,
    handleRetry
  };
}
