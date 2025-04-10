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
    
    projectContext.handleComponentsChange([...projectContext.components, component]);
    return component.id;
  };
  
  // Core remove component function without try/catch
  const coreRemoveComponent = (componentId: string) => {
    // Remove the component
    const updatedComponents = projectContext.components.filter(comp => comp.id !== componentId);
    projectContext.handleComponentsChange(updatedComponents);
    
    // Clean up any connections associated with this component
    // Note: connections API needs to be updated based on your current implementation
    // This is a placeholder assuming you have wires in your context
    const updatedWires = projectContext.wires.filter(wire => 
      wire.source !== componentId && wire.target !== componentId
    );
    projectContext.handleWiresChange(updatedWires);
    
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
    const connectionExists = projectContext.wires.some(
      wire => 
        (wire.source === sourceId && wire.sourceHandle === `pin-${sourcePinIndex}` && 
         wire.target === targetId && wire.targetHandle === `pin-${targetPinIndex}`) ||
        (wire.source === targetId && wire.sourceHandle === `pin-${targetPinIndex}` && 
         wire.target === sourceId && wire.targetHandle === `pin-${sourcePinIndex}`)
    );
    
    if (connectionExists) {
      toast.error('Connection already exists');
      return false;
    }
    
    // Create the connection - use your wire creation logic here
    const newWire = {
      id: `wire-${Date.now()}`,
      source: sourceId,
      sourceHandle: `pin-${sourcePinIndex}`,
      target: targetId, 
      targetHandle: `pin-${targetPinIndex}`,
      type: 'customWire',
      data: {
        color: '#555', // Default color, adjust as needed
        sourcePinIndex: sourcePinIndex,
        targetPinIndex: targetPinIndex,
        signal: '' // Default signal, adjust as needed
      }
    };
    
    projectContext.handleWiresChange([...projectContext.wires, newWire]);
    return true;
  };
  
  // Core run simulation function without try/catch
  const coreRunSimulation = async () => {
    if (projectContext.components.length === 0) {
      toast.error('Cannot run simulation: No components added');
      return false;
    }
    
    if (projectContext.wires.length === 0) {
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
