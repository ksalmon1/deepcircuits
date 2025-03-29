
import { useCallback, useState, useEffect } from 'react';
import { Connection, useReactFlow, Edge, Position, XYPosition } from '@xyflow/react';
import { WireData, WireConnectionState, WireEdge } from '@/types/circuit';
import { getWireColorFromSignal, getPinSignalType } from '@/utils/wireUtils';
import { WokwiComponent } from '@/integrations/wokwi/WokwiIntegration';
import { toast } from 'sonner';

export const useWireRouting = (components: WokwiComponent[]) => {
  const { setEdges, getNodes, getEdges, getViewport } = useReactFlow();
  const [wireConnectionState, setWireConnectionState] = useState<WireConnectionState>({
    isConnecting: false,
    routingPoints: [],
  });
  const [temporaryEdge, setTemporaryEdge] = useState<Edge<WireData> | null>(null);
  const [mousePosition, setMousePosition] = useState<XYPosition>({ x: 0, y: 0 });

  // Define cancelWireConnection first since it's used in other functions
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
    
    return true;
  }, [wireConnectionState, setEdges]);

  useEffect(() => {
    if (!wireConnectionState.isConnecting) return;
    
    const handleMouseMove = (event: MouseEvent) => {
      const reactFlowBounds = document.querySelector('.react-flow')?.getBoundingClientRect();
      if (reactFlowBounds) {
        const { x: offsetX, y: offsetY, zoom } = getViewport();
        const mousePos = {
          x: (event.clientX - reactFlowBounds.left - offsetX) / zoom,
          y: (event.clientY - reactFlowBounds.top - offsetY) / zoom
        };
        setMousePosition(mousePos);
        updateTemporaryEdge(mousePos);
      }
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [wireConnectionState.isConnecting, getViewport]);
  
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

  const startWireConnection = useCallback((nodeId: string, handleId: string) => {
    console.log('Starting wire connection from:', nodeId, handleId);
    
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
    
    const signal = getPinSignalType(components, nodeId, pinIndex);
    const wireColor = getWireColorFromSignal(signal || '');
    
    const newTempEdge: WireEdge = {
      id: tempEdgeId,
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
        cursorPosition: { x: 0, y: 0 }
      }
    };
    
    setTemporaryEdge(newTempEdge);
    setEdges((eds) => [...eds, newTempEdge]);
    
    return true;
  }, [components, setEdges]);
  
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
    
    const signal = getPinSignalType(components, wireConnectionState.sourceNodeId, wireConnectionState.sourcePinIndex || 0);
    const wireColor = getWireColorFromSignal(signal || '');
    
    const newEdge: WireEdge = {
      id: `wire-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      source: wireConnectionState.sourceNodeId,
      target: targetNodeId,
      sourceHandle: wireConnectionState.sourceHandleId,
      targetHandle: targetHandleId,
      type: 'customWire',
      data: {
        color: wireColor,
        sourcePinIndex: wireConnectionState.sourcePinIndex || 0,
        targetPinIndex: targetPinIndex,
        routingPoints: wireConnectionState.routingPoints,
      }
    };
    
    setEdges(edges => {
      const filteredEdges = edges.filter(edge => edge.id !== wireConnectionState.temporaryEdgeId);
      return [...filteredEdges, newEdge];
    });
    
    setWireConnectionState({
      isConnecting: false,
      routingPoints: []
    });
    
    setTemporaryEdge(null);
    
    toast.success('Connection created', {
      description: 'Wire connected successfully',
      duration: 1500,
    });
    
    return true;
  }, [wireConnectionState, components, setEdges, cancelWireConnection]);
  
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
