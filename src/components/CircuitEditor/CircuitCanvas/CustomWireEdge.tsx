import React, { memo } from 'react';
import { CustomWireEdgeProps, WireData } from '@/types/circuit';

const generatePath = (
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  routingPoints: Array<{ x: number, y: number }> = [],
  cursorPosition?: { x: number, y: number }
): string => {
  // Start path at source
  let path = `M ${sourceX},${sourceY}`;
  
  // Add each routing point as a line segment
  routingPoints.forEach(point => {
    path += ` L ${point.x},${point.y}`;
  });
  
  // If we're in connecting mode and have a cursor position, use that as the final point
  // Otherwise use the target coordinates
  if (cursorPosition) {
    path += ` L ${cursorPosition.x},${cursorPosition.y}`;
  } else {
    path += ` L ${targetX},${targetY}`;
  }
  
  return path;
};

function CustomWireEdge({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  data,
  selected,
  onDelete
}: CustomWireEdgeProps) {
  const routingPoints = data?.routingPoints || [];
  const edgeColor = data?.color || '#9b87f5';
  const cursorPosition = data?.cursorPosition;
  
  const handleEdgeClick = (event: React.MouseEvent) => {
    if (event.detail === 2 && onDelete) { // Double click to delete
      onDelete(id);
    }
  };
  
  const path = generatePath(sourceX, sourceY, targetX, targetY, routingPoints, cursorPosition);
  
  return (
    <>
      <path
        id={id}
        className="react-flow__edge-path custom-wire-path"
        d={path}
        stroke={edgeColor}
        strokeWidth={selected ? 3 : 2}
        fill="none"
        onClick={handleEdgeClick}
      />
      
      {/* Render routing points as circles */}
      {routingPoints.map((point, index) => (
        <circle
          key={`${id}-point-${index}`}
          cx={point.x}
          cy={point.y}
          r={4}
          fill={edgeColor}
          stroke="#ffffff"
          strokeWidth={1}
          className="routing-point"
        />
      ))}
      
      {/* Render cursor point if in connecting mode */}
      {cursorPosition && (
        <circle
          cx={cursorPosition.x}
          cy={cursorPosition.y}
          r={5}
          fill={edgeColor}
          stroke="#ffffff"
          strokeWidth={1.5}
          className="cursor-point"
          style={{ opacity: 0.7 }}
        />
      )}
    </>
  );
}

export default memo(CustomWireEdge);
