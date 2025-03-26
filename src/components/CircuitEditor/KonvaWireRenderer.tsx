
import React, { useEffect, useRef } from 'react';
import { Layer, Line, Stage } from 'react-konva';
import { Wire } from '@/hooks/useWireSystem';
import { KonvaEventObject } from 'konva/lib/Node';

interface KonvaWireRendererProps {
  wires: Wire[];
  activeWire: Wire | null;
  stageWidth: number;
  stageHeight: number;
  onMouseMove: (e: KonvaEventObject<MouseEvent>) => void;
  onMouseUp: () => void;
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

  return (
    <Stage 
      ref={stageRef}
      width={stageWidth} 
      height={stageHeight}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
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
        {wires.map(wire => {
          const flatPoints = wirePointsToFlatArray(wire);
          const transformedPoints = transformPoints(flatPoints);
          
          return (
            <Line
              key={wire.id}
              points={transformedPoints}
              stroke={wire.color}
              strokeWidth={4} // Increased width for better visibility
              lineCap="round"
              lineJoin="round"
              listening={false}
              opacity={1.0}
            />
          );
        })}
        
        {/* Render active wire being drawn */}
        {activeWire && (
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
        )}
      </Layer>
    </Stage>
  );
};

export default KonvaWireRenderer;
