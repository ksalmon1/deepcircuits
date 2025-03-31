
import { useCallback } from 'react';
import { Connection, useReactFlow, addEdge, Edge } from '@xyflow/react';
import { WokwiComponent } from '@/integrations/wokwi/WokwiIntegration';
import { getWireColorFromSignal, getPinSignalType } from '@/utils/wireUtils';
import { toast } from 'sonner';
import { WireData, WireEdge } from '@/types/circuit';
import { PinConnection } from '@/types/pin';
import { AppError, ComponentError } from '@/utils/errorHandling';
import { useCircuitEditor } from '@/context/CircuitEditorContext';

/**
 * Enhanced hook for managing wire connections between components
 */
export function useWireSystem(components: WokwiComponent[]) {
  const { setEdges } = useReactFlow();
  const { addConnection } = useCircuitEditor();
  
  // Connect pins with validation and error handling
  const connectPins = useCallback((
    sourceId: string, 
    sourcePinIndex: number, 
    targetId: string, 
    targetPinIndex: number
  ): boolean => {
    try {
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
      
      // Create the connection
      const newConnection: PinConnection = {
        sourceId,
        sourcePinIndex,
        targetId,
        targetPinIndex
      };
      
      // Add to context
      addConnection(newConnection);
      
      return true;
    } catch (error) {
      console.error('Failed to connect pins:', error);
      toast.error('Failed to create connection');
      return false;
    }
  }, [addConnection]);
  
  // Create a new edge when a connection is formed from React Flow
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
    
    // Also add to our internal connections system
    connectPins(sourceId, sourcePinIndex, targetId, targetPinIndex);
    
    return newEdge;
  }, [components, setEdges, connectPins]);
  
  // Delete a wire by its ID
  const deleteWire = useCallback((wireId: string) => {
    setEdges((edges) => edges.filter(e => e.id !== wireId));
    
    toast.info('Wire removed', {
      duration: 1500,
    });
  }, [setEdges]);

  return {
    connectPins,
    onConnect,
    deleteWire,
    connectionLineStyle: { stroke: '#9b87f5', strokeWidth: 2 },
  };
}

export default useWireSystem;
