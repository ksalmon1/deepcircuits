
import React, { useRef } from 'react';
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
  offset = { x: 0, y: 0 }
}) => {
  const stageRef = useRef<any>(null);
  
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
  
  // Handle direct click on the stage
  const handleClick = (e: KonvaEventObject<MouseEvent>) => {
    console.log("KonvaWireRenderer: Stage clicked");
    
    if (onClick) {
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
        {wires.map((wire) => {
          const wireKey = `wire-${wire.id}`;
          return (
            <Group key={wireKey}>
              <Line
                key={`${wireKey}-line`}
                points={transformPoints(wirePointsToFlatArray(wire))}
                stroke={wire.color}
                strokeWidth={4}
                lineCap="round"
                lineJoin="round"
                listening={false}
                opacity={1.0}
              />
            </Group>
          );
        })}
        
        {/* Render active wire being drawn */}
        {activeWire && (
          <Group key={`active-wire-${activeWire.id}`}>
            <Line
              key={`active-wire-line-${activeWire.id}`}
              points={transformPoints(wirePointsToFlatArray(activeWire))}
              stroke={activeWire.color}
              strokeWidth={4}
              lineCap="round"
              lineJoin="round"
              dash={[6, 3]}
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
