
import { useCallback, useState } from 'react';
import { Connection, useReactFlow, Edge, addEdge, Position, XYPosition } from '@xyflow/react';
import { WireData, WireConnectionState, WireEdge } from '@/types/circuit';
import { getWireColorFromSignal, getPinSignalType } from '@/utils/wireUtils';
import { WokwiComponent } from '@/integrations/wokwi/WokwiIntegration';
import { toast } from 'sonner';

export const useWireRouting = (components: WokwiComponent[]) => {
  const { setEdges, getNodes, getEdges } = useReactFlow();
  const [wireConnectionState, setWireConnectionState] = useState<WireConnectionState>({
    isConnecting: false,
    routingPoints: [],
  });
  const [temporaryEdge, setTemporaryEdge] = useState<Edge<WireData> | null>(null);

  // Start a new wire connection
  const startWireConnection = useCallback((nodeId: string, handleId: string) => {
    console.log('Starting wire connection from:', nodeId, handleId);
    
    // Extract pin index from handle ID
    const pinIndex = parseInt(handleId.split('-')[1]);
    
    // Create unique temporary edge ID
    const tempEdgeId = `temp-wire-${Date.now()}`;
    
    setWireConnectionState({
      isConnecting: true,
      sourceNodeId: nodeId,
      sourceHandleId: handleId,
      sourcePinIndex: pinIndex,
      routingPoints: [],
      temporaryEdgeId: tempEdgeId
    });
    
    // Determine wire color based on signal type
    const signal = getPinSignalType(components, nodeId, pinIndex);
    const wireColor = getWireColorFromSignal(signal || '');
    
    // Create a temporary edge to show while routing
    const newTempEdge: WireEdge = {
      id: tempEdgeId,
      source: nodeId,
      target: nodeId, // Temporary self-connection
      sourceHandle: handleId,
      targetHandle: null as any, // Will be updated later
      type: 'customWire',
      data: {
        color: wireColor,
        sourcePinIndex: pinIndex,
        targetPinIndex: -1, // Temporary value
        routingPoints: [],
      }
    };
    
    setTemporaryEdge(newTempEdge);
    setEdges((eds) => [...eds, newTempEdge]);
    
    return true;
  }, [components, setEdges]);
  
  // Add a routing point for the wire
  const addRoutingPoint = useCallback((point: XYPosition) => {
    if (!wireConnectionState.isConnecting || !wireConnectionState.temporaryEdgeId) return false;
    
    console.log('Adding routing point at:', point);
    
    const newRoutingPoints = [...wireConnectionState.routingPoints, point];
    
    setWireConnectionState(prev => ({
      ...prev,
      routingPoints: newRoutingPoints
    }));
    
    // Update the temporary edge with the new routing point
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
  
  // Complete a wire connection
  const completeWireConnection = useCallback((targetNodeId: string, targetHandleId: string) => {
    if (!wireConnectionState.isConnecting || !wireConnectionState.sourceNodeId || !wireConnectionState.sourceHandleId) {
      return false;
    }
    
    // Don't connect if source and target are the same
    if (wireConnectionState.sourceNodeId === targetNodeId && wireConnectionState.sourceHandleId === targetHandleId) {
      cancelWireConnection();
      return false;
    }
    
    console.log('Completing wire connection to:', targetNodeId, targetHandleId);
    
    // Extract pin index from handle ID
    const targetPinIndex = parseInt(targetHandleId.split('-')[1]);
    
    // Determine wire color based on signal type
    const signal = getPinSignalType(components, wireConnectionState.sourceNodeId, wireConnectionState.sourcePinIndex || 0);
    const wireColor = getWireColorFromSignal(signal || '');
    
    // Create a permanent edge with routing points
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
    
    // Remove the temporary edge and add the permanent one
    setEdges(edges => {
      const filteredEdges = edges.filter(edge => edge.id !== wireConnectionState.temporaryEdgeId);
      return [...filteredEdges, newEdge];
    });
    
    // Reset the connection state
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
  }, [wireConnectionState, components, setEdges]);
  
  // Cancel the current wire connection
  const cancelWireConnection = useCallback(() => {
    if (!wireConnectionState.isConnecting) return;
    
    console.log('Cancelling wire connection');
    
    // Remove the temporary edge
    if (wireConnectionState.temporaryEdgeId) {
      setEdges(edges => edges.filter(edge => edge.id !== wireConnectionState.temporaryEdgeId));
    }
    
    // Reset the connection state
    setWireConnectionState({
      isConnecting: false,
      routingPoints: []
    });
    
    setTemporaryEdge(null);
    
    return true;
  }, [wireConnectionState, setEdges]);
  
  // Handle click on the canvas
  const handleCanvasClick = useCallback((event: React.MouseEvent, position: XYPosition) => {
    if (wireConnectionState.isConnecting) {
      // Add a routing point to the wire
      addRoutingPoint(position);
      return true;
    }
    return false;
  }, [wireConnectionState, addRoutingPoint]);
  
  // Handle click on a node handle
  const handleHandleClick = useCallback((nodeId: string, handleId: string) => {
    if (!wireConnectionState.isConnecting) {
      // Start a new wire connection
      startWireConnection(nodeId, handleId);
      return true;
    } else {
      // Complete the current wire connection
      completeWireConnection(nodeId, handleId);
      return true;
    }
  }, [wireConnectionState, startWireConnection, completeWireConnection]);
  
  // Delete a wire by its ID
  const deleteWire = useCallback((wireId: string) => {
    setEdges((edges) => edges.filter(e => e.id !== wireId));
    
    toast.info('Wire removed', {
      duration: 1500,
    });
  }, [setEdges]);

  return {
    wireConnectionState,
    temporaryEdge,
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
