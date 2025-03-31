import React from 'react';
import CircuitCanvas from './CircuitCanvas';
import { WokwiComponent } from '@/integrations/wokwi/WokwiIntegration';
import { CircuitComponent } from '@/types/component';
import { useCircuitEditor } from '@/context/CircuitEditorContext';

interface CircuitCanvasWrapperProps {
  components: CircuitComponent[];
  onComponentsChange: (components: CircuitComponent[]) => void;
}

/**
 * Wrapper component for CircuitCanvas that handles the communication with the parent component
 * This is a transitional component that will be removed once we fully refactor to use context
 */
const CircuitCanvasWrapper: React.FC<CircuitCanvasWrapperProps> = ({ 
  components, 
  onComponentsChange 
}) => {
  // Eventually we'll replace this with direct use of the context
  // For now, we're keeping the props to maintain backward compatibility during refactoring
  
  return (
    <div className="h-full w-full">
      <CircuitCanvas 
        components={components as WokwiComponent[]} 
        onComponentsChange={onComponentsChange as (components: WokwiComponent[]) => void} 
      />
    </div>
  );
};

/**
 * Context-aware version of CircuitCanvasWrapper
 * This will eventually replace the prop-based version
 */
export const ContextCircuitCanvas = () => {
  const { components, handleComponentsChange } = useCircuitEditor();
  
  return (
    <CircuitCanvas 
      components={components as WokwiComponent[]} 
      onComponentsChange={handleComponentsChange as (components: WokwiComponent[]) => void} 
    />
  );
};

export default CircuitCanvasWrapper;
