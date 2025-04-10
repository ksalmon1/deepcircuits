import React, { memo, useMemo } from 'react';
import CircuitCanvas from './CircuitCanvas';
import { CircuitComponent } from '@/types/circuit';

interface CircuitCanvasWrapperProps {
  components: CircuitComponent[];
  onComponentsChange: (components: CircuitComponent[]) => void;
}

const CircuitCanvasWrapper: React.FC<CircuitCanvasWrapperProps> = ({
  components,
  onComponentsChange,
}) => {
  // Memoize the props to reduce re-renders
  const canvasProps = useMemo(() => ({
    components,
    onComponentsChange
  }), [components, onComponentsChange]);
  
  return (
    <div className="h-full w-full">
      <CircuitCanvas {...canvasProps} />
    </div>
  );
};

// Export a memoized version of the component
export default memo(CircuitCanvasWrapper); 