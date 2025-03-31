
import { 
  useProject,
  useSimulation,
  useSelection,
  useError
} from '@/context/CircuitEditorContext';
import { useCallback } from 'react';
import { CircuitComponent } from '@/types/component';
import { PinConnection } from '@/types/pin';
import { toast } from 'sonner';
import { AppError } from '@/utils/errorHandling';

/**
 * Enhanced hook for circuit editor functionality
 * Provides additional error handling and domain-specific operations
 * This is a facade that combines all the individual context hooks
 */
export function useCircuitEditor() {
  const projectContext = useProject();
  const simulationContext = useSimulation();
  const selectionContext = useSelection();
  const errorContext = useError();
  
  // Combine all contexts into a unified interface
  const context = {
    ...projectContext,
    ...simulationContext,
    ...selectionContext,
    ...errorContext
  };
  
  // Enhanced add component with error handling
  const addComponent = useCallback((component: CircuitComponent) => {
    try {
      if (!component.id) {
        throw new Error('Component must have an ID');
      }
      
      if (!component.type) {
        throw new Error('Component must have a type');
      }
      
      projectContext.setComponents(prev => [...prev, component]);
      return component.id;
    } catch (error) {
      console.error('Failed to add component:', error);
      toast.error('Failed to add component');
      throw error;
    }
  }, [projectContext]);
  
  // Enhanced remove component with error handling and connection cleanup
  const removeComponent = useCallback((componentId: string) => {
    try {
      // Remove the component
      projectContext.setComponents(prev => 
        prev.filter(comp => comp.id !== componentId)
      );
      
      // Clean up any connections associated with this component
      projectContext.setConnections(prev => 
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
  }, [projectContext]);
  
  // Enhanced connect pins with validation
  const connectPins = useCallback((sourceId: string, sourcePinIndex: number, targetId: string, targetPinIndex: number): boolean => {
    try {
      // Prevent self-connections
      if (sourceId === targetId) {
        toast.error('Cannot connect a component to itself');
        return false;
      }
      
      // Check if connection already exists
      const connectionExists = projectContext.connections.some(
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
      
      projectContext.addConnection(newConnection);
      return true;
    } catch (error) {
      console.error('Failed to connect pins:', error);
      toast.error('Failed to create connection');
      return false;
    }
  }, [projectContext]);
  
  // Run simulation with enhanced error handling
  const runSimulation = useCallback(async () => {
    try {
      if (projectContext.components.length === 0) {
        toast.error('Cannot run simulation: No components added');
        return false;
      }
      
      if (projectContext.connections.length === 0) {
        toast.warning('Running simulation with no connections between components');
      }
      
      simulationContext.toggleSimulation();
      return true;
    } catch (error) {
      console.error('Failed to run simulation:', error);
      toast.error('Failed to start simulation');
      return false;
    }
  }, [projectContext, simulationContext]);

  return {
    ...context,
    addComponent,
    removeComponent,
    connectPins,
    runSimulation
  };
}

export default useCircuitEditor;
