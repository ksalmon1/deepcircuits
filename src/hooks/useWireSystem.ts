
import { useCallback, useRef } from 'react';
import { Edge, Connection, useReactFlow, Node, addEdge, MarkerType } from '@xyflow/react';
import { WokwiComponent } from '@/integrations/wokwi/WokwiIntegration';
import { getWireColorFromSignal, getPinSignalType } from '@/utils/wireUtils';
import { toast } from 'sonner';
import { Wire, WireEdgeData, WokwiNodeData, WireEdge } from '@/types/circuit';

/**
 * Hook for managing the wire connections system using React Flow
 */
export const useWireSystem = (components: WokwiComponent[]) => {
  const { getEdges, setEdges, getNodes, setNodes, deleteElements, getNode } = useReactFlow();
  const edgeBeingCreatedRef = useRef<string | null>(null);
  const edgeBeingEditedRef = useRef<string | null>(null);
  
  // Create a new edge when a connection is formed
  const onConnect = useCallback((connection: Connection) => {
    if (!connection.source || !connection.target || !connection.sourceHandle || !connection.targetHandle) {
      return;
    }
    
    // Extract component IDs and pin indices from the connection
    const sourceId = connection.source;
    const targetId = connection.target;
    const sourcePinIndex = parseInt(connection.sourceHandle.split('-')[1]);
    const targetPinIndex = parseInt(connection.targetHandle.split('-')[1]);
    
    // Determine wire color based on signal type
    const sourceComponent = components.find(c => c.id === sourceId);
    const signal = getPinSignalType(components, sourceId, sourcePinIndex);
    const wireColor = getWireColorFromSignal(signal || '');
    
    const newEdge: Edge<WireEdgeData> = {
      id: `wire-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      source: sourceId,
      target: targetId,
      sourceHandle: connection.sourceHandle,
      targetHandle: connection.targetHandle,
      type: 'wire',
      data: {
        color: wireColor,
        sourcePinIndex,
        targetPinIndex,
        controlPoints: [],
        isEditing: false,
      },
      animated: false,
      markerEnd: {
        type: MarkerType.Arrow,
        width: 15,
        height: 15,
        color: wireColor,
      },
    };
    
    setEdges((eds) => addEdge(newEdge, eds));
    
    toast.success('Connection created', {
      description: 'Wire connected successfully',
      duration: 1500,
    });
    
    return newEdge;
  }, [components, setEdges]);
  
  // Delete a wire by its ID
  const deleteWire = useCallback((wireId: string) => {
    setEdges((edges) => edges.filter(e => e.id !== wireId));
    
    toast.info('Wire removed', {
      duration: 1500,
    });
  }, [setEdges]);
  
  // Start editing a wire's path
  const startWireEdit = useCallback((edgeId: string) => {
    edgeBeingEditedRef.current = edgeId;
    
    setEdges(edges => edges.map(edge => {
      if (edge.id === edgeId) {
        return {
          ...edge,
          data: {
            ...edge.data,
            isEditing: true,
          }
        };
      }
      return edge;
    }));
    
    toast.info('Editing wire path. Drag control points to adjust the wire.', {
      duration: 3000,
    });
  }, [setEdges]);
  
  // Finish editing a wire's path
  const finishWireEdit = useCallback((edgeId: string) => {
    edgeBeingEditedRef.current = null;
    
    setEdges(edges => edges.map(edge => {
      if (edge.id === edgeId && edge.data) {
        return {
          ...edge,
          data: {
            ...edge.data,
            isEditing: false,
          }
        };
      }
      return edge;
    }));
    
    toast.success('Wire path updated', {
      duration: 2000,
    });
  }, [setEdges]);
  
  // Add a control point to a wire
  const addControlPoint = useCallback((edgeId: string) => {
    setEdges(edges => {
      const edge = edges.find(e => e.id === edgeId);
      if (!edge || !edge.data) return edges;
      
      const edgeData = edge.data as WireEdgeData;
      const controlPoints = [...(edgeData.controlPoints || [])];
      
      // Get source and target positions
      const sourceNode = getNode(edge.source);
      const targetNode = getNode(edge.target);
      
      if (!sourceNode || !targetNode) return edges;
      
      const sourceHandleId = edge.sourceHandle || '';
      const targetHandleId = edge.targetHandle || '';
      
      const sourcePosition = {
        x: sourceNode.position.x,
        y: sourceNode.position.y
      };
      
      const targetPosition = {
        x: targetNode.position.x,
        y: targetNode.position.y
      };
      
      // Calculate a good position for a new control point
      let newPointX, newPointY;
      
      if (controlPoints.length === 0) {
        // First control point - midway between source and target
        newPointX = (sourcePosition.x + targetPosition.x) / 2;
        newPointY = (sourcePosition.y + targetPosition.y) / 2;
      } else {
        // Additional control point - between the last control point and target
        const lastPoint = controlPoints[controlPoints.length - 1];
        newPointX = (lastPoint.x + targetPosition.x) / 2;
        newPointY = (lastPoint.y + targetPosition.y) / 2;
      }
      
      // Add the new control point
      controlPoints.push({ x: newPointX, y: newPointY });
      
      return edges.map(e => {
        if (e.id === edgeId && e.data) {
          return {
            ...e,
            data: {
              ...e.data,
              controlPoints
            }
          };
        }
        return e;
      });
    });
    
    toast.info('Control point added. Drag to adjust the wire path.', {
      duration: 2000,
    });
  }, [getNode, setEdges]);
  
  // Update a control point's position
  const updateControlPoint = useCallback((edgeId: string, pointIndex: number, newPosition: { x: number, y: number }) => {
    setEdges(edges => {
      return edges.map(edge => {
        if (edge.id === edgeId && edge.data) {
          const edgeData = edge.data as WireEdgeData;
          const updatedControlPoints = [...(edgeData.controlPoints as Array<{x: number, y: number}> || [])];
          if (pointIndex >= 0 && pointIndex < updatedControlPoints.length) {
            updatedControlPoints[pointIndex] = newPosition;
          }
          
          return {
            ...edge,
            data: {
              ...edge.data,
              controlPoints: updatedControlPoints
            }
          };
        }
        return edge;
      });
    });
  }, [setEdges]);
  
  return {
    onConnect,
    deleteWire,
    startWireEdit,
    finishWireEdit,
    addControlPoint,
    updateControlPoint,
    connectionLineStyle: { stroke: '#4C72F4', strokeWidth: 2 },
    edgeBeingEditedId: edgeBeingEditedRef.current
  };
};

export default useWireSystem;
