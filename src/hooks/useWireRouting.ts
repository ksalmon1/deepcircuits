
import { useCallback, useState } from 'react';
import { Edge, Connection, useReactFlow } from '@xyflow/react';
import { 
  calculateWireRoutingPoints,
  getPinSignalType 
} from '@/utils/wireUtils';
import { WireConnectionState, WireData } from '@/types/circuit';
import { getEdgeParams } from '@/utils/wireUtils';
import { useWireSystem } from './useWireSystem';

/**
 * Hook for managing wire routing and connection state in the circuit editor.
 */
export const useWireRouting = () => {
  const { getNodes } = useReactFlow();
  const { connectPins, deleteWire: deleteWireFromSystem } = useWireSystem([]);
  
  const [wireConnectionState, setWireConnectionState] = useState<WireConnectionState>({
    isConnecting: false,
    routingPoints: [],
  });

  /**
   * Start a new wire connection from a source node and handle.
   */
  const startWireConnection = useCallback((
    sourceNodeId: string,
    sourceHandleId: string,
    sourcePinIndex: number
  ) => {
    console.log('Starting wire connection:', { sourceNodeId, sourceHandleId, sourcePinIndex });
    setWireConnectionState({
      isConnecting: true,
      sourceNodeId,
      sourceHandleId,
      sourcePinIndex,
      routingPoints: [],
      temporaryEdgeId: `temp-wire-${Date.now()}`
    });
  }, []);

  /**
   * Update the routing points of the temporary wire during connection.
   */
  const updateWireRouting = useCallback((
    currentMouseX: number,
    currentMouseY: number
  ) => {
    setWireConnectionState(prevState => {
      if (!prevState.isConnecting || !prevState.sourceNodeId) {
        return prevState;
      }

      const sourceNode = getNodes().find(node => node.id === prevState.sourceNodeId);

      if (!sourceNode) {
        return prevState;
      }

      const sourceX = sourceNode.position.x + (sourceNode.width || 0) / 2;
      const sourceY = sourceNode.position.y + (sourceNode.height || 0) / 2;

      const routingPoints = calculateWireRoutingPoints(sourceX, sourceY, currentMouseX, currentMouseY);

      return {
        ...prevState,
        routingPoints: routingPoints,
      };
    });
  }, [getNodes]);

  /**
   * Finalize the wire connection to a target node and handle.
   */
  const finalizeWireConnection = useCallback((
    targetNodeId: string,
    targetHandleId: string,
    targetPinIndex: number
  ) => {
    console.log('Finalizing wire connection:', { targetNodeId, targetHandleId, targetPinIndex });
    
    setWireConnectionState(prevState => {
      if (!prevState.isConnecting || !prevState.sourceNodeId || prevState.sourcePinIndex === undefined) {
        return { isConnecting: false, routingPoints: [] };
      }

      const success = connectPins(
        prevState.sourceNodeId,
        prevState.sourcePinIndex,
        targetNodeId,
        targetPinIndex
      );

      return {
        isConnecting: false,
        routingPoints: [],
      };
    });
  }, [connectPins]);

  /**
   * Cancel the current wire connection.
   */
  const cancelWireConnection = useCallback(() => {
    console.log('Canceling wire connection');
    setWireConnectionState({
      isConnecting: false,
      routingPoints: [],
    });
  }, []);

  /**
   * Get the temporary edge for the wire connection.
   */
  const getTemporaryEdge = useCallback(() => {
    if (!wireConnectionState.isConnecting || !wireConnectionState.sourceNodeId || !wireConnectionState.temporaryEdgeId) {
      return null;
    }

    const sourceNode = getNodes().find(node => node.id === wireConnectionState.sourceNodeId);

    if (!sourceNode || !sourceNode.data) {
      return null;
    }

    // Find the source pin data
    const sourcePins = Array.isArray(sourceNode.data.pins) ? sourceNode.data.pins : [];
    const sourcePin = sourcePins[wireConnectionState.sourcePinIndex as number];
    
    if (!sourcePin) {
      return null;
    }

    // Calculate source position based on pin position
    const sourceX = sourceNode.position.x + sourcePin.x;
    const sourceY = sourceNode.position.y + sourcePin.y;

    if (wireConnectionState.routingPoints.length === 0) {
      return null;
    }

    // Get the last routing point for the target position
    const lastPoint = wireConnectionState.routingPoints[wireConnectionState.routingPoints.length - 1];
    const targetX = lastPoint.x;
    const targetY = lastPoint.y;

    // Create the temporary edge
    const edge: Edge<WireData> = {
      id: wireConnectionState.temporaryEdgeId,
      source: wireConnectionState.sourceNodeId,
      target: 'temp-target',
      sourceHandle: wireConnectionState.sourceHandleId,
      targetHandle: 'temp-target-handle',
      type: 'customWire',
      data: {
        color: '#9b87f5',
        sourcePinIndex: wireConnectionState.sourcePinIndex,
        targetPinIndex: -1,
        routingPoints: wireConnectionState.routingPoints,
      },
      animated: true,
      style: {
        stroke: '#9b87f5',
        strokeWidth: 2,
        strokeDasharray: '5, 5',
      },
    };

    return edge;
  }, [wireConnectionState, getNodes]);

  /**
   * Handle canvas click when wire connection is in progress
   */
  const handleCanvasClick = useCallback((event: React.MouseEvent, position: { x: number; y: number }) => {
    // Cancel the current wire connection when clicking on empty canvas
    console.log('Canvas click detected, canceling wire connection');
    cancelWireConnection();
  }, [cancelWireConnection]);

  /**
   * Handle clicking on a node handle
   */
  const handleHandleClick = useCallback((nodeId: string, handleId: string) => {
    console.log('Handle click:', { nodeId, handleId });
    
    const handleParts = handleId.split('-');
    if (handleParts.length !== 2) {
      console.warn('Invalid handle ID format:', handleId);
      return;
    }
    
    const pinIndex = parseInt(handleParts[1], 10);
    if (isNaN(pinIndex)) {
      console.warn('Invalid pin index in handle ID:', handleId);
      return;
    }
    
    if (!wireConnectionState.isConnecting) {
      // Start a new connection
      console.log('Starting new wire connection from:', { nodeId, handleId, pinIndex });
      startWireConnection(nodeId, handleId, pinIndex);
    } else if (wireConnectionState.sourceNodeId && wireConnectionState.sourcePinIndex !== undefined) {
      // Finish an existing connection
      console.log('Finalizing wire connection to:', { nodeId, handleId, pinIndex });
      finalizeWireConnection(
        nodeId, 
        handleId, 
        pinIndex
      );
    }
  }, [wireConnectionState, startWireConnection, finalizeWireConnection]);

  /**
   * Delete a wire
   */
  const deleteWire = useCallback((wireId: string) => {
    return deleteWireFromSystem(wireId);
  }, [deleteWireFromSystem]);

  return {
    wireConnectionState,
    startWireConnection,
    updateWireRouting,
    finalizeWireConnection,
    cancelWireConnection,
    getTemporaryEdge,
    handleCanvasClick,
    handleHandleClick,
    deleteWire,
    connectionLineStyle: { stroke: '#9b87f5', strokeWidth: 2 }
  };
};
