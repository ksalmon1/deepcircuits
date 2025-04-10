import { useState, useEffect } from 'react';
import { CircuitComponent } from '@/types/circuit';

export interface CircuitCanvasState {
  isDragging: boolean;
  isConnecting: boolean;
  scale: number;
  position: [number, number];
}

export const useCircuitCanvasState = (components: CircuitComponent[]) => {
  const [canvasState, setCanvasState] = useState<CircuitCanvasState>({
    isDragging: false,
    isConnecting: false,
    scale: 1,
    position: [0, 0],
  });
  
  // Update canvas state when components change
  useEffect(() => {
    // Implement specific canvas state logic based on components if needed
  }, [components]);
  
  return canvasState;
};

export default useCircuitCanvasState; 