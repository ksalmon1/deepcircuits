import React, { memo } from 'react';
import { EdgeProps, Position, EdgeLabelRenderer, useReactFlow, ConnectionLineComponentProps } from '@xyflow/react';
import { getWireColorFromSignal } from '@/utils/wireUtils';

/**
 * Calculates an SVG path string for a Manhattan-style edge.
 */
const getManhattanPath = ({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition = Position.Right,
  targetPosition = Position.Left,
}: {
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  sourcePosition?: Position;
  targetPosition?: Position;
}): string => {
  // --- Add safety checks for coordinates ---
  const sX = typeof sourceX === 'number' && !isNaN(sourceX) ? sourceX : 0;
  const sY = typeof sourceY === 'number' && !isNaN(sourceY) ? sourceY : 0;
  const tX = typeof targetX === 'number' && !isNaN(targetX) ? targetX : 0;
  const tY = typeof targetY === 'number' && !isNaN(targetY) ? targetY : 0;
  // ---------------------------------------
  
  let path = ''; // Initialize path string
  
  const dx = Math.abs(tX - sX);
  const dy = Math.abs(tY - sY);

  // Determine the middle point for the main bend
  let midX: number, midY: number;

  // Simplified strategy: prioritize horizontal or vertical segment first based on source position
  // This creates a basic 2-segment or 3-segment path
  switch (sourcePosition) {
    case Position.Left:
    case Position.Right:
      // Horizontal first
      midX = sX + (tX - sX) / 2;
      midY = sY;
      path = `M ${Number(sX)},${Number(sY)} H ${Number(midX)} V ${Number(tY)} H ${Number(tX)}`;
      break;
    case Position.Top:
    case Position.Bottom:
      // Vertical first
      midX = sX;
      midY = sY + (tY - sY) / 2;
      path = `M ${Number(sX)},${Number(sY)} V ${Number(midY)} H ${Number(tX)} V ${Number(tY)}`;
      break;
    default:
      // Fallback for unexpected positions (straight line)
      path = `M ${Number(sX)},${Number(sY)} L ${Number(tX)},${Number(tY)}`;
      break;
  }
  
  // --- Add Logging ---
  /*
  console.log('getManhattanPath called with:', {
      sourceX, sourceY, targetX, targetY, sX, sY, tX, tY, sourcePosition, targetPosition
  });
  console.log('Generated path:', String(path));
  */
  // -------------------
  
  return String(path);
};

// --- Dedicated Connection Line Component ---
export const ManhattanConnectionLine: React.FC<ConnectionLineComponentProps> = ({
  fromX,
  fromY,
  toX,
  toY,
  fromHandle // We can use fromHandle?.position later if needed
}) => {
  // Log received props for connection line
  // console.log('ManhattanConnectionLine Render:', { fromX, fromY, toX, toY });
  
  const path = getManhattanPath({
    sourceX: fromX, // Use fromX/fromY as source
    sourceY: fromY,
    targetX: toX,   // Use toX/toY as target
    targetY: toY,
    // Positions might need adjustment based on fromHandle if available
    sourcePosition: fromHandle?.position, 
    // Target position is unknown during drag, let default handle it
  });

  // Determine color based on source handle if possible (simplified for now)
  const wireColor = '#888'; // Default connection line color

  return (
    <path
      fill="none"
      stroke={wireColor}
      strokeWidth={2}
      className="react-flow__connection-line"
      d={path}
    />
  );
};
// -----------------------------------------

// Basic Custom Edge Component
const CustomWireEdge: React.FC<EdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition = Position.Right,
  targetPosition = Position.Left,
  style = {}, // Keep incoming style
  data,
  selected,
}) => {
  // --- Log received props --- 
  // console.log(`CustomWireEdge Render [${id}]:`, { 
  //   sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data, selected 
  // });
  // --------------------------
  
  const { deleteElements } = useReactFlow();

  // Calculate the path as a straight line
  const edgePath = `M ${sourceX},${sourceY} L ${targetX},${targetY}`;

  /* // Remove Manhattan path calculation - COMMENTED OUT
  const edgePath = getManhattanPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });
  */

  // --- Robust Style Calculation (Keep this for color) --- 
  // Determine base properties
  const signal = typeof data?.signal === 'string' ? data.signal : '';
  const baseColor = signal ? getWireColorFromSignal(signal) : '#555'; // Default color
  const baseStrokeWidth = 2;

  // Determine final style, prioritizing selection and specific calculations
  const finalStyle: React.CSSProperties = {
    // Start with incoming style, but filter out stroke/strokeWidth to avoid override
    ...Object.fromEntries(Object.entries(style).filter(([key]) => key !== 'stroke' && key !== 'strokeWidth')),
    // Use baseColor derived from signal
    stroke: baseColor,
    strokeWidth: selected ? 3 : baseStrokeWidth, // Use base width, override if selected
    fill: 'none', // Ensure fill is none
  };
  // --- End Robust Style Calculation --- 

  // Double-click handler to delete the edge
  const handleDoubleClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    //console.log("Edge double clicked, deleting:", id);
    deleteElements({ edges: [{ id }] });
  };

  return (
    <>
      <path
        id={id}
        // Apply the explicitly calculated finalStyle
        style={finalStyle}
        className="react-flow__edge-path"
        d={edgePath}
        onDoubleClick={handleDoubleClick}
      />
      {/* Optional: Add EdgeLabelRenderer here if needed */}
    </>
  );
};

export default memo(CustomWireEdge);
