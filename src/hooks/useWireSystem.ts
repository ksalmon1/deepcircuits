import { useCallback, useState, useEffect } from 'react';
import { Connection, useReactFlow, addEdge, Edge } from '@xyflow/react';
import { CircuitComponent } from '@/types/component';
import { 
  getWireColorFromSignal, 
  getPinSignalType, 
  createWireEdge, 
  calculateWireRoutingPoints 
} from '@/utils/wireUtils';
import { isValidConnection } from '@/domain/connectionRules';
import { toast } from 'sonner';
import { WireData, WireEdge } from '@/types/circuit';
import { PinConnection } from '@/types/pin';
import { AppError, ComponentError, withErrorHandling } from '@/utils/errorHandling';
import { useCircuitEditor } from '@/context/CircuitEditorContext';

/**
 * Enhanced hook for managing wire connections between components
 */
export function useWireSystem(components: CircuitComponent[]) {
  const { setEdges, getNodes } = useReactFlow();
  const { handleWiresChange } = useCircuitEditor();
  const [wires, setWires] = useState<WireEdge[]>([]);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  
  // Core connect pins function without try/catch
  const coreConnectPins = (
    sourceId: string, 
    sourcePinIndex: number, 
    targetId: string, 
    targetPinIndex: number,
    routingPoints?: Array<{ x: number; y: number }>
  ): boolean => {
    // Validate inputs
    if (!sourceId || !targetId) {
      throw new ComponentError('Invalid source or target component ID', 'WIRE_INVALID_COMPONENT');
    }
    
    if (sourcePinIndex < 0 || targetPinIndex < 0) {
      throw new ComponentError('Invalid pin indices', 'WIRE_INVALID_PIN');
    }
    
    // Prevent self-connections
    if (sourceId === targetId) {
      toast.error('Cannot connect a component to itself');
      return false;
    }
    
    // Check if connection is valid
    if (!isValidConnection(components, sourceId, sourcePinIndex, targetId, targetPinIndex)) {
      toast.error('These pins cannot be connected together');
      return false;
    }
    
    // Get node positions for routing
    const nodes = getNodes();
    const sourceNode = nodes.find(node => node.id === sourceId);
    const targetNode = nodes.find(node => node.id === targetId);
    
    // If we have node positions, calculate routing points
    let calculatedRoutingPoints = routingPoints || [];
    if (sourceNode && targetNode) {
      // Get source and target positions (assuming center point for simplicity)
      const sourceX = sourceNode.position.x + (sourceNode.width || 0) / 2;
      const sourceY = sourceNode.position.y + (sourceNode.height || 0) / 2;
      const targetX = targetNode.position.x + (targetNode.width || 0) / 2;
      const targetY = targetNode.position.y + (targetNode.height || 0) / 2;
      
      // Calculate routing if not provided
      if (!routingPoints) {
        calculatedRoutingPoints = calculateWireRoutingPoints(sourceX, sourceY, targetX, targetY);
      }
    }
    
    // Create the wire edge
    const newEdge = createWireEdge(
      components, 
      sourceId, 
      sourcePinIndex, 
      targetId, 
      targetPinIndex, 
      calculatedRoutingPoints
    );
    
    // Add to React Flow
    setEdges((eds) => addEdge(newEdge, eds) as Edge[]);
    
    // Update wires in the context
    handleWiresChange([...wires, newEdge as WireEdge]);
    
    toast.success('Connection created', {
      description: 'Wire connected successfully',
      duration: 1500,
    });
    
    return true;
  };
  
  // Core on connect function without try/catch
  const coreOnConnect = (connection: Connection) => {
    if (!connection.source || !connection.target || !connection.sourceHandle || !connection.targetHandle) {
      throw new ComponentError('Invalid connection parameters', 'INVALID_CONNECTION_PARAMS');
    }
    
    // Extract component IDs and pin indices from the connection
    const sourceId = connection.source;
    const targetId = connection.target;
    const sourcePinIndex = parseInt(connection.sourceHandle.split('-')[1]);
    const targetPinIndex = parseInt(connection.targetHandle.split('-')[1]);
    
    // Validate pin indices
    if (isNaN(sourcePinIndex) || isNaN(targetPinIndex)) {
      throw new ComponentError('Invalid pin format', 'INVALID_PIN_FORMAT');
    }
    
    // Connect pins using our utility function
    return connectPins(sourceId, sourcePinIndex, targetId, targetPinIndex);
  };
  
  // Core delete wire function without try/catch
  const coreDeleteWire = (wireId: string) => {
    if (!wireId) {
      throw new ComponentError('Invalid wire ID', 'INVALID_WIRE_ID');
    }
    
    setEdges((edges) => {
      const removedEdge = edges.find(edge => edge.id === wireId);
      
      if (removedEdge && removedEdge.data) {
        // Log information about the deleted connection
        console.log('Deleted wire connection:', {
          source: removedEdge.source,
          sourcePinIndex: removedEdge.data.sourcePinIndex,
          target: removedEdge.target,
          targetPinIndex: removedEdge.data.targetPinIndex
        });
      }
      
      return edges.filter(e => e.id !== wireId);
    });
    
    toast.info('Wire removed', {
      duration: 1500,
    });
    
    return true;
  };
  
  // Wrap core functions with error handling
  const connectPins = withErrorHandling(
    coreConnectPins,
    'connectPins',
    (error, context) => console.error(`Error in ${context}:`, error)
  );
  
  const onConnect = withErrorHandling(
    coreOnConnect,
    'onConnect',
    (error, context) => console.error(`Error in ${context}:`, error)
  );
  
  const deleteWire = withErrorHandling(
    coreDeleteWire,
    'deleteWire',
    (error, context) => console.error(`Error in ${context}:`, error)
  );
  
  // Highlight all wires connected to a component
  // This function is simple enough not to need error handling
  const highlightConnectedWires = useCallback((componentId: string, highlight: boolean) => {
    if (!componentId) return;
    
    setEdges(edges => edges.map(edge => {
      if (edge.source === componentId || edge.target === componentId) {
        return {
          ...edge,
          selected: highlight,
          animated: highlight || (edge.data?.signal === 'clock' || edge.data?.signal === 'data'),
          style: {
            ...edge.style,
            strokeWidth: highlight ? 3 : 2,
            filter: highlight ? 'drop-shadow(0 0 5px rgba(155, 135, 245, 0.8))' : undefined
          }
        };
      }
      return edge;
    }));
  }, [setEdges]);

  return {
    connectPins,
    onConnect,
    deleteWire,
    highlightConnectedWires,
    connectionLineStyle: { stroke: '#9b87f5', strokeWidth: 2 },
  };
}

export default useWireSystem;
