
import { useCallback } from 'react';
import { WokwiComponent } from '@/integrations/wokwi/WokwiIntegration';
import { useWireState, Wire } from './useWireState';
import { useWireInteractions } from './useWireInteractions';
import { useWireRendering } from './useWireRendering';

export type { Wire, WirePoint } from './useWireState';

export const useWireSystem = (components: WokwiComponent[]) => {
  const {
    wires,
    setWires,
    activeWire,
    setActiveWire,
    startWire,
    updateWireEndPoint,
    addWirePoint,
    completeWire,
    cancelActiveWire
  } = useWireState(components);
  
  const {
    potentialTargetRef,
    lastMousePositionRef,
    handlePinClick,
    handleCanvasClick,
    handleMouseMove,
    handleStageMouseUp,
    handleKonvaClick
  } = useWireInteractions(
    components,
    activeWire,
    setActiveWire,
    setWires,
    completeWire,
    updateWireEndPoint,
    addWirePoint
  );
  
  useWireRendering(components, wires, setWires);
  
  return {
    // Wire state
    wires,
    setWires,
    activeWire,
    
    // Wire actions
    handlePinClick,
    handleCanvasClick,
    handleMouseMove,
    handleStageMouseUp,
    handleKonvaClick,
    cancelActiveWire,
    
    // References
    potentialTarget: potentialTargetRef.current,
    potentialTargetRef
  };
};
