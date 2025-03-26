
import React from 'react';
import { Line } from 'react-konva';
import { Wire } from '@/hooks/useWireState';

interface WirePathProps {
  wire: Wire;
  points: number[];
  zoom: number;
  offset: { x: number; y: number };
  isActive?: boolean;
}

const WirePath: React.FC<WirePathProps> = ({
  wire,
  points,
  zoom,
  offset,
  isActive = false
}) => {
  // Apply zoom and offset to transform points
  const transformedPoints: number[] = [];
  for (let i = 0; i < points.length; i += 2) {
    transformedPoints.push(points[i] * zoom + offset.x);
    transformedPoints.push(points[i + 1] * zoom + offset.y);
  }

  return (
    <Line
      points={transformedPoints}
      stroke={wire.color}
      strokeWidth={4}
      lineCap="round"
      lineJoin="round"
      listening={false}
      opacity={isActive ? 0.8 : 1.0}
      dash={isActive ? [6, 3] : undefined}
    />
  );
};

export default WirePath;
