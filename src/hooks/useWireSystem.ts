
import { useState, useCallback, useRef, useEffect } from 'react';
import { WokwiComponent } from '@/integrations/wokwi/WokwiIntegration';
import { getWireColorFromSignal, getPinSignalType, createAutoRoutedPoints, addWireIntermediatePoint, findClosestPointOnWire } from '@/utils/wireUtils';
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
  const [wireBeingEdited, setWireBeingEdited] = useState<string | null>(null);
  
  // Start a new wire from a component pin
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
  
  // Update the endpoint of an active wire (during dragging)
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
  
  // Add an intermediate point to the active wire
  const addIntermediatePoint = useCallback((x: number, y: number): void => {
    if (!activeWire) return;
    
    // If the wire has at least 2 points, find the best place to insert the new point
    if (activeWire.points.length >= 2) {
      const result = findClosestPointOnWire(x, y, activeWire);
      const segmentIndex = result.segmentIndex;
      
      // Insert the new point after the segment's start point
      const updatedPoints = [...activeWire.points];
      updatedPoints.splice(segmentIndex + 1, 0, { x, y });
      
      const updatedWire = {
        ...activeWire,
        points: updatedPoints
      };
      
      console.log(`Added intermediate point at (${x}, ${y}) at segment ${segmentIndex}`);
      setActiveWire(updatedWire);
    } else {
      // If the wire has only one point (start point), just add the new point
      const lastPoint = activeWire.points[activeWire.points.length - 1];
      const distance = Math.sqrt(Math.pow(x - lastPoint.x, 2) + Math.pow(y - lastPoint.y, 2));
      
      // Only add if the point is not too close to the last point
      if (distance < 10) return;
      
      const updatedWire = {
        ...activeWire,
        points: [...activeWire.points, { x, y }]
      };
      
      console.log(`Added intermediate point at (${x}, ${y})`);
      setActiveWire(updatedWire);
    }
  }, [activeWire]);
  
  // Add point to an existing wire (not the active wire)
  const addPointToExistingWire = useCallback((wireId: string, x: number, y: number): void => {
    const wireToEdit = wires.find(w => w.id === wireId);
    if (!wireToEdit) return;
    
    const result = findClosestPointOnWire(x, y, wireToEdit);
    const segmentIndex = result.segmentIndex;
    
    const updatedWires = wires.map(wire => {
      if (wire.id === wireId) {
        const updatedPoints = [...wire.points];
        updatedPoints.splice(segmentIndex + 1, 0, { x, y });
        
        return {
          ...wire,
          points: updatedPoints
        };
      }
      return wire;
    });
    
    console.log(`Added point to existing wire ${wireId} at segment ${segmentIndex}`);
    setWires(updatedWires);
  }, [wires]);
  
  // Move an existing point in a wire
  const moveWirePoint = useCallback((wireId: string, pointIndex: number, newX: number, newY: number): void => {
    setWires(prevWires => {
      return prevWires.map(wire => {
        if (wire.id === wireId) {
          // Don't allow moving the first or last points of completed wires (they're connected to pins)
          if (wire.isComplete && (pointIndex === 0 || pointIndex === wire.points.length - 1)) {
            return wire;
          }
          
          const newPoints = [...wire.points];
          newPoints[pointIndex] = { x: newX, y: newY };
          
          console.log(`Moved point ${pointIndex} of wire ${wireId} to (${newX}, ${newY})`);
          
          return {
            ...wire,
            points: newPoints
          };
        }
        return wire;
      });
    });
  }, []);
  
  // Complete a wire by connecting it to a target pin
  const completeWire = useCallback((
    wire: Wire,
    targetComponentId: string,
    targetPinIndex: number,
    finalX: number,
    finalY: number
  ): Wire => {
    if (!wire) return wire;
    
    console.log(`Completing wire to component ${targetComponentId}, pin ${targetPinIndex} at (${finalX}, ${finalY})`);
    
    let newPoints: WirePoint[];
    
    if (wire.points.length <= 2) {
      // For simple wires with just start and end points, create an auto-routed path
      const startPoint = wire.points[0];
      newPoints = createAutoRoutedPoints(startPoint.x, startPoint.y, finalX, finalY);
    } else {
      // For manually routed wires, just ensure the last point is at the target pin
      newPoints = [...wire.points];
      newPoints[newPoints.length - 1] = { x: finalX, y: finalY };
    }
    
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
  
  // Find a potential pin connection based on proximity
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
  
  // Handle pin click (start or complete a wire)
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
  
  // Handle click on the canvas (either add a point to active wire or add to existing wire)
  const handleCanvasClick = useCallback((x: number, y: number) => {
    if (activeWire) {
      const potentialPin = findPotentialPinConnection(x, y);
      if (potentialPin) {
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
      
      console.log('Adding intermediate point at', x, y);
      addIntermediatePoint(x, y);
      return;
    }
    
    // If we're not creating a wire, see if the click is near an existing wire
    if (!activeWire) {
      for (const wire of wires) {
        if (!wire.isComplete) continue;
        
        const { segmentIndex, distance } = findClosestPointOnWire(x, y, wire);
        
        if (distance < 10) {
          console.log(`Click near wire ${wire.id}, segment ${segmentIndex}`);
          addPointToExistingWire(wire.id, x, y);
          return;
        }
      }
    }
  }, [activeWire, findPotentialPinConnection, addIntermediatePoint, addPointToExistingWire, completeWire, wires]);
  
  // Handle mouse move (update active wire end point or handle potential connections)
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
  
  // Handle mouse up (complete a wire if over a valid pin)
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
  
  // Handle click on the Konva stage
  const handleKonvaClick = useCallback((e: KonvaEventObject<MouseEvent>) => {
    if (!e.target.getStage()) {
      console.log("No stage found, ignoring Konva click");
      return;
    }
    
    const stage = e.target.getStage();
    const pointerPos = stage.getPointerPosition();
    if (!pointerPos) {
      console.log("No pointer position found, ignoring Konva click");
      return;
    }
    
    // Convert from screen coordinates to canvas coordinates
    const canvasX = (pointerPos.x - stage.x()) / stage.scaleX();
    const canvasY = (pointerPos.y - stage.y()) / stage.scaleY();
    
    console.log("Konva stage clicked at:", canvasX, canvasY);
    
    // Use the common canvas click handler
    handleCanvasClick(canvasX, canvasY);
  }, [handleCanvasClick]);
  
  // Cancel the active wire being created
  const cancelActiveWire = useCallback(() => {
    console.log('Cancelling active wire');
    setActiveWire(null);
    potentialTargetRef.current = null;
  }, []);
  
  // Update wires when components move
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
      
      if (wire.points.length === 2) {
        // For simple wires with just start and end points, recreate the auto-routed path
        return {
          ...wire,
          points: createAutoRoutedPoints(sourceX, sourceY, targetX, targetY)
        };
      } else {
        // For manually routed wires, just update the start and end points
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
    handleKonvaClick,
    cancelActiveWire,
    potentialTarget: potentialTargetRef.current,
    potentialTargetRef,
    addPointToExistingWire,
    moveWirePoint
  };
};
