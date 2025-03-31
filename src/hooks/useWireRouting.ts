import { useCallback, useState, useEffect } from 'react';
import { Connection, useReactFlow, Edge, Position, XYPosition } from '@xyflow/react';
import { WireData, WireEdge, WireConnectionState } from '@/types/circuit';
import { getPinSignalType, getWireColorFromSignal, createWireId } from '@/utils/wireUtils';
import { isValidConnection } from '@/domain/connectionRules';
import { CircuitComponent } from '@/types/component';
import { toast } from 'sonner';
import { convertToCanvasCoordinates } from '@/utils/canvasUtils';

export const useWireRouting = (components: CircuitComponent[]) => {
  const { setEdges, getNodes, getEdges, getViewport } = useReactFlow();
  const [wireConnectionState, setWireConnectionState] = useState<WireConnectionState>({
    isConnecting: false,
    routingPoints: [],
  });
  const [temporaryEdge, setTemporaryEdge] = useState<Edge<WireData> | null>(null);
  const [mousePosition, setMousePosition] = useState<XYPosition>({ x: 0, y: 0 });
  const [lastFixedPointPosition, setLastFixedPointPosition] = useState<XYPosition>({ x: 0, y: 0 });
  const [showHorizontalGuide, setShowHorizontalGuide] = useState<boolean>(false);
  const [showVerticalGuide, setShowVerticalGuide] = useState<boolean>(false);

  /**
   * Cancel the current wire connection
   */
  const cancelWireConnection = useCallback(() => {
    if (!wireConnectionState.isConnecting) return;
    
    console.log('Cancelling wire connection');
    
    // Remove temporary edge if it exists
    if (wireConnectionState.temporaryEdgeId) {
      setEdges(edges => edges.filter(edge => edge.id !== wireConnectionState.temporaryEdgeId));
    }
    
    // Reset connection state
    setWireConnectionState({
      isConnecting: false,
      routingPoints: []
    });
    
    setTemporaryEdge(null);
    setShowHorizontalGuide(false);
    setShowVerticalGuide(false);
    
    return true;
  }, [wireConnectionState, setEdges]);

  /**
   * Update the temporary edge to follow the mouse cursor
   */
  const updateTemporaryEdge = useCallback((mousePos: XYPosition) => {
    if (!wireConnectionState.isConnecting || !wireConnectionState.temporaryEdgeId) return;
    
    setEdges(edges => edges.map(edge => {
      if (edge.id === wireConnectionState.temporaryEdgeId) {
        return {
          ...edge,
          targetPosition: Position.Left,
          data: {
            ...edge.data,
            cursorPosition: mousePos
          }
        };
      }
      return edge;
    }));
  }, [wireConnectionState, setEdges]);

  /**
   * Track mouse movement when a wire connection is in progress
   */
  useEffect(() => {
    if (!wireConnectionState.isConnecting) return;
    
    // Get the last fixed point position
    const updateLastFixedPoint = () => {
      if (wireConnectionState.routingPoints.length > 0) {
        // Use the last routing point as the reference
        const lastPoint = wireConnectionState.routingPoints[wireConnectionState.routingPoints.length - 1];
        setLastFixedPointPosition(lastPoint);
      } else if (wireConnectionState.sourceNodeId) {
        // Use source node handle as the reference
        const nodes = getNodes();
        const sourceNode = nodes.find(node => node.id === wireConnectionState.sourceNodeId);
        
        if (sourceNode && wireConnectionState.sourceHandleId) {
          const handleId = wireConnectionState.sourceHandleId;
          // Find the handle position from the DOM
          const handleElement = document.querySelector(
            `.react-flow__handle[data-handleid="${handleId}"][data-nodeid="${sourceNode.id}"]`
          );
          
          if (handleElement) {
            const rect = handleElement.getBoundingClientRect();
            const viewport = getViewport();
            
            // Convert to flow coordinates
            const handlePosition = {
              x: (rect.left + rect.width / 2 - viewport.x) / viewport.zoom,
              y: (rect.top + rect.height / 2 - viewport.y) / viewport.zoom
            };
            
            setLastFixedPointPosition(handlePosition);
          }
        }
      }
    };
    
    updateLastFixedPoint();
    
    const handleMouseMove = (event: MouseEvent) => {
      const reactFlowBounds = document.querySelector('.react-flow')?.getBoundingClientRect();
      if (reactFlowBounds) {
        const viewport = getViewport();
        const mousePos = convertToCanvasCoordinates(event, reactFlowBounds, viewport);
        setMousePosition(mousePos);
        updateTemporaryEdge(mousePos);
        
        // Check alignment with last fixed point for guidelines
        const threshold = 3; // pixels
        const dx = Math.abs(mousePos.x - lastFixedPointPosition.x);
        const dy = Math.abs(mousePos.y - lastFixedPointPosition.y);
        
        const shouldShowH = dx < threshold; // Show horizontal guide when X values are close
        const shouldShowV = dy < threshold; // Show vertical guide when Y values are close
        
        // Add this console log:
        console.log('Guide Check:', { 
          mouse: mousePos, 
          lastFixed: lastFixedPointPosition,
          dx, dy,
          showH: shouldShowH,
          showV: shouldShowV
        });
        
        setShowHorizontalGuide(shouldShowH);
        setShowVerticalGuide(shouldShowV);
      }
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [wireConnectionState, getNodes, getViewport, updateTemporaryEdge, lastFixedPointPosition]);
  
  /**
   * Create a temporary edge for wire routing
   */
  const createTemporaryEdge = useCallback((
    nodeId: string, 
    handleId: string, 
    pinIndex: number, 
    initialMousePos: XYPosition
  ): Edge<WireData> => {
    const signal = getPinSignalType(components, nodeId, pinIndex);
    const wireColor = getWireColorFromSignal(signal || '');
    
    return {
      id: `temp-wire-${Date.now()}`,
      source: nodeId,
      target: nodeId, // Temporary target is the same as source
      sourceHandle: handleId,
      targetHandle: null as any,
      type: 'customWire',
      data: {
        color: wireColor,
        sourcePinIndex: pinIndex,
        targetPinIndex: -1,
        routingPoints: [],
        cursorPosition: initialMousePos
      } as WireData
    };
  }, [components]);

  /**
   * Get initial mouse position in canvas coordinates
   */
  const getInitialMousePosition = useCallback((): XYPosition | null => {
    const reactFlowBounds = document.querySelector('.react-flow')?.getBoundingClientRect();
    if (!reactFlowBounds) return null;
    
    const viewport = getViewport();
    const event = window.event as MouseEvent;
    
    return {
      x: (event ? event.clientX : 0 - reactFlowBounds.left - viewport.x) / viewport.zoom,
      y: (event ? event.clientY : 0 - reactFlowBounds.top - viewport.y) / viewport.zoom
    };
  }, [getViewport]);

  /**
   * Start a new wire connection from a component pin
   */
  const startWireConnection = useCallback((nodeId: string, handleId: string) => {
    console.log('Starting wire connection from:', nodeId, handleId);
    
    const initialMousePos = getInitialMousePosition();
    if (!initialMousePos) return false;
    
    const pinIndex = parseInt(handleId.split('-')[1]);
    const tempEdgeId = `temp-wire-${Date.now()}`;
    
    // Set connection state
    setWireConnectionState({
      isConnecting: true,
      sourceNodeId: nodeId,
      sourceHandleId: handleId,
      sourcePinIndex: pinIndex,
      routingPoints: [],
      temporaryEdgeId: tempEdgeId
    });
    
    // Create and add temporary edge
    const newTempEdge = createTemporaryEdge(nodeId, handleId, pinIndex, initialMousePos);
    
    setTemporaryEdge(newTempEdge);
    setEdges((eds) => [...eds, newTempEdge] as Edge[]);
    setMousePosition(initialMousePos);
    
    // Initialize the last fixed point position
    const nodes = getNodes();
    const sourceNode = nodes.find(node => node.id === nodeId);
    
    if (sourceNode) {
      const handleElement = document.querySelector(
        `.react-flow__handle[data-handleid="${handleId}"][data-nodeid="${nodeId}"]`
      );
      
      if (handleElement) {
        const rect = handleElement.getBoundingClientRect();
        const viewport = getViewport();
        
        // Convert to flow coordinates
        const handlePosition = {
          x: (rect.left + rect.width / 2 - viewport.x) / viewport.zoom,
          y: (rect.top + rect.height / 2 - viewport.y) / viewport.zoom
        };
        
        setLastFixedPointPosition(handlePosition);
      }
    }
    
    return true;
  }, [getInitialMousePosition, createTemporaryEdge, setEdges, getNodes, getViewport]);
  
  /**
   * Add a routing point at the specified position
   */
  const addRoutingPoint = useCallback((point: XYPosition) => {
    if (!wireConnectionState.isConnecting || !wireConnectionState.temporaryEdgeId) return false;
    
    console.log('Adding routing point at:', point);
    
    const newRoutingPoints = [...wireConnectionState.routingPoints, point];
    
    setWireConnectionState(prev => ({
      ...prev,
      routingPoints: newRoutingPoints
    }));
    
    setEdges(edges => edges.map(edge => {
      if (edge.id === wireConnectionState.temporaryEdgeId) {
        return {
          ...edge,
          data: {
            ...edge.data,
            routingPoints: newRoutingPoints
          }
        };
      }
      return edge;
    }));
    
    // Update the last fixed point when adding a routing point
    setLastFixedPointPosition(point);
    setShowHorizontalGuide(false);
    setShowVerticalGuide(false);
    
    return true;
  }, [wireConnectionState, setEdges]);

  /**
   * Check if connection between source and target is valid
   */
  const validateConnection = useCallback((
    sourceNodeId: string,
    sourcePinIndex: number,
    targetNodeId: string,
    targetPinIndex: number
  ): boolean => {
    // Prevent self-pin connections
    if (sourceNodeId === targetNodeId && sourcePinIndex === targetPinIndex) {
      return false;
    }
    
    // Check domain rules
    if (!isValidConnection(
      components, 
      sourceNodeId, 
      sourcePinIndex,
      targetNodeId,
      targetPinIndex
    )) {
      toast.error('Invalid connection', {
        description: 'These pins cannot be connected together',
        duration: 2000,
      });
      return false;
    }
    
    return true;
  }, [components]);

  /**
   * Create a permanent wire connection to complete the routing
   */
  const createFinalWireEdge = useCallback((
    sourceNodeId: string,
    sourceHandleId: string,
    sourcePinIndex: number,
    targetNodeId: string,
    targetHandleId: string,
    targetPinIndex: number,
    routingPoints: Array<{ x: number; y: number }>
  ): Edge<WireData> => {
    const signal = getPinSignalType(components, sourceNodeId, sourcePinIndex);
    const wireColor = getWireColorFromSignal(signal || '');
    
    return {
      id: createWireId(),
      source: sourceNodeId,
      target: targetNodeId,
      sourceHandle: sourceHandleId,
      targetHandle: targetHandleId,
      type: 'customWire',
      data: {
        color: wireColor,
        sourcePinIndex: sourcePinIndex,
        targetPinIndex: targetPinIndex,
        routingPoints: routingPoints,
      } as WireData
    };
  }, [components]);

  /**
   * Complete a wire connection to a target pin
   */
  const completeWireConnection = useCallback((targetNodeId: string, targetHandleId: string) => {
    if (!wireConnectionState.isConnecting || !wireConnectionState.sourceNodeId || !wireConnectionState.sourceHandleId) {
      return false;
    }
    
    // Check for self-connections
    if (wireConnectionState.sourceNodeId === targetNodeId && wireConnectionState.sourceHandleId === targetHandleId) {
      cancelWireConnection();
      return false;
    }
    
    console.log('Completing wire connection to:', targetNodeId, targetHandleId);
    
    const targetPinIndex = parseInt(targetHandleId.split('-')[1]);
    
    // Validate the connection
    if (!validateConnection(
      wireConnectionState.sourceNodeId,
      wireConnectionState.sourcePinIndex || 0,
      targetNodeId,
      targetPinIndex
    )) {
      return false;
    }
    
    // Create the permanent edge
    const newEdge = createFinalWireEdge(
      wireConnectionState.sourceNodeId,
      wireConnectionState.sourceHandleId,
      wireConnectionState.sourcePinIndex || 0,
      targetNodeId,
      targetHandleId,
      targetPinIndex,
      wireConnectionState.routingPoints
    );
    
    // Replace temporary edge with permanent edge
    setEdges(edges => {
      const filteredEdges = edges.filter(edge => edge.id !== wireConnectionState.temporaryEdgeId);
      return [...filteredEdges, newEdge] as Edge[];
    });
    
    // Reset connection state
    setWireConnectionState({
      isConnecting: false,
      routingPoints: []
    });
    
    setTemporaryEdge(null);
    
    // Clear alignment guides
    setShowHorizontalGuide(false);
    setShowVerticalGuide(false);
    
    toast.success('Connection created', {
      description: 'Wire connected successfully',
      duration: 1500,
    });
    
    return true;
  }, [wireConnectionState, validateConnection, createFinalWireEdge, setEdges, cancelWireConnection]);
  
  /**
   * Handle clicks on the canvas surface
   */
  const handleCanvasClick = useCallback((event: React.MouseEvent, position: XYPosition) => {
    if (wireConnectionState.isConnecting) {
      event.stopPropagation();
      console.log('Canvas click detected at:', position);
      addRoutingPoint(position);
      return true;
    }
    return false;
  }, [wireConnectionState.isConnecting, addRoutingPoint]);
  
  /**
   * Handle clicks on component pins
   */
  const handleHandleClick = useCallback((nodeId: string, handleId: string) => {
    if (!wireConnectionState.isConnecting) {
      startWireConnection(nodeId, handleId);
      return true;
    } else {
      completeWireConnection(nodeId, handleId);
      return true;
    }
  }, [wireConnectionState, startWireConnection, completeWireConnection]);
  
  /**
   * Setup keyboard listener for escape key to cancel connections
   */
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && wireConnectionState.isConnecting) {
        cancelWireConnection();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [wireConnectionState.isConnecting, cancelWireConnection]);
  
  /**
   * Delete a wire by its ID
   */
  const deleteWire = useCallback((wireId: string) => {
    setEdges((edges) => edges.filter(e => e.id !== wireId));
    
    toast.info('Wire removed', {
      duration: 1500,
    });
  }, [setEdges]);

  // Return the same interface to maintain compatibility with consumers
  return {
    wireConnectionState,
    temporaryEdge,
    mousePosition,
    lastFixedPointPosition,
    showHorizontalGuide,
    showVerticalGuide,
    startWireConnection,
    addRoutingPoint,
    completeWireConnection,
    cancelWireConnection,
    handleCanvasClick,
    handleHandleClick,
    deleteWire,
    connectionLineStyle: { stroke: '#9b87f5', strokeWidth: 2 },
  };
};

export default useWireRouting;
