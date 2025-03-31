
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
import { AppError, withErrorHandling } from '@/utils/errorHandling';

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
  
  // Core add component function without try/catch
  const coreAddComponent = (component: CircuitComponent) => {
    if (!component.id) {
      throw new Error('Component must have an ID');
    }
    
    if (!component.type) {
      throw new Error('Component must have a type');
    }
    
    projectContext.setComponents(prev => [...prev, component]);
    return component.id;
  };
  
  // Core remove component function without try/catch
  const coreRemoveComponent = (componentId: string) => {
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
  };
  
  // Core connect pins function without try/catch
  const coreConnectPins = (sourceId: string, sourcePinIndex: number, targetId: string, targetPinIndex: number): boolean => {
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
  };
  
  // Core run simulation function without try/catch
  const coreRunSimulation = async () => {
    if (projectContext.components.length === 0) {
      toast.error('Cannot run simulation: No components added');
      return false;
    }
    
    if (projectContext.connections.length === 0) {
      toast.warning('Running simulation with no connections between components');
    }
    
    simulationContext.toggleSimulation();
    return true;
  };
  
  // Wrap core functions with error handling
  const addComponent = withErrorHandling(
    coreAddComponent,
    'addComponent',
    errorContext.setError
  );
  
  const removeComponent = withErrorHandling(
    coreRemoveComponent,
    'removeComponent',
    errorContext.setError
  );
  
  const connectPins = withErrorHandling(
    coreConnectPins,
    'connectPins',
    errorContext.setError
  );
  
  const runSimulation = withErrorHandling(
    coreRunSimulation,
    'runSimulation',
    errorContext.setError
  );

  return {
    ...context,
    addComponent,
    removeComponent,
    connectPins,
    runSimulation
  };
}

export default useCircuitEditor;
