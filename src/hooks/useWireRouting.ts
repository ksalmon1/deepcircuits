
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

  /**
   * Cancel the current wire connection
   */
  const cancelWireConnection = useCallback(() => {
    if (!wireConnectionState.isConnecting) return;
    
    console.log('Cancelling wire connection');
    
    // Reset connection state
    setWireConnectionState({
      isConnecting: false,
      routingPoints: []
    });
    
    return true;
  }, [wireConnectionState]);

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
    
    // Set connection state
    setWireConnectionState({
      isConnecting: true,
      sourceNodeId: nodeId,
      sourceHandleId: handleId,
      sourcePinIndex: pinIndex,
      routingPoints: []
    });
    
    return true;
  }, [getInitialMousePosition]);
  
  /**
   * Add a routing point at the specified position
   */
  const addRoutingPoint = useCallback((point: XYPosition) => {
    if (!wireConnectionState.isConnecting) return false;
    
    console.log('Adding routing point at:', point);
    
    const newRoutingPoints = [...wireConnectionState.routingPoints, point];
    
    setWireConnectionState(prev => ({
      ...prev,
      routingPoints: newRoutingPoints
    }));
    
    return true;
  }, [wireConnectionState]);

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
      } as WireData,
      style: {
        stroke: wireColor,
        strokeWidth: 2
      },
      animated: signal === 'clock' || signal === 'data'
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
    
    // Add the permanent edge
    setEdges(edges => [...edges, newEdge] as Edge[]);
    
    // Reset connection state
    setWireConnectionState({
      isConnecting: false,
      routingPoints: []
    });
    
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

  // Return the hook interface with removed properties
  return {
    wireConnectionState,
    startWireConnection,
    addRoutingPoint,
    completeWireConnection,
    cancelWireConnection,
    handleCanvasClick,
    handleHandleClick,
    deleteWire,
  };
};

export default useWireRouting;
