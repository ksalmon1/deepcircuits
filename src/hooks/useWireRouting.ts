
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
    targetPinIndex: number,
    connectPinsFunc: (
      sourceId: string,
      sourcePinIndex: number,
      targetId: string,
      targetPinIndex: number,
      routingPoints?: Array<{ x: number; y: number }>
    ) => boolean
  ) => {
    setWireConnectionState(prevState => {
      if (!prevState.isConnecting || !prevState.sourceNodeId || prevState.sourcePinIndex === undefined) {
        return prevState;
      }

      const success = connectPinsFunc(
        prevState.sourceNodeId,
        prevState.sourcePinIndex,
        targetNodeId,
        targetPinIndex,
        prevState.routingPoints
      );

      return {
        isConnecting: false,
        routingPoints: [],
      };
    });
  }, [setWireConnectionState]);

  /**
   * Cancel the current wire connection.
   */
  const cancelWireConnection = useCallback(() => {
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

    if (!sourceNode) {
      return null;
    }

    const sourceHandle = sourceNode.data && sourceNode.data.pins && Array.isArray(sourceNode.data.pins) ? 
      sourceNode.data.pins.find((pin: any, index: number) => index === wireConnectionState.sourcePinIndex) : 
      undefined;

    if (!sourceHandle) {
      return null;
    }

    const sourceX = sourceNode.position.x + sourceHandle.x;
    const sourceY = sourceNode.position.y + sourceHandle.y;

    if (wireConnectionState.routingPoints.length === 0) {
      return null;
    }

    const targetX = wireConnectionState.routingPoints[wireConnectionState.routingPoints.length - 1].x;
    const targetY = wireConnectionState.routingPoints[wireConnectionState.routingPoints.length - 1].y;

    const edgeParams = getEdgeParams(sourceX, sourceY, targetX, targetY);

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
      animated: false,
      style: {
        stroke: '#9b87f5',
        strokeWidth: 2,
      },
    };

    return edge;
  }, [wireConnectionState, getNodes]);

  /**
   * Handle canvas click when wire connection is in progress
   */
  const handleCanvasClick = useCallback((event: React.MouseEvent, position: { x: number; y: number }) => {
    // Cancel the current wire connection
    cancelWireConnection();
  }, [cancelWireConnection]);

  /**
   * Handle clicking on a node handle
   */
  const handleHandleClick = useCallback((nodeId: string, handleId: string) => {
    const handleParts = handleId.split('-');
    if (handleParts.length !== 2) return;
    
    const pinIndex = parseInt(handleParts[1], 10);
    if (isNaN(pinIndex)) return;
    
    if (!wireConnectionState.isConnecting) {
      // Start a new connection
      startWireConnection(nodeId, handleId, pinIndex);
    } else if (wireConnectionState.sourceNodeId && wireConnectionState.sourcePinIndex !== undefined) {
      // Finish an existing connection
      finalizeWireConnection(
        nodeId, 
        handleId, 
        pinIndex, 
        connectPins
      );
    }
  }, [wireConnectionState, startWireConnection, finalizeWireConnection, connectPins]);

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
