
import React from 'react';
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
}

const KonvaWireRenderer: React.FC<KonvaWireRendererProps> = ({
  wires,
  activeWire,
  stageWidth,
  stageHeight,
  onMouseMove,
  onMouseUp
}) => {
  // Convert wire points to flat array for Konva Line
  const wirePointsToFlatArray = (wire: Wire): number[] => {
    return wire.points.flatMap(point => [point.x, point.y]);
  };

  return (
    <Stage 
      width={stageWidth} 
      height={stageHeight}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      style={{ 
        position: 'absolute', 
        top: 0, 
        left: 0, 
        pointerEvents: 'none',
        zIndex: 5 // Ensure wires render above the grid but below UI elements
      }}
    >
      <Layer>
        {/* Render completed wires */}
        {wires.map(wire => (
          <Line
            key={wire.id}
            points={wirePointsToFlatArray(wire)}
            stroke={wire.color}
            strokeWidth={2}
            lineCap="round"
            lineJoin="round"
            listening={false} // Improve performance by disabling event listening
          />
        ))}
        
        {/* Render active wire being drawn */}
        {activeWire && (
          <Line
            points={wirePointsToFlatArray(activeWire)}
            stroke={activeWire.color}
            strokeWidth={2}
            lineCap="round"
            lineJoin="round"
            dash={[4, 2]} // Dashed line for active wire
            listening={false} // Improve performance by disabling event listening
          />
        )}
      </Layer>
    </Stage>
  );
};

export default KonvaWireRenderer;
