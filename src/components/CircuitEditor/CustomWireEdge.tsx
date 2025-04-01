import React, { memo } from 'react';
import { BaseEdge, getBezierPath } from '@xyflow/react';
import { WireData, CustomWireEdgeProps } from '@/types/circuit';

const CustomWireEdge: React.FC<CustomWireEdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  data, // Contains color, signal type etc.
  markerEnd,
  selected,
}) => {
  // Calculate the path using a Bezier curve
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  // Determine the stroke color from data, fallback to a default
  const strokeColor = data?.color || '#9b87f5'; // Use color from data, default purple
  const strokeWidth = selected ? 3 : 2; // Make selected edges slightly thicker

  // Check if the edge should be animated (e.g., for clock/data signals)
  const isAnimated = data?.signal === 'clock' || data?.signal === 'data';

  return (
    <>
      {/* The visible edge path */}
      <BaseEdge 
        id={id} 
        path={edgePath} 
        markerEnd={markerEnd} 
        style={{ 
          ...style, // Spread incoming styles
          stroke: strokeColor,
          strokeWidth: strokeWidth,
          // Add animation styles if needed
          animation: isAnimated ? 'dashdraw 0.5s linear infinite' : undefined,
          strokeDasharray: isAnimated ? 5 : undefined,
        }}
      />
      {/* 
        Optional: Add an invisible wider path for easier interaction (hover/click)
        <path
          d={edgePath}
          fill="none"
          strokeOpacity={0}
          strokeWidth={10} // Make it wider for interaction
          className="react-flow__edge-interaction"
        /> 
      */}
    </>
  );
};

export default memo(CustomWireEdge); 