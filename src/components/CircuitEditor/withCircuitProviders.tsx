import React from 'react';
import { ErrorProvider } from '@/context/ErrorContext';
import { ProjectProvider } from '@/context/ProjectContext';
import { CircuitEditorProvider } from '@/context/CircuitEditorContext';

/**
 * Higher-order component that wraps a component with all necessary circuit-related providers.
 * Use this when you need to use circuit components outside of the main CircuitEditorPage.
 * 
 * @example
 * const WrappedComponent = withCircuitProviders(MyComponent);
 */
export const withCircuitProviders = <P extends object>(
  WrappedComponent: React.ComponentType<P>
) => {
  const WithCircuitProviders: React.FC<P> = (props) => {
    return (
      <ErrorProvider>
        <ProjectProvider>
          <CircuitEditorProvider>
            <WrappedComponent {...props} />
          </CircuitEditorProvider>
        </ProjectProvider>
      </ErrorProvider>
    );
  };

  // Set display name for better debugging
  WithCircuitProviders.displayName = `WithCircuitProviders(${
    WrappedComponent.displayName || WrappedComponent.name || 'Component'
  })`;

  return WithCircuitProviders;
};

export default withCircuitProviders; 