
import React, { useEffect, useRef } from 'react';
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
  onClick: (e: KonvaEventObject<MouseEvent>) => void; // Make onClick required
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
  
  // Log wire information for debugging
  useEffect(() => {
    console.log(`Wire renderer updated: ${wires.length} wires, active wire: ${activeWire ? 'yes' : 'no'}`);
    console.log(`Zoom: ${zoom}, Offset: ${offset.x},${offset.y}`);
    
    if (activeWire) {
      console.log('Active wire points:', activeWire.points);
    }
  }, [wires, activeWire, zoom, offset]);

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
        <Circle
          key={`wire-${wire.id}-point-${index}`}
          x={x}
          y={y}
          radius={5}
          fill={wire.color}
          stroke="#fff"
          strokeWidth={1}
          opacity={isActive ? 0.8 : 1}
          listening={false}
        />
      );
    });
  };

  return (
    <Stage 
      ref={stageRef}
      width={stageWidth} 
      height={stageHeight}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onClick={onClick} // Ensure onClick is connected
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
            <Line
              points={transformPoints(wirePointsToFlatArray(wire))}
              stroke={wire.color}
              strokeWidth={4} // Increased width for better visibility
              lineCap="round"
              lineJoin="round"
              listening={false}
              opacity={1.0}
            />
            {renderWirePoints(wire)}
          </Group>
        ))}
        
        {/* Render active wire being drawn */}
        {activeWire && (
          <Group>
            <Line
              points={transformPoints(wirePointsToFlatArray(activeWire))}
              stroke={activeWire.color}
              strokeWidth={4} // Increased width for better visibility
              lineCap="round"
              lineJoin="round"
              dash={[6, 3]} // More visible dashed line for the wire being drawn
              listening={false}
              opacity={0.8}
            />
            {renderWirePoints(activeWire, true)}
          </Group>
        )}
      </Layer>
    </Stage>
  );
};

export default KonvaWireRenderer;
