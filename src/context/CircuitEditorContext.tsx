
import React, { ReactNode } from 'react';
import { ErrorProvider, useError } from './ErrorContext';
import { ProjectProvider, useProject } from './ProjectContext';
import { SimulationProvider, useSimulation } from './SimulationContext';
import { SelectionProvider, useSelection } from './SelectionContext';

// This is now a composite provider that combines all the individual providers
interface CircuitEditorProviderProps {
  children: ReactNode;
}

export const CircuitEditorProvider: React.FC<CircuitEditorProviderProps> = ({ children }) => {
  return (
    <ErrorProvider>
      <ProjectProvider>
        <SimulationProvider>
          <SelectionProvider>
            {children}
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

  return {
    ...errorContext,
    ...projectContext,
    ...simulationContext,
    ...selectionContext
  };
};
