import React, { memo, useMemo } from 'react';
import CircuitCanvas from './CircuitCanvas';
import { CircuitComponent } from '@/types/circuit';
import { WireEdge } from '@/types/circuit';

interface CircuitCanvasWrapperProps {
  components: CircuitComponent[];
  onComponentsChange: (components: CircuitComponent[]) => void;
  wireConnections: WireEdge[];
  onWiresChange: (wires: WireEdge[]) => void;
}

const CircuitCanvasWrapper: React.FC<CircuitCanvasWrapperProps> = ({
  components,
  onComponentsChange,
  wireConnections,
  onWiresChange
}) => {
  // Memoize the props to reduce re-renders
  const canvasProps = useMemo(() => ({
    components,
    onComponentsChange,
    wireConnections,
    onWiresChange
  }), [components, onComponentsChange, wireConnections, onWiresChange]);
  
  return (
    <div className="h-full w-full">
      <CircuitCanvas {...canvasProps} />
    </div>
  );
};

// Export a memoized version of the component
export default memo(CircuitCanvasWrapper); 