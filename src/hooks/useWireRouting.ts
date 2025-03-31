import { useCallback, useState, useEffect, useMemo } from 'react';
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
  
  const [showHorizontalGuide, setShowHorizontalGuide] = useState(false);
  const [showVerticalGuide, setShowVerticalGuide] = useState(false);

  const lastFixedPointPosition = useMemo(() => {
    if (!wireConnectionState.isConnecting) return null;
    
    if (wireConnectionState.routingPoints.length > 0) {
      return wireConnectionState.routingPoints[wireConnectionState.routingPoints.length - 1];
    } else if (wireConnectionState.sourceNodeId) {
      const nodes = getNodes();
      const sourceNode = nodes.find(node => node.id === wireConnectionState.sourceNodeId);
      if (sourceNode) {
        return { 
          x: sourceNode.position.x, 
          y: sourceNode.position.y 
        };
      }
    }
    
    return null;
  }, [wireConnectionState, getNodes]);

  const cancelWireConnection = useCallback(() => {
    if (!wireConnectionState.isConnecting) return;
    
    console.log('Cancelling wire connection');
    
    if (wireConnectionState.temporaryEdgeId) {
      setEdges(edges => edges.filter(edge => edge.id !== wireConnectionState.temporaryEdgeId));
    }
    
    setWireConnectionState({
      isConnecting: false,
      routingPoints: []
    });
    
    setTemporaryEdge(null);
    setShowHorizontalGuide(false);
    setShowVerticalGuide(false);
    
    return true;
  }, [wireConnectionState, setEdges]);

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

  useEffect(() => {
    if (!wireConnectionState.isConnecting) return;
    
    const handleMouseMove = (event: MouseEvent) => {
      const reactFlowBounds = document.querySelector('.react-flow')?.getBoundingClientRect();
      if (reactFlowBounds) {
        const viewport = getViewport();
        const mousePos = convertToCanvasCoordinates(event, reactFlowBounds, viewport);
        setMousePosition(mousePos);
        updateTemporaryEdge(mousePos);
        
        if (lastFixedPointPosition) {
          const dx = Math.abs(mousePos.x - lastFixedPointPosition.x);
          const dy = Math.abs(mousePos.y - lastFixedPointPosition.y);
          const threshold = 5;
          
          setShowHorizontalGuide(dy < threshold);
          setShowVerticalGuide(dx < threshold);
          
          if (dy < threshold || dx < threshold) {
            const snappedPos = { ...mousePos };
            if (dy < threshold) snappedPos.y = lastFixedPointPosition.y;
            if (dx < threshold) snappedPos.x = lastFixedPointPosition.x;
            updateTemporaryEdge(snappedPos);
          }
        }
      }
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [wireConnectionState.isConnecting, getViewport, updateTemporaryEdge, lastFixedPointPosition]);

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
      target: nodeId,
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

  const startWireConnection = useCallback((nodeId: string, handleId: string) => {
    console.log('Starting wire connection from:', nodeId, handleId);
    
    const initialMousePos = getInitialMousePosition();
    if (!initialMousePos) return false;
    
    const pinIndex = parseInt(handleId.split('-')[1]);
    const tempEdgeId = `temp-wire-${Date.now()}`;
    
    setWireConnectionState({
      isConnecting: true,
      sourceNodeId: nodeId,
      sourceHandleId: handleId,
      sourcePinIndex: pinIndex,
      routingPoints: [],
      temporaryEdgeId: tempEdgeId
    });
    
    const newTempEdge = createTemporaryEdge(nodeId, handleId, pinIndex, initialMousePos);
    
    setTemporaryEdge(newTempEdge);
    setEdges((eds) => [...eds, newTempEdge] as Edge[]);
    setMousePosition(initialMousePos);
    
    return true;
  }, [getInitialMousePosition, createTemporaryEdge, setEdges]);

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
    
    return true;
  }, [wireConnectionState, setEdges]);

  const validateConnection = useCallback((
    sourceNodeId: string,
    sourcePinIndex: number,
    targetNodeId: string,
    targetPinIndex: number
  ): boolean => {
    if (sourceNodeId === targetNodeId && sourcePinIndex === targetPinIndex) {
      return false;
    }
    
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

  const completeWireConnection = useCallback((targetNodeId: string, targetHandleId: string) => {
    if (!wireConnectionState.isConnecting || !wireConnectionState.sourceNodeId || !wireConnectionState.sourceHandleId) {
      return false;
    }
    
    if (wireConnectionState.sourceNodeId === targetNodeId && wireConnectionState.sourceHandleId === targetHandleId) {
      cancelWireConnection();
      return false;
    }
    
    console.log('Completing wire connection to:', targetNodeId, targetHandleId);
    
    const targetPinIndex = parseInt(targetHandleId.split('-')[1]);
    
    if (!validateConnection(
      wireConnectionState.sourceNodeId,
      wireConnectionState.sourcePinIndex || 0,
      targetNodeId,
      targetPinIndex
    )) {
      return false;
    }
    
    const newEdge = createFinalWireEdge(
      wireConnectionState.sourceNodeId,
      wireConnectionState.sourceHandleId,
      wireConnectionState.sourcePinIndex || 0,
      targetNodeId,
      targetHandleId,
      targetPinIndex,
      wireConnectionState.routingPoints
    );
    
    setEdges(edges => {
      const filteredEdges = edges.filter(edge => edge.id !== wireConnectionState.temporaryEdgeId);
      return [...filteredEdges, newEdge] as Edge[];
    });
    
    setWireConnectionState({
      isConnecting: false,
      routingPoints: []
    });
    
    setTemporaryEdge(null);
    
    setShowHorizontalGuide(false);
    setShowVerticalGuide(false);
    
    toast.success('Connection created', {
      description: 'Wire connected successfully',
      duration: 1500,
    });
    
    return true;
  }, [wireConnectionState, validateConnection, createFinalWireEdge, setEdges, cancelWireConnection]);

  const handleCanvasClick = useCallback((event: React.MouseEvent, position: XYPosition) => {
    if (wireConnectionState.isConnecting) {
      event.stopPropagation();
      console.log('Canvas click detected at:', position);
      addRoutingPoint(position);
      return true;
    }
    return false;
  }, [wireConnectionState.isConnecting, addRoutingPoint]);

  const handleHandleClick = useCallback((nodeId: string, handleId: string) => {
    if (!wireConnectionState.isConnecting) {
      startWireConnection(nodeId, handleId);
      return true;
    } else {
      completeWireConnection(nodeId, handleId);
      return true;
    }
  }, [wireConnectionState, startWireConnection, completeWireConnection]);

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

  const deleteWire = useCallback((wireId: string) => {
    setEdges((edges) => edges.filter(e => e.id !== wireId));
    
    toast.info('Wire removed', {
      duration: 1500,
    });
  }, [setEdges]);

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
