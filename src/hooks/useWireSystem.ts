
import { useCallback } from 'react';
import { Connection, useReactFlow, addEdge, Edge } from '@xyflow/react';
import { WokwiComponent } from '@/integrations/wokwi/WokwiIntegration';
import { getWireColorFromSignal, getPinSignalType } from '@/utils/wireUtils';
import { toast } from 'sonner';
import { WireData, WireEdge } from '@/types/circuit';

/**
 * Hook for managing the wire connections system using React Flow
 */
export const useWireSystem = (components: WokwiComponent[]) => {
  const { setEdges } = useReactFlow();
  
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
    const signal = getPinSignalType(components, sourceId, sourcePinIndex);
    const wireColor = getWireColorFromSignal(signal || '');
    
    // Create a new edge with the correct type
    const newEdge: WireEdge = {
      id: `wire-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      source: sourceId,
      target: targetId,
      sourceHandle: connection.sourceHandle,
      targetHandle: connection.targetHandle,
      type: 'smoothstep',
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
  }, [components, setEdges]);
  
  // Delete a wire by its ID
  const deleteWire = useCallback((wireId: string) => {
    setEdges((edges) => edges.filter(e => e.id !== wireId));
    
    toast.info('Wire removed', {
      duration: 1500,
    });
  }, [setEdges]);

  return {
    onConnect,
    deleteWire,
    connectionLineStyle: { stroke: '#9b87f5', strokeWidth: 2 },
  };
};

export default useWireSystem;
