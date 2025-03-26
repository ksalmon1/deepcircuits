
import { useState, useCallback, useRef, useEffect } from 'react';
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
  const lastMousePositionRef = useRef<{x: number, y: number} | null>(null);
  
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
  
  const addIntermediatePoint = useCallback((x: number, y: number): void => {
    if (!activeWire) return;
    
    // Don't add a point that's too close to the last point to avoid duplicates
    const lastPoint = activeWire.points[activeWire.points.length - 1];
    const distance = Math.sqrt(Math.pow(x - lastPoint.x, 2) + Math.pow(y - lastPoint.y, 2));
    if (distance < 10) return; // Minimum distance between points
    
    // Create a new point and add it to the wire
    const updatedWire = {
      ...activeWire,
      points: [...activeWire.points, { x, y }]
    };
    
    console.log(`Added intermediate point at (${x}, ${y})`);
    console.log('Updated wire points:', updatedWire.points);
    setActiveWire(updatedWire);
  }, [activeWire]);
  
  const completeWire = useCallback((
    wire: Wire,
    targetComponentId: string,
    targetPinIndex: number,
    finalX: number,
    finalY: number
  ): Wire => {
    if (!wire) return wire;
    
    console.log(`Completing wire to component ${targetComponentId}, pin ${targetPinIndex} at (${finalX}, ${finalY})`);
    
    // Get current points and add the final point
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
  
  const findPotentialPinConnection = useCallback((
    x: number,
    y: number,
    threshold: number = 15
  ): { componentId: string; pinIndex: number; x: number; y: number } | null => {
    const sourceComponentId = activeWire?.sourceComponentId;
    const sourcePinIndex = activeWire?.sourcePinIndex;
    
    let closestPin: { componentId: string; pinIndex: number; distance: number; x: number; y: number } | null = null;
    let minDistance = threshold;
    
    for (const component of components) {
      if (!component.pins) continue;
      
      if (component.id === sourceComponentId) {
        for (let i = 0; i < component.pins.length; i++) {
          if (i === sourcePinIndex) continue;
          
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
  
  const handlePinClick = useCallback((componentId: string, pinIndex: number, x: number, y: number) => {
    console.log(`Pin clicked: component ${componentId}, pin ${pinIndex} at (${x}, ${y})`);
    
    if (activeWire) {
      if (activeWire.sourceComponentId === componentId && activeWire.sourcePinIndex === pinIndex) {
        console.log('Clicked on source pin, ignoring');
        return;
      }
      
      const completedWire = completeWire(
        activeWire,
        componentId,
        pinIndex,
        x,
        y
      );
      
      console.log('Wire completed:', completedWire);
      setWires(prev => [...prev, completedWire]);
      setActiveWire(null);
    } else {
      console.log('Starting new wire');
      startWire(componentId, pinIndex, x, y);
    }
  }, [activeWire, completeWire, startWire]);
  
  const handleCanvasClick = useCallback((x: number, y: number) => {
    if (!activeWire) return;
    
    // If we're near a pin, don't add an intermediate point
    const potentialPin = findPotentialPinConnection(x, y);
    if (potentialPin) {
      // If near a pin and it's not the source pin, complete the wire
      if (potentialPin.componentId === activeWire.sourceComponentId && 
          potentialPin.pinIndex === activeWire.sourcePinIndex) {
        console.log('Clicked near source pin, ignoring');
        return;
      }
      
      const completedWire = completeWire(
        activeWire,
        potentialPin.componentId,
        potentialPin.pinIndex,
        potentialPin.x,
        potentialPin.y
      );
      
      console.log('Wire completed via canvas click:', completedWire);
      setWires(prev => [...prev, completedWire]);
      setActiveWire(null);
      return;
    }
    
    // Add an intermediate point to the wire if we're not near a pin
    console.log('Adding intermediate point at', x, y);
    addIntermediatePoint(x, y);
  }, [activeWire, findPotentialPinConnection, addIntermediatePoint, completeWire]);
  
  const handleMouseMove = useCallback((e: KonvaEventObject<MouseEvent>) => {
    if (!activeWire) return;
    
    const stage = e.target.getStage();
    if (!stage) return;
    
    const pointerPos = stage.getPointerPosition();
    if (!pointerPos) return;
    
    lastMousePositionRef.current = { x: pointerPos.x, y: pointerPos.y };
    
    const canvasX = (pointerPos.x - stage.x()) / stage.scaleX();
    const canvasY = (pointerPos.y - stage.y()) / stage.scaleY();
    
    const potentialPin = findPotentialPinConnection(canvasX, canvasY);
    
    if (potentialPin) {
      potentialTargetRef.current = {
        componentId: potentialPin.componentId,
        pinIndex: potentialPin.pinIndex
      };
      
      const updatedWire = updateWireEndPoint(activeWire, potentialPin.x, potentialPin.y);
      setActiveWire(updatedWire);
    } else {
      potentialTargetRef.current = null;
      
      const updatedWire = updateWireEndPoint(activeWire, canvasX, canvasY);
      setActiveWire(updatedWire);
    }
  }, [activeWire, updateWireEndPoint, findPotentialPinConnection]);
  
  const handleStageMouseUp = useCallback(() => {
    if (activeWire && potentialTargetRef.current) {
      const { componentId, pinIndex } = potentialTargetRef.current;
      
      const component = components.find(c => c.id === componentId);
      if (!component || !component.pins) return;
      
      const pin = component.pins[pinIndex];
      const x = component.left + pin.x;
      const y = component.top + pin.y;
      
      const completedWire = completeWire(
        activeWire,
        componentId,
        pinIndex,
        x,
        y
      );
      
      console.log('Wire completed via mouse up:', completedWire);
      setWires(prev => [...prev, completedWire]);
      setActiveWire(null);
      potentialTargetRef.current = null;
    }
  }, [activeWire, components, completeWire]);
  
  const handleKonvaClick = useCallback((e: KonvaEventObject<MouseEvent>) => {
    if (!activeWire) return;
    
    const stage = e.target.getStage();
    if (!stage) return;
    
    const pointerPos = stage.getPointerPosition();
    if (!pointerPos) return;
    
    const canvasX = (pointerPos.x - stage.x()) / stage.scaleX();
    const canvasY = (pointerPos.y - stage.y()) / stage.scaleY();
    
    handleCanvasClick(canvasX, canvasY);
  }, [activeWire, handleCanvasClick]);
  
  const cancelActiveWire = useCallback(() => {
    console.log('Cancelling active wire');
    setActiveWire(null);
    potentialTargetRef.current = null;
  }, []);
  
  useEffect(() => {
    if (wires.length === 0) return;
    
    const updatedWires = wires.map(wire => {
      if (!wire.isComplete) return wire;
      
      const sourceComponent = components.find(c => c.id === wire.sourceComponentId);
      const targetComponent = components.find(c => c.id === wire.targetComponentId);
      
      if (!sourceComponent || !targetComponent || !sourceComponent.pins || !targetComponent.pins) {
        return wire;
      }
      
      const sourcePin = sourceComponent.pins[wire.sourcePinIndex];
      const targetPin = targetComponent.pins[wire.targetPinIndex!];
      
      if (!sourcePin || !targetPin) return wire;
      
      const sourceX = sourceComponent.left + sourcePin.x;
      const sourceY = sourceComponent.top + sourcePin.y;
      const targetX = targetComponent.left + targetPin.x;
      const targetY = targetComponent.top + targetPin.y;
      
      // If there are only two points, update them to match the pins
      // If there are more than two points (custom routing), only update the first and last
      if (wire.points.length === 2) {
        return {
          ...wire,
          points: [
            { x: sourceX, y: sourceY },
            { x: targetX, y: targetY }
          ]
        };
      } else {
        const updatedPoints = [...wire.points];
        updatedPoints[0] = { x: sourceX, y: sourceY };
        updatedPoints[updatedPoints.length - 1] = { x: targetX, y: targetY };
        return {
          ...wire,
          points: updatedPoints
        };
      }
    });
    
    const wiresChanged = JSON.stringify(updatedWires) !== JSON.stringify(wires);
    if (wiresChanged) {
      setWires(updatedWires);
    }
  }, [components, wires]);
  
  return {
    wires,
    setWires,
    activeWire,
    handlePinClick,
    handleCanvasClick,
    handleMouseMove,
    handleStageMouseUp,
    handleKonvaClick, // Add handleKonvaClick to export
    cancelActiveWire,
    potentialTarget: potentialTargetRef.current,
    potentialTargetRef
  };
};
