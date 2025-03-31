
import React from 'react';
import CircuitCanvas from './CircuitCanvas';
import ErrorBoundary from './ErrorBoundary';
import { useCircuitEditor } from '@/context/CircuitEditorContext';

/**
 * Context-aware CircuitCanvas wrapper
 * This version directly uses the CircuitEditorContext
 */
const CircuitCanvasWrapper: React.FC = () => {
  const { components, handleComponentsChange } = useCircuitEditor();
  
  return (
    <div className="h-full w-full">
      <ErrorBoundary>
        <CircuitCanvas 
          components={components} 
          onComponentsChange={handleComponentsChange} 
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
