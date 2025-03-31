
import React from 'react';
import CircuitCanvas from './CircuitCanvas';
import ErrorBoundary from './ErrorBoundary';
import { CircuitComponent } from '@/types/component';

interface CircuitCanvasWrapperProps {
  components: CircuitComponent[];
  onComponentsChange: (components: CircuitComponent[]) => void;
}

const CircuitCanvasWrapper: React.FC<CircuitCanvasWrapperProps> = ({ components, onComponentsChange }) => {
  return (
    <ErrorBoundary>
      <CircuitCanvas 
        components={components} 
        onComponentsChange={onComponentsChange} 
      />
    </ErrorBoundary>
  );
};

export default CircuitCanvasWrapper;
