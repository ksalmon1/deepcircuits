
import React from 'react';
import CircuitCanvas from './CircuitCanvas';
import ErrorBoundary from './ErrorBoundary';
import { useProject } from '@/context/CircuitEditorContext';
import { CircuitComponent } from '@/types/component';
import { useCircuitCanvasState } from '@/hooks/useCircuitCanvasState';

/**
 * Props for CircuitCanvasWrapper when used directly
 */
export interface CircuitCanvasWrapperProps {
  components?: CircuitComponent[];
  onComponentsChange?: (updatedComponents: CircuitComponent[]) => void;
}

/**
 * Context-aware CircuitCanvas wrapper
 * This version directly uses the Circuit contexts
 */
const CircuitCanvasWrapper: React.FC<CircuitCanvasWrapperProps> = ({ 
  components: propComponents, 
  onComponentsChange: propOnComponentsChange 
}) => {
  const { components: contextComponents, handleComponentsChange } = useProject();
  
  // Use props if provided, otherwise use context
  const components = propComponents || contextComponents;
  const onComponentsChange = propOnComponentsChange || handleComponentsChange;
  
  return (
    <div className="h-full w-full">
      <ErrorBoundary>
        <CircuitCanvas 
          components={components} 
          onComponentsChange={onComponentsChange} 
        />
      </ErrorBoundary>
    </div>
  );
};

/**
 * Legacy wrapper for backward compatibility during refactoring
 * @deprecated Use CircuitCanvasWrapper directly
 */
export const ContextCircuitCanvas = CircuitCanvasWrapper;

export default CircuitCanvasWrapper;
