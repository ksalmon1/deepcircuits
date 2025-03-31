import { useCallback, useState } from 'react';
import { Edge, Connection, useReactFlow } from '@xyflow/react';
import { 
  calculateWireRoutingPoints,
  getWireColorFromSignal 
} from '@/utils/wireUtils';
import { WireConnectionState, WireData } from '@/types/circuit';
import { getEdgeParams } from '@/utils/wireUtils';

/**
 * Hook for managing wire routing and connection state in the circuit editor.
 */
export const useWireRouting = () => {
  const { setEdges, getNodes } = useReactFlow();
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
    connectPins: (
      sourceId: string,
      sourcePinIndex: number,
      targetId: string,
      targetPinIndex: number,
      routingPoints?: Array<{ x: number; y: number }>
    ) => boolean
  ) => {
    setWireConnectionState(prevState => {
      if (!prevState.isConnecting || !prevState.sourceNodeId || !prevState.sourcePinIndex) {
        return prevState;
      }

      const success = connectPins(
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

    const sourceHandle = sourceNode.data?.pins?.find((pin, index) => index === wireConnectionState.sourcePinIndex);

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
      sourceX: edgeParams.sourceX,
      sourceY: edgeParams.sourceY,
      targetX: edgeParams.targetX,
      targetY: edgeParams.targetY,
    };

    return edge;
  }, [wireConnectionState, getNodes]);

  return {
    wireConnectionState,
    startWireConnection,
    updateWireRouting,
    finalizeWireConnection,
    cancelWireConnection,
    getTemporaryEdge,
  };
};
