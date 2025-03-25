import { useState, useCallback, useRef } from 'react';
import { WokwiComponent } from '@/integrations/wokwi/WokwiIntegration';
import { getWireColorFromSignal, getPinSignalType } from '@/utils/wireUtils';
import { KonvaEventObject } from 'konva/lib/Node';

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
  
  // Create a new wire from a pin
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
  
  // Update wire endpoint as mouse moves
  const updateWireEndPoint = useCallback((wire: Wire, x: number, y: number): Wire => {
    if (!wire) return wire;
    
    const newPoints = [...wire.points];
    
    // For active wire being drawn, replace the last point or add a new one
    if (newPoints.length === 1) {
      // First segment - just update the end point
      newPoints.push({ x, y });
    } else if (!wire.isComplete) {
      // Update the last point while drawing
      newPoints[newPoints.length - 1] = { x, y };
    } else {
      // For an existing wire, add a new point
      newPoints.push({ x, y });
    }
    
    return {
      ...wire,
      points: newPoints
    };
  }, []);
  
  // Complete a wire by connecting to a target pin
  const completeWire = useCallback((
    wire: Wire,
    targetComponentId: string,
    targetPinIndex: number,
    finalX: number,
    finalY: number
  ): Wire => {
    if (!wire) return wire;
    
    console.log(`Completing wire to component ${targetComponentId}, pin ${targetPinIndex} at (${finalX}, ${finalY})`);
    
    // Start with existing points
    const newPoints = [...wire.points];
    
    // If we only have one point (start point), add the end point
    if (newPoints.length === 1) {
      newPoints.push({ x: finalX, y: finalY });
    } else {
      // Otherwise replace the last point with the exact target position
      newPoints[newPoints.length - 1] = { x: finalX, y: finalY };
    }
    
    const completedWire = {
      ...wire,
      targetComponentId,
      targetPinIndex,
      points: newPoints,
      isComplete: true
    };
    
    console.log("Wire points:", completedWire.points);
    
    return completedWire;
  }, []);
  
  // Find if a point is near a pin
  const findPotentialPinConnection = useCallback((
    x: number,
    y: number,
    threshold: number = 15
  ): { componentId: string; pinIndex: number; x: number; y: number } | null => {
    // Don't connect to the source pin
    const sourceComponentId = activeWire?.sourceComponentId;
    const sourcePinIndex = activeWire?.sourcePinIndex;
    
    let closestPin: { componentId: string; pinIndex: number; distance: number; x: number; y: number } | null = null;
    let minDistance = threshold;
    
    for (const component of components) {
      if (!component.pins) continue;
      
      // Skip self-connection to the same pin
      if (component.id === sourceComponentId) {
        for (let i = 0; i < component.pins.length; i++) {
          if (i === sourcePinIndex) continue; // Skip source pin
          
          const pin = component.pins[i];
          const pinX = component.left + pin.x;
          const pinY = component.top + pin.y;
          
          const dx = x - pinX;
          const dy = y - pinY;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < minDistance) {
            minDistance = distance;
            closestPin = {
              componentId: component.id,
              pinIndex: i,
              distance,
              x: pinX,
              y: pinY
            };
          }
        }
      } else {
        // Check pins on other components
        for (let i = 0; i < component.pins.length; i++) {
          const pin = component.pins[i];
          const pinX = component.left + pin.x;
          const pinY = component.top + pin.y;
          
          const dx = x - pinX;
          const dy = y - pinY;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < minDistance) {
            minDistance = distance;
            closestPin = {
              componentId: component.id,
              pinIndex: i,
              distance,
              x: pinX,
              y: pinY
            };
          }
        }
      }
    }
    
    return closestPin ? {
      componentId: closestPin.componentId,
      pinIndex: closestPin.pinIndex,
      x: closestPin.x,
      y: closestPin.y
    } : null;
  }, [components, activeWire]);
  
  // Handle pin click to start or complete wire
  const handlePinClick = useCallback((componentId: string, pinIndex: number, x: number, y: number) => {
    console.log(`Pin clicked: component ${componentId}, pin ${pinIndex} at (${x}, ${y})`);
    
    // If already wiring, try to complete the wire
    if (activeWire) {
      // Don't connect to the source pin
      if (activeWire.sourceComponentId === componentId && activeWire.sourcePinIndex === pinIndex) {
        console.log('Clicked on source pin, ignoring');
        return;
      }
      
      // Complete the wire
      const completedWire = completeWire(
        activeWire,
        componentId,
        pinIndex,
        x,
        y
      );
      
      // Add the completed wire to the list
      console.log('Wire completed:', completedWire);
      setWires(prev => [...prev, completedWire]);
      setActiveWire(null);
    } else {
      // Start a new wire
      console.log('Starting new wire');
      startWire(componentId, pinIndex, x, y);
    }
  }, [activeWire, completeWire, startWire]);
  
  // Handle mouse move to update wire
  const handleMouseMove = useCallback((e: KonvaEventObject<MouseEvent>) => {
    if (!activeWire) return;
    
    const stage = e.target.getStage();
    if (!stage) return;
    
    const pointerPos = stage.getPointerPosition();
    if (!pointerPos) return;
    
    // Check if we're near a potential pin
    const potentialPin = findPotentialPinConnection(pointerPos.x, pointerPos.y);
    
    if (potentialPin) {
      potentialTargetRef.current = {
        componentId: potentialPin.componentId,
        pinIndex: potentialPin.pinIndex
      };
      
      // Update wire to snap to pin
      const updatedWire = updateWireEndPoint(activeWire, potentialPin.x, potentialPin.y);
      setActiveWire(updatedWire);
    } else {
      potentialTargetRef.current = null;
      
      // Just follow the mouse
      const updatedWire = updateWireEndPoint(activeWire, pointerPos.x, pointerPos.y);
      setActiveWire(updatedWire);
    }
  }, [activeWire, updateWireEndPoint, findPotentialPinConnection]);
  
  // Handle mouse up to complete wire if on a pin
  const handleStageMouseUp = useCallback(() => {
    if (activeWire && potentialTargetRef.current) {
      const { componentId, pinIndex } = potentialTargetRef.current;
      
      // Find the pin position
      const component = components.find(c => c.id === componentId);
      if (!component || !component.pins) return;
      
      const pin = component.pins[pinIndex];
      const x = component.left + pin.x;
      const y = component.top + pin.y;
      
      // Complete the wire
      const completedWire = completeWire(
        activeWire,
        componentId,
        pinIndex,
        x,
        y
      );
      
      // Add the completed wire to the list
      console.log('Wire completed via mouse up:', completedWire);
      setWires(prev => [...prev, completedWire]);
      setActiveWire(null);
      potentialTargetRef.current = null;
    }
  }, [activeWire, components, completeWire]);
  
  // Cancel active wire (e.g. on Escape key)
  const cancelActiveWire = useCallback(() => {
    console.log('Cancelling active wire');
    setActiveWire(null);
    potentialTargetRef.current = null;
  }, []);
  
  return {
    wires,
    setWires,
    activeWire,
    handlePinClick,
    handleMouseMove,
    handleStageMouseUp,
    cancelActiveWire,
    potentialTarget: potentialTargetRef.current
  };
};
