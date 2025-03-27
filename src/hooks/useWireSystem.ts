
import { useState, useCallback, useRef } from 'react';
import { WokwiComponent } from '@/integrations/wokwi/WokwiIntegration';
import { getWireColorFromSignal, getPinSignalType, createAutoRoutedPoints } from '@/utils/wireUtils';

export interface WirePoint {
  x: number;
  y: number;
}

export interface Wire {
  id: string;
  sourceComponentId: string;
  sourcePinIndex: number;
  targetComponentId: string | null;
  targetPinIndex: number | null;
  points: WirePoint[];
  color: string;
  isComplete: boolean;
}

export const useWireSystem = (components: WokwiComponent[]) => {
  const [wires, setWires] = useState<Wire[]>([]);
  const [activeWire, setActiveWire] = useState<Wire | null>(null);
  const potentialTargetRef = useRef<{componentId: string, pinIndex: number} | null>(null);
  
  const startWire = useCallback((componentId: string, pinIndex: number, x: number, y: number) => {
    console.log(`Starting wire from component ${componentId}, pin ${pinIndex} at (${x}, ${y})`);
    
    const signal = getPinSignalType(components, componentId, pinIndex);
    const color = getWireColorFromSignal(signal || '');
    
    const newWire: Wire = {
      id: `wire-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      sourceComponentId: componentId,
      sourcePinIndex: pinIndex,
      targetComponentId: null,
      targetPinIndex: null,
      points: [{ x, y }],
      color,
      isComplete: false
    };
    
    setActiveWire(newWire);
    return newWire;
  }, [components]);
  
  const updateWireEndPoint = useCallback((wire: Wire, x: number, y: number): Wire => {
    if (!wire) return wire;
    
    const newPoints = [...wire.points];
    
    if (newPoints.length === 1) {
      newPoints.push({ x, y });
    } else if (!wire.isComplete) {
      newPoints[newPoints.length - 1] = { x, y };
    } else {
      newPoints.push({ x, y });
    }
    
    return {
      ...wire,
      points: newPoints
    };
  }, []);
  
  const handlePinClick = useCallback((componentId: string, pinIndex: number, x: number, y: number) => {
    console.log(`Pin clicked: component ${componentId}, pin ${pinIndex} at (${x}, ${y})`);
    
    if (activeWire) {
      if (activeWire.sourceComponentId === componentId && activeWire.sourcePinIndex === pinIndex) {
        console.log('Clicked on source pin, ignoring');
        return;
      }
      
      // Complete the active wire
      const sourcePoint = activeWire.points[0];
      
      // Create a smooth path between source and target
      const autoRoutedPoints = createAutoRoutedPoints(sourcePoint.x, sourcePoint.y, x, y);
      
      const completedWire: Wire = {
        ...activeWire,
        targetComponentId: componentId,
        targetPinIndex: pinIndex,
        points: autoRoutedPoints,
        isComplete: true
      };
      
      console.log('Wire completed:', completedWire);
      setWires(prev => [...prev, completedWire]);
      setActiveWire(null);
    } else {
      console.log('Starting new wire');
      startWire(componentId, pinIndex, x, y);
    }
  }, [activeWire, startWire]);
  
  const cancelActiveWire = useCallback(() => {
    console.log('Cancelling active wire');
    setActiveWire(null);
    potentialTargetRef.current = null;
  }, []);
  
  const addIntermediatePoint = useCallback((x: number, y: number) => {
    if (!activeWire) return;
    
    const updatedWire = {
      ...activeWire,
      points: [...activeWire.points, { x, y }]
    };
    
    console.log(`Added intermediate point at (${x}, ${y})`);
    setActiveWire(updatedWire);
  }, [activeWire]);
  
  const handleCanvasClick = useCallback((x: number, y: number) => {
    if (activeWire) {
      // Add a point to the active wire
      addIntermediatePoint(x, y);
    }
  }, [activeWire, addIntermediatePoint]);
  
  const deleteWire = useCallback((wireId: string) => {
    console.log(`Deleting wire ${wireId}`);
    setWires(prev => prev.filter(wire => wire.id !== wireId));
  }, []);
  
  const handleMouseMove = useCallback((x: number, y: number) => {
    if (activeWire) {
      // Update the active wire endpoint
      const updatedWire = updateWireEndPoint(activeWire, x, y);
      setActiveWire(updatedWire);
    }
  }, [activeWire, updateWireEndPoint]);
  
  return {
    wires,
    setWires,
    activeWire,
    setActiveWire,
    handlePinClick,
    handleCanvasClick,
    cancelActiveWire,
    potentialTargetRef,
    // Add the missing functions
    handleMouseMove,
    handleStageMouseUp: cancelActiveWire, // Alias for canceling the active wire
    handleKonvaClick: handleCanvasClick, // Alias for handleCanvasClick
    deleteWire,
    potentialTarget: potentialTargetRef.current
  };
};
