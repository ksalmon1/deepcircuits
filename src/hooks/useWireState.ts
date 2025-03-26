
import { useState, useCallback } from 'react';
import { getWireColorFromSignal, getPinSignalType } from '@/utils/wireUtils';
import { WokwiComponent } from '@/integrations/wokwi/WokwiIntegration';

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

export const useWireState = (components: WokwiComponent[]) => {
  const [wires, setWires] = useState<Wire[]>([]);
  const [activeWire, setActiveWire] = useState<Wire | null>(null);

  const createWire = useCallback((componentId: string, pinIndex: number, x: number, y: number) => {
    console.log(`Creating wire from component ${componentId}, pin ${pinIndex} at (${x}, ${y})`);
    
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
    
    return newWire;
  }, [components]);

  const startWire = useCallback((componentId: string, pinIndex: number, x: number, y: number) => {
    console.log(`Starting wire from component ${componentId}, pin ${pinIndex} at (${x}, ${y})`);
    
    const newWire = createWire(componentId, pinIndex, x, y);
    setActiveWire(newWire);
    return newWire;
  }, [createWire]);

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
  
  const addWirePoint = useCallback((wire: Wire, x: number, y: number): Wire => {
    if (!wire) return wire;
    
    return {
      ...wire,
      points: [...wire.points, { x, y }]
    };
  }, []);

  const completeWire = useCallback((
    wire: Wire,
    targetComponentId: string,
    targetPinIndex: number,
    finalX: number,
    finalY: number
  ): Wire => {
    if (!wire) return wire;
    
    console.log(`Completing wire to component ${targetComponentId}, pin ${targetPinIndex} at (${finalX}, ${finalY})`);
    
    const newPoints = [...wire.points];
    newPoints[newPoints.length - 1] = { x: finalX, y: finalY };
    
    const completedWire = {
      ...wire,
      targetComponentId,
      targetPinIndex,
      points: newPoints,
      isComplete: true
    };
    
    console.log("Wire points at completion:", completedWire.points);
    
    return completedWire;
  }, []);

  const cancelActiveWire = useCallback(() => {
    console.log('Cancelling active wire');
    setActiveWire(null);
  }, []);

  return {
    wires,
    setWires,
    activeWire,
    setActiveWire,
    startWire,
    updateWireEndPoint,
    addWirePoint,
    completeWire,
    cancelActiveWire
  };
};
