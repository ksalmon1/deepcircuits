
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
  
  // Apply zoom and offset when they change
  useEffect(() => {
    if (stageRef.current) {
      // No need to transform the stage - we'll let the parent handle that
      // This component just needs to match the parent's dimensions
      console.log(`Wire renderer: zoom=${zoom}, offset=${offset.x},${offset.y}`);
    }
  }, [zoom, offset]);

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
        pointerEvents: 'none',
        zIndex: 10 // Increased z-index to ensure wires are visible
      }}
    >
      <Layer>
        {/* Render completed wires */}
        {wires.map(wire => (
          <Line
            key={wire.id}
            points={wirePointsToFlatArray(wire)}
            stroke={wire.color}
            strokeWidth={3} // Increased width for better visibility
            lineCap="round"
            lineJoin="round"
            listening={false}
          />
        ))}
        
        {/* Render active wire being drawn */}
        {activeWire && (
          <Line
            points={wirePointsToFlatArray(activeWire)}
            stroke={activeWire.color}
            strokeWidth={3} // Increased width for better visibility
            lineCap="round"
            lineJoin="round"
            dash={[5, 2]} // More visible dashed line
            listening={false}
          />
        )}
      </Layer>
    </Stage>
  );
};

export default KonvaWireRenderer;
