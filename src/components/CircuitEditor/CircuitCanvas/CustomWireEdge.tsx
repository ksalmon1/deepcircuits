
import React, { memo } from 'react';
import { Edge, EdgeProps, getStraightPath, getSmoothStepPath, getBezierPath } from '@xyflow/react';
import { WireData, CustomWireEdgeProps } from '@/types/circuit';

const generatePath = (
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  routingPoints: Array<{ x: number, y: number }> = []
): string => {
  // Start path at source
  let path = `M ${sourceX},${sourceY}`;
  
  // Add each routing point as a line segment
  routingPoints.forEach(point => {
    path += ` L ${point.x},${point.y}`;
  });
  
  // End path at target
  path += ` L ${targetX},${targetY}`;
  
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
  
  const handleEdgeClick = (event: React.MouseEvent) => {
    if (event.detail === 2 && onDelete) { // Double click to delete
      onDelete(id);
    }
  };
  
  const path = generatePath(sourceX, sourceY, targetX, targetY, routingPoints);
  
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
    </>
  );
}

// Use React.memo and ensure it's exported as a React component
export default memo(CustomWireEdge);
