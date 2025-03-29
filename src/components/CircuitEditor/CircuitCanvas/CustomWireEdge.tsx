
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
    // Only handle double-clicks for deletion
    if (event.detail === 2 && onDelete) {
      event.stopPropagation(); // Stop propagation to prevent canvas click
      onDelete(id);
    }
  };
  
  const path = generatePath(sourceX, sourceY, targetX, targetY, routingPoints, cursorPosition);
  
  // Use pointer-events: none for the temporary edge to prevent it from capturing clicks
  const isTemporary = id.startsWith('temp-wire-');
  const pointerEvents = isTemporary ? 'none' : 'auto';
  
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
        style={{ pointerEvents }}
      />
      
      {/* Only show routing points for permanent wires */}
      {!isTemporary && routingPoints.map((point, index) => (
        <circle
          key={`${id}-point-${index}`}
          cx={point.x}
          cy={point.y}
          r={3}
          fill={selected ? edgeColor : 'white'}
          stroke={edgeColor}
          strokeWidth={1}
          opacity={selected ? 0.8 : 0.5}
          className="routing-point"
          pointerEvents="none" // Make routing points non-interactive
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
          style={{ opacity: 0.7, pointerEvents: 'none' }}
        />
      )}
    </>
  );
}

export default memo(CustomWireEdge);
