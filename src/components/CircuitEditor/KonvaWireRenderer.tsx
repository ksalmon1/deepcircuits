
import React, { useEffect, useRef, useState } from 'react';
import { Layer, Line, Stage, Circle, Group } from 'react-konva';
import { Wire } from '@/hooks/useWireSystem';
import { KonvaEventObject } from 'konva/lib/Node';

interface KonvaWireRendererProps {
  wires: Wire[];
  activeWire: Wire | null;
  stageWidth: number;
  stageHeight: number;
  onMouseMove: (e: KonvaEventObject<MouseEvent>) => void;
  onMouseUp: () => void;
  onClick: (e: KonvaEventObject<MouseEvent>) => void;
  zoom?: number;
  offset?: { x: number; y: number };
  onPointMove?: (wireId: string, pointIndex: number, newX: number, newY: number) => void;
}

const KonvaWireRenderer: React.FC<KonvaWireRendererProps> = ({
  wires,
  activeWire,
  stageWidth,
  stageHeight,
  onMouseMove,
  onMouseUp,
  onClick,
  zoom = 1,
  offset = { x: 0, y: 0 },
  onPointMove
}) => {
  const stageRef = useRef<any>(null);
  const [draggingPoint, setDraggingPoint] = useState<{wireId: string, pointIndex: number} | null>(null);
  
  // Convert wire points to flat array for Konva Line
  const wirePointsToFlatArray = (wire: Wire): number[] => {
    return wire.points.flatMap(point => [point.x, point.y]);
  };
  
  // Apply zoom and offset to transform points
  const transformPoints = (points: number[]): number[] => {
    const transformedPoints: number[] = [];
    for (let i = 0; i < points.length; i += 2) {
      transformedPoints.push(points[i] * zoom + offset.x);
      transformedPoints.push(points[i + 1] * zoom + offset.y);
    }
    return transformedPoints;
  };
  
  // Transform a single point
  const transformPoint = (point: { x: number; y: number }): { x: number; y: number } => {
    return {
      x: point.x * zoom + offset.x,
      y: point.y * zoom + offset.y
    };
  };
  
  // Untransform a point (from screen to canvas coordinates)
  const untransformPoint = (point: { x: number; y: number }): { x: number; y: number } => {
    return {
      x: (point.x - offset.x) / zoom,
      y: (point.y - offset.y) / zoom
    };
  };
  
  const handleClick = (e: KonvaEventObject<MouseEvent>) => {
    console.log("KonvaWireRenderer: Stage clicked");
    
    // Make sure the click event is passed to the parent handler
    if (onClick) {
      onClick(e);
    }
  };

  // Log wire information for debugging
  useEffect(() => {
    console.log(`Wire renderer updated: ${wires.length} wires, active wire: ${activeWire ? 'yes' : 'no'}`);
    console.log(`Zoom: ${zoom}, Offset: ${offset.x},${offset.y}`);
    
    if (activeWire) {
      console.log('Active wire points:', activeWire.points);
    }
  }, [wires, activeWire, zoom, offset]);

  // Handle point drag start
  const handlePointDragStart = (wireId: string, pointIndex: number) => {
    setDraggingPoint({ wireId, pointIndex });
  };

  // Handle point drag move
  const handlePointDragMove = (e: KonvaEventObject<DragEvent>) => {
    if (!draggingPoint || !onPointMove) return;
    
    const stage = e.target.getStage();
    if (!stage) return;
    
    const pos = stage.getPointerPosition();
    if (!pos) return;
    
    // Convert from screen coordinates to canvas coordinates
    const canvasPos = untransformPoint({ x: pos.x, y: pos.y });
    
    // Report the point move to the parent component
    onPointMove(draggingPoint.wireId, draggingPoint.pointIndex, canvasPos.x, canvasPos.y);
  };

  // Handle point drag end
  const handlePointDragEnd = () => {
    setDraggingPoint(null);
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
        pointerEvents: activeWire || draggingPoint ? 'auto' : 'none',
        zIndex: 20 // Higher z-index to ensure wires are visible above other elements but below pin tooltips
      }}
    >
      <Layer>
        {/* Render completed wires */}
        {wires.map((wire, wireIndex) => (
          <Group key={`wire-group-${wire.id}-${wireIndex}`}>
            <Line
              key={`wire-line-${wire.id}-${wireIndex}`}
              points={transformPoints(wirePointsToFlatArray(wire))}
              stroke={wire.color}
              strokeWidth={4} // Increased width for better visibility
              lineCap="round"
              lineJoin="round"
              listening={false}
              opacity={1.0}
            />
            {/* Render wire points for each wire */}
            {wire.points.map((point, pointIndex) => {
              // Skip rendering points for the first and last points of completed wires
              if (wire.isComplete && (pointIndex === 0 || pointIndex === wire.points.length - 1)) {
                return null;
              }
              
              const transformedPoint = transformPoint(point);
              
              // Determine if this point can be dragged (not first or last point of completed wire)
              const canDrag = wire.isComplete ? (pointIndex !== 0 && pointIndex !== wire.points.length - 1) : false;
              
              return (
                <Circle
                  key={`wire-${wire.id}-point-${pointIndex}-${wireIndex}`}
                  x={transformedPoint.x}
                  y={transformedPoint.y}
                  radius={5}
                  fill={wire.color}
                  stroke="#fff"
                  strokeWidth={1}
                  opacity={1}
                  listening={canDrag}
                  draggable={canDrag}
                  onDragStart={() => handlePointDragStart(wire.id, pointIndex)}
                  onDragMove={handlePointDragMove}
                  onDragEnd={handlePointDragEnd}
                />
              );
            })}
          </Group>
        ))}
        
        {/* Render active wire being drawn */}
        {activeWire && (
          <Group key={`active-wire-group-${activeWire.id}`}>
            <Line
              key={`active-wire-line-${activeWire.id}`}
              points={transformPoints(wirePointsToFlatArray(activeWire))}
              stroke={activeWire.color}
              strokeWidth={4} // Increased width for better visibility
              lineCap="round"
              lineJoin="round"
              dash={[6, 3]} // More visible dashed line for the wire being drawn
              listening={false}
              opacity={0.8}
            />
            {/* Render active wire points */}
            {activeWire.points.map((point, pointIndex) => {
              // Skip rendering the last point for active wire (follows the mouse)
              if (pointIndex === activeWire.points.length - 1) {
                return null;
              }
              
              const transformedPoint = transformPoint(point);
              
              return (
                <Circle
                  key={`active-wire-${activeWire.id}-point-${pointIndex}`}
                  x={transformedPoint.x}
                  y={transformedPoint.y}
                  radius={5}
                  fill={activeWire.color}
                  stroke="#fff"
                  strokeWidth={1}
                  opacity={0.8}
                  listening={false}
                  draggable={false}
                />
              );
            })}
          </Group>
        )}
      </Layer>
    </Stage>
  );
};

export default KonvaWireRenderer;
