
import { useCircuitEditor as useCircuitEditorContext } from '@/context/CircuitEditorContext';
import { useCallback } from 'react';
import { CircuitComponent } from '@/types/component';
import { PinConnection } from '@/types/pin';
import { toast } from 'sonner';
import { AppError } from '@/utils/errorHandling';

/**
 * Enhanced hook for circuit editor functionality
 * Provides additional error handling and domain-specific operations
 */
export function useCircuitEditor() {
  const context = useCircuitEditorContext();
  
  if (!context) {
    throw new Error('useCircuitEditor must be used within a CircuitEditorProvider');
  }
  
  // Enhanced add component with error handling
  const addComponent = useCallback((component: CircuitComponent) => {
    try {
      if (!component.id) {
        throw new Error('Component must have an ID');
      }
      
      if (!component.type) {
        throw new Error('Component must have a type');
      }
      
      context.setComponents(prev => [...prev, component]);
      return component.id;
    } catch (error) {
      console.error('Failed to add component:', error);
      toast.error('Failed to add component');
      throw error;
    }
  }, [context]);
  
  // Enhanced remove component with error handling and connection cleanup
  const removeComponent = useCallback((componentId: string) => {
    try {
      // Remove the component
      context.setComponents(prev => 
        prev.filter(comp => comp.id !== componentId)
      );
      
      // Clean up any connections associated with this component
      context.setConnections(prev => 
        prev.filter(conn => 
          conn.sourceId !== componentId && conn.targetId !== componentId
        )
      );
      
      return true;
    } catch (error) {
      console.error(`Failed to remove component ${componentId}:`, error);
      toast.error('Failed to remove component');
      return false;
    }
  }, [context]);
  
  // Enhanced connect pins with validation
  const connectPins = useCallback((sourceId: string, sourcePinIndex: number, targetId: string, targetPinIndex: number): boolean => {
    try {
      // Prevent self-connections
      if (sourceId === targetId) {
        toast.error('Cannot connect a component to itself');
        return false;
      }
      
      // Check if connection already exists
      const connectionExists = context.connections.some(
        conn => 
          (conn.sourceId === sourceId && conn.sourcePinIndex === sourcePinIndex && 
           conn.targetId === targetId && conn.targetPinIndex === targetPinIndex) ||
          (conn.sourceId === targetId && conn.sourcePinIndex === targetPinIndex && 
           conn.targetId === sourceId && conn.targetPinIndex === sourcePinIndex)
      );
      
      if (connectionExists) {
        toast.error('Connection already exists');
        return false;
      }
      
      // Create the connection
      const newConnection: PinConnection = {
        sourceId,
        sourcePinIndex,
        targetId,
        targetPinIndex
      };
      
      context.addConnection(newConnection);
      return true;
    } catch (error) {
      console.error('Failed to connect pins:', error);
      toast.error('Failed to create connection');
      return false;
    }
  }, [context]);
  
  // Run simulation with enhanced error handling
  const runSimulation = useCallback(async () => {
    try {
      if (context.components.length === 0) {
        toast.error('Cannot run simulation: No components added');
        return false;
      }
      
      if (context.connections.length === 0) {
        toast.warning('Running simulation with no connections between components');
      }
      
      context.toggleSimulation();
      return true;
    } catch (error) {
      console.error('Failed to run simulation:', error);
      toast.error('Failed to start simulation');
      return false;
    }
  }, [context]);

  return {
    ...context,
    addComponent,
    removeComponent,
    connectPins,
    runSimulation
  };
}

export default useCircuitEditor;
