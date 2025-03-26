
import React from 'react';
import { Circle } from 'react-konva';

interface WirePointProps {
  x: number;
  y: number;
  color: string;
  radius?: number;
  isActive?: boolean;
  onClick?: () => void;
}

const WirePoint: React.FC<WirePointProps> = ({
  x,
  y,
  color,
  radius = 5,
  isActive = false,
  onClick
}) => {
  return (
    <Circle
      x={x}
      y={y}
      radius={radius}
      fill={color}
      stroke="#fff"
      strokeWidth={1}
      opacity={isActive ? 0.8 : 1}
      listening={Boolean(onClick)}
      onClick={onClick}
    />
  );
};

export default WirePoint;
