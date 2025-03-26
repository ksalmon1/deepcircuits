
import { useCallback, useRef } from 'react';
import { KonvaEventObject } from 'konva/lib/Node';
import { WokwiComponent } from '@/integrations/wokwi/WokwiIntegration';
import { Wire } from './useWireState';
import { findPotentialPinConnection, getPinAbsolutePosition } from '@/utils/wireUtils';

export const useWireInteractions = (
  components: WokwiComponent[],
  activeWire: Wire | null,
  setActiveWire: (wire: Wire | null) => void,
  setWires: (updaterFn: (prev: Wire[]) => Wire[]) => void,
  completeWire: (
    wire: Wire,
    targetComponentId: string,
    targetPinIndex: number,
    finalX: number,
    finalY: number
  ) => Wire,
  updateWireEndPoint: (wire: Wire, x: number, y: number) => Wire,
  addWirePoint: (wire: Wire, x: number, y: number) => Wire
) => {
  const potentialTargetRef = useRef<{componentId: string, pinIndex: number} | null>(null);
  const lastMousePositionRef = useRef<{x: number, y: number} | null>(null);

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
    }
  }, [activeWire, completeWire, setWires, setActiveWire]);
  
  const handleCanvasClick = useCallback((x: number, y: number) => {
    if (!activeWire) return;
    
    const potentialPin = findPotentialPinConnection(x, y, components, activeWire);
    if (potentialPin) {
      if (potentialPin.componentId === activeWire.sourceComponentId && 
          potentialPin.pinIndex === activeWire.sourcePinIndex) {
        console.log('Clicked near source pin, ignoring');
        return;
      }
      
      const pinPos = getPinAbsolutePosition(components, potentialPin.componentId, potentialPin.pinIndex);
      if (!pinPos) return;
      
      const completedWire = completeWire(
        activeWire,
        potentialPin.componentId,
        potentialPin.pinIndex,
        pinPos.x,
        pinPos.y
      );
      
      console.log('Wire completed via canvas click:', completedWire);
      setWires(prev => [...prev, completedWire]);
      setActiveWire(null);
      return;
    }
    
    console.log('Adding intermediate point at', x, y);
    const updatedWire = addWirePoint(activeWire, x, y);
    setActiveWire(updatedWire);
  }, [activeWire, components, completeWire, addWirePoint, setWires, setActiveWire]);
  
  const handleMouseMove = useCallback((e: KonvaEventObject<MouseEvent>) => {
    if (!activeWire) return;
    
    const stage = e.target.getStage();
    if (!stage) return;
    
    const pointerPos = stage.getPointerPosition();
    if (!pointerPos) return;
    
    lastMousePositionRef.current = { x: pointerPos.x, y: pointerPos.y };
    
    const canvasX = (pointerPos.x - stage.x()) / stage.scaleX();
    const canvasY = (pointerPos.y - stage.y()) / stage.scaleY();
    
    const potentialPin = findPotentialPinConnection(canvasX, canvasY, components, activeWire);
    
    if (potentialPin) {
      potentialTargetRef.current = {
        componentId: potentialPin.componentId,
        pinIndex: potentialPin.pinIndex
      };
      
      const pinPos = getPinAbsolutePosition(components, potentialPin.componentId, potentialPin.pinIndex);
      if (!pinPos) return;
      
      const updatedWire = updateWireEndPoint(activeWire, pinPos.x, pinPos.y);
      setActiveWire(updatedWire);
    } else {
      potentialTargetRef.current = null;
      
      const updatedWire = updateWireEndPoint(activeWire, canvasX, canvasY);
      setActiveWire(updatedWire);
    }
  }, [activeWire, components, updateWireEndPoint, setActiveWire]);
  
  const handleStageMouseUp = useCallback(() => {
    if (activeWire && potentialTargetRef.current) {
      const { componentId, pinIndex } = potentialTargetRef.current;
      
      const pinPos = getPinAbsolutePosition(components, componentId, pinIndex);
      if (!pinPos) return;
      
      const completedWire = completeWire(
        activeWire,
        componentId,
        pinIndex,
        pinPos.x,
        pinPos.y
      );
      
      console.log('Wire completed via mouse up:', completedWire);
      setWires(prev => [...prev, completedWire]);
      setActiveWire(null);
      potentialTargetRef.current = null;
    }
  }, [activeWire, components, completeWire, setWires, setActiveWire]);
  
  const handleKonvaClick = useCallback((e: KonvaEventObject<MouseEvent>) => {
    if (!activeWire) {
      console.log("No active wire, ignoring Konva click");
      return;
    }
    
    const stage = e.target.getStage();
    if (!stage) {
      console.log("No stage found, ignoring Konva click");
      return;
    }
    
    const pointerPos = stage.getPointerPosition();
    if (!pointerPos) {
      console.log("No pointer position found, ignoring Konva click");
      return;
    }
    
    const canvasX = (pointerPos.x - stage.x()) / stage.scaleX();
    const canvasY = (pointerPos.y - stage.y()) / stage.scaleY();
    
    console.log("Konva stage clicked at:", canvasX, canvasY);
    
    const potentialPin = findPotentialPinConnection(canvasX, canvasY, components, activeWire);
    if (potentialPin) {
      if (potentialPin.componentId === activeWire.sourceComponentId && 
          potentialPin.pinIndex === activeWire.sourcePinIndex) {
        console.log('Clicked on source pin, ignoring');
        return;
      }
      
      const pinPos = getPinAbsolutePosition(components, potentialPin.componentId, potentialPin.pinIndex);
      if (!pinPos) return;
      
      const completedWire = completeWire(
        activeWire,
        potentialPin.componentId,
        potentialPin.pinIndex,
        pinPos.x,
        pinPos.y
      );
      
      console.log('Wire completed via Konva click on pin:', completedWire);
      setWires(prev => [...prev, completedWire]);
      setActiveWire(null);
      return;
    }
    
    // This is the key part for adding intermediate points
    const lastPoint = activeWire.points[activeWire.points.length - 1];
    const distance = Math.sqrt(Math.pow(canvasX - lastPoint.x, 2) + Math.pow(canvasY - lastPoint.y, 2));
    
    if (distance >= 10) {
      console.log('Adding intermediate point via Konva click', { canvasX, canvasY });
      const updatedWire = {
        ...activeWire,
        points: [...activeWire.points, { x: canvasX, y: canvasY }]
      };
      
      console.log('Updated wire points via Konva click:', updatedWire.points);
      setActiveWire(updatedWire);
    } else {
      console.log('Points too close, not adding new point');
    }
  }, [activeWire, components, completeWire, setWires, setActiveWire]);

  return {
    potentialTargetRef,
    lastMousePositionRef,
    handlePinClick,
    handleCanvasClick,
    handleMouseMove,
    handleStageMouseUp,
    handleKonvaClick
  };
};
