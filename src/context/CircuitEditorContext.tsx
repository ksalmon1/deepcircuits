import React, { createContext, useState, useContext, ReactNode } from 'react';
import { ErrorProvider, useError } from './ErrorContext';
import { ProjectProvider, useProject } from './ProjectContext';
import { SimulationProvider, useSimulation } from './SimulationContext';
import { SelectionProvider, useSelection } from './SelectionContext';
import { ComponentLibraryItem } from '@/types/component';

// Define the shape of the context data
interface CircuitEditorContextType {
  draggingComponentType: string | null;
  setDraggingComponentType: (type: string | null) => void;
  highlightedPins: { nodeId: string, pinIndex: number }[] | null;
  setHighlightedPins: (pins: { nodeId: string, pinIndex: number }[] | null) => void;
}

// Create the context with a default undefined value
const CircuitEditorContext = createContext<CircuitEditorContextType | undefined>(undefined);

// This is now a composite provider that combines all the individual providers
interface CircuitEditorProviderProps {
  children: ReactNode;
}

export const CircuitEditorProvider: React.FC<CircuitEditorProviderProps> = ({ children }) => {
  const [draggingComponentType, setDraggingComponentType] = useState<string | null>(null);
  const [highlightedPins, setHighlightedPins] = useState<{ nodeId: string, pinIndex: number }[] | null>(null);

  // Consolidate state and functions into the context value
  const contextValue: CircuitEditorContextType = {
    draggingComponentType,
    setDraggingComponentType,
    highlightedPins,
    setHighlightedPins,
  };

  return (
    <ErrorProvider>
      <ProjectProvider>
        <SimulationProvider>
          <SelectionProvider>
            <CircuitEditorContext.Provider value={contextValue}>
              {children}
            </CircuitEditorContext.Provider>
          </SelectionProvider>
        </SimulationProvider>
      </ProjectProvider>
    </ErrorProvider>
  );
};

// Re-export all the hooks for backward compatibility
export { useError } from './ErrorContext';
export { useProject } from './ProjectContext';
export { useSimulation } from './SimulationContext';
export { useSelection } from './SelectionContext';

// Provide the old hook name for backward compatibility
export const useCircuitEditor = () => {
  const errorContext = useError();
  const projectContext = useProject();
  const simulationContext = useSimulation();
  const selectionContext = useSelection();
  // Consume the actual CircuitEditorContext
  const circuitContext = useContext(CircuitEditorContext);

  // Check if the context is available (it should be if used within the provider)
  if (circuitContext === undefined) {
    throw new Error('useCircuitEditor must be used within a CircuitEditorProvider');
  }

  return {
    // Values from other contexts
    ...errorContext,
    ...projectContext,
    ...simulationContext,
    ...selectionContext,
    // Values from CircuitEditorContext
    ...circuitContext, 
  };
};
