
import { useCallback, useState } from 'react';
import { Connection, useReactFlow, addEdge, Edge, XYPosition, Node } from '@xyflow/react';
import { WokwiComponent } from '@/integrations/wokwi/WokwiIntegration';
import { getWireColorFromSignal, getPinSignalType } from '@/utils/wireUtils';
import { toast } from 'sonner';
import { WireData, WireEdge, WiringState } from '@/types/circuit';

/**
 * Hook for managing the wire connections system using React Flow
 */
export const useWireSystem = (components: WokwiComponent[]) => {
  const { setEdges, addNodes, addEdges, deleteElements, getNode } = useReactFlow();
  
  // State to track wiring mode
  const [wiringState, setWiringState] = useState<WiringState | null>(null);
  
  // Create a new edge when a connection is formed
  const onConnect = useCallback((connection: Connection) => {
    if (!connection.source || !connection.target || !connection.sourceHandle || !connection.targetHandle) {
      return;
    }
    
    // If we're in wiring mode, handle completing the wire
    if (wiringState && wiringState.isActive) {
      // Create a new edge segment from the last point to the target
      const finalEdgeId = `wire-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const finalEdge: WireEdge = {
        id: finalEdgeId,
        source: wiringState.lastNodeId,
        sourceHandle: wiringState.lastHandleId || undefined,
        target: connection.target,
        targetHandle: connection.targetHandle,
        type: 'straight',
        data: {
          color: wiringState.wireColor,
          signalType: wiringState.signalType,
          sourcePinIndex: parseInt(wiringState.sourceHandleId.split('-')[1]),
          targetPinIndex: parseInt(connection.targetHandle.split('-')[1]),
          isRoutingSegment: false
        },
        style: {
          stroke: wiringState.wireColor,
          strokeWidth: 2
        }
      };
      
      // Add this final edge
      addEdges(finalEdge);
      
      // Exit wiring mode
      setWiringState(null);
      
      toast.success('Wire connected successfully', {
        description: 'Multi-segment wire completed',
        duration: 1500,
      });
      
      return finalEdge;
    }
    
    // Normal direct connection
    const sourceId = connection.source;
    const targetId = connection.target;
    const sourcePinIndex = parseInt(connection.sourceHandle.split('-')[1]);
    const targetPinIndex = parseInt(connection.targetHandle.split('-')[1]);
    
    // Determine wire color based on signal type
    const signal = getPinSignalType(components, sourceId, sourcePinIndex);
    const wireColor = getWireColorFromSignal(signal || '');
    
    // Create a new edge with the correct type
    const newEdge: WireEdge = {
      id: `wire-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      source: sourceId,
      target: targetId,
      sourceHandle: connection.sourceHandle,
      targetHandle: connection.targetHandle,
      type: 'straight',
      data: {
        color: wireColor,
        sourcePinIndex,
        targetPinIndex,
      },
      animated: false,
      style: {
        stroke: wireColor,
        strokeWidth: 2
      }
    };
    
    // Use type assertion to ensure compatibility
    setEdges((eds) => addEdge(newEdge, eds));
    
    toast.success('Connection created', {
      description: 'Wire connected successfully',
      duration: 1500,
    });
    
    return newEdge;
  }, [wiringState, components, setEdges, addEdges]);
  
  // Start the wiring mode when a pin is clicked
  const startWiring = useCallback((nodeId: string, handleId: string) => {
    if (!nodeId || !handleId) return;
    
    // Extract signal type and determine wire color
    const pinIndex = parseInt(handleId.split('-')[1]);
    const signal = getPinSignalType(components, nodeId, pinIndex) || 'digital';
    const wireColor = getWireColorFromSignal(signal);
    
    // Enter wiring mode
    setWiringState({
      isActive: true,
      sourceNodeId: nodeId,
      sourceHandleId: handleId,
      lastNodeId: nodeId,
      lastHandleId: handleId,
      intermediateNodes: [],
      intermediateEdges: [],
      wireColor,
      signalType: signal
    });
    
    toast.info('Wiring mode started', {
      description: 'Click to add routing points, click on a pin to complete',
      duration: 2000,
    });
    
  }, [components]);
  
  // Add a routing point during wiring mode
  const addRoutingPoint = useCallback((position: XYPosition) => {
    if (!wiringState || !wiringState.isActive) return;
    
    // Create a new routing point node
    const routingPointId = `routing-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const newRoutingNode: Node = {
      id: routingPointId,
      type: 'routingPoint',
      position,
      data: {},
      draggable: true
    };
    
    // Create an edge from the last node to this routing point
    const edgeId = `edge-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const newEdge: Edge = {
      id: edgeId,
      source: wiringState.lastNodeId,
      sourceHandle: wiringState.lastHandleId || undefined,
      target: routingPointId,
      targetHandle: `${routingPointId}-target`,
      type: 'default',
      style: { 
        stroke: wiringState.wireColor, 
        strokeWidth: 2 
      },
      data: { 
        color: wiringState.wireColor,
        signalType: wiringState.signalType,
        isRoutingSegment: true
      }
    };
    
    // Add the new node and edge
    addNodes(newRoutingNode);
    addEdges(newEdge);
    
    // Update wiring state
    setWiringState(prev => {
      if (!prev) return null;
      return {
        ...prev,
        lastNodeId: routingPointId,
        lastHandleId: `${routingPointId}-source`,
        intermediateNodes: [...prev.intermediateNodes, routingPointId],
        intermediateEdges: [...prev.intermediateEdges, edgeId]
      };
    });
    
  }, [wiringState, addNodes, addEdges]);
  
  // Cancel wiring mode
  const cancelWiring = useCallback(() => {
    if (!wiringState) return;
    
    // Delete all intermediate nodes and edges
    if (wiringState.intermediateNodes.length > 0 || wiringState.intermediateEdges.length > 0) {
      deleteElements({
        nodes: wiringState.intermediateNodes.map(id => ({ id })),
        edges: wiringState.intermediateEdges.map(id => ({ id }))
      });
    }
    
    // Reset wiring state
    setWiringState(null);
    
    toast.info('Wiring cancelled', {
      duration: 1500,
    });
    
  }, [wiringState, deleteElements]);
  
  // Delete a wire by its ID
  const deleteWire = useCallback((wireId: string) => {
    setEdges((edges) => edges.filter(e => e.id !== wireId));
    
    toast.info('Wire removed', {
      duration: 1500,
    });
  }, [setEdges]);

  return {
    wiringState,
    onConnect,
    startWiring,
    addRoutingPoint,
    cancelWiring,
    deleteWire,
    connectionLineStyle: { 
      stroke: wiringState?.wireColor || '#9b87f5', 
      strokeWidth: 2 
    },
  };
};

export default useWireSystem;
