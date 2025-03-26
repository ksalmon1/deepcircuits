
import { useEffect } from 'react';
import { WokwiComponent } from '@/integrations/wokwi/WokwiIntegration';
import { Wire } from './useWireState';
import { getPinAbsolutePosition } from '@/utils/wireUtils';

export const useWireRendering = (
  components: WokwiComponent[],
  wires: Wire[],
  setWires: (updaterFn: (prev: Wire[]) => Wire[]) => void
) => {
  // Update wire positions when components move
  useEffect(() => {
    if (wires.length === 0) return;
    
    const updatedWires = wires.map(wire => {
      if (!wire.isComplete) return wire;
      
      const sourcePos = getPinAbsolutePosition(components, wire.sourceComponentId, wire.sourcePinIndex);
      const targetPos = wire.targetComponentId && wire.targetPinIndex !== null 
        ? getPinAbsolutePosition(components, wire.targetComponentId, wire.targetPinIndex)
        : null;
      
      if (!sourcePos || !targetPos) return wire;
      
      if (wire.points.length === 2) {
        return {
          ...wire,
          points: [
            { x: sourcePos.x, y: sourcePos.y },
            { x: targetPos.x, y: targetPos.y }
          ]
        };
      } else {
        const updatedPoints = [...wire.points];
        updatedPoints[0] = { x: sourcePos.x, y: sourcePos.y };
        updatedPoints[updatedPoints.length - 1] = { x: targetPos.x, y: targetPos.y };
        return {
          ...wire,
          points: updatedPoints
        };
      }
    });
    
    const wiresChanged = JSON.stringify(updatedWires) !== JSON.stringify(wires);
    if (wiresChanged) {
      // Fix: Use the updater function pattern instead of directly passing the array
      setWires(() => updatedWires);
    }
  }, [components, wires, setWires]);

  return {
    // Any additional rendering-related functionality can be added here
  };
};
