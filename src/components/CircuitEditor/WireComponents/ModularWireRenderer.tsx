
import React, { useEffect, useRef } from 'react';
import { Layer, Stage, Group } from 'react-konva';
import { KonvaEventObject } from 'konva/lib/Node';
import { Wire } from '@/hooks/useWireState';
import WirePath from './WirePath';
import WirePoint from './WirePoint';

interface ModularWireRendererProps {
  wires: Wire[];
  activeWire: Wire | null;
  stageWidth: number;
  stageHeight: number;
  onMouseMove: (e: KonvaEventObject<MouseEvent>) => void;
  onMouseUp: () => void;
  onClick: (e: KonvaEventObject<MouseEvent>) => void;
  zoom?: number;
  offset?: { x: number; y: number };
}

const ModularWireRenderer: React.FC<ModularWireRendererProps> = ({
  wires,
  activeWire,
  stageWidth,
  stageHeight,
  onMouseMove,
  onMouseUp,
  onClick,
  zoom = 1,
  offset = { x: 0, y: 0 }
}) => {
  const stageRef = useRef<any>(null);
  
  // Convert wire points to flat array for Konva Line
  const wirePointsToFlatArray = (wire: Wire): number[] => {
    return wire.points.flatMap(point => [point.x, point.y]);
  };

  // Log wire information for debugging
  useEffect(() => {
    console.log(`ModularWireRenderer updated: ${wires.length} wires, active wire: ${activeWire ? 'yes' : 'no'}`);
    
    if (activeWire) {
      console.log('Active wire points:', activeWire.points);
    }
  }, [wires, activeWire]);

  // Render dots for intermediate wire points
  const renderWirePoints = (wire: Wire, isActive: boolean = false) => {
    if (wire.points.length <= 2) return null; // No intermediate points

    return wire.points.map((point, index) => {
      // Skip first and last points (those are on pins)
      if (isActive && index === wire.points.length - 1) return null;
      if (!isActive && (index === 0 || index === wire.points.length - 1)) return null;
      
      const x = point.x * zoom + offset.x;
      const y = point.y * zoom + offset.y;
      
      return (
        <WirePoint 
          key={`wire-${wire.id}-point-${index}`}
          x={x}
          y={y}
          color={wire.color}
          isActive={isActive}
        />
      );
    });
  };

  const handleClick = (e: KonvaEventObject<MouseEvent>) => {
    console.log("ModularWireRenderer: Stage clicked");
    if (onClick) {
      // Ensure we're correctly passing the event to the parent handler
      const stage = e.target.getStage();
      if (stage) {
        const pointerPos = stage.getPointerPosition();
        if (pointerPos) {
          console.log("Click position:", pointerPos);
        }
      }
      onClick(e);
    }
  };

  return (
    <Stage 
      ref={stageRef}
      width={stageWidth} 
      height={stageHeight}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onClick={handleClick}
      style={{ 
        position: 'absolute', 
        top: 0, 
        left: 0, 
        pointerEvents: activeWire ? 'auto' : 'none',
        zIndex: 20 // Higher z-index to ensure wires are visible above other elements but below pin tooltips
      }}
    >
      <Layer>
        {/* Render completed wires */}
        {wires.map(wire => (
          <Group key={wire.id}>
            <WirePath 
              wire={wire}
              points={wirePointsToFlatArray(wire)}
              zoom={zoom}
              offset={offset}
            />
            {renderWirePoints(wire)}
          </Group>
        ))}
        
        {/* Render active wire being drawn */}
        {activeWire && (
          <Group>
            <WirePath 
              wire={activeWire}
              points={wirePointsToFlatArray(activeWire)}
              zoom={zoom}
              offset={offset}
              isActive={true}
            />
            {renderWirePoints(activeWire, true)}
          </Group>
        )}
      </Layer>
    </Stage>
  );
};

export default ModularWireRenderer;
