import React, { memo, useEffect } from 'react';
import { EdgeProps, Position, EdgeLabelRenderer, useReactFlow, ConnectionLineComponentProps } from '@xyflow/react';
import { getWireColorFromSignal } from '@/utils/wireUtils';
import SparkCursorEffect from './SparkCursorEffect'; // Import the spark effect
import { useCircuitEditor } from '@/context/CircuitEditorContext'; // Import context hook

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
  // Get setter from context
  const { setConnectionLineEnd } = useCircuitEditor();

  // Update context with the current end position
  useEffect(() => {
    if (setConnectionLineEnd) {
      setConnectionLineEnd({ x: toX, y: toY });
    }
    // Cleanup on unmount
    return () => {
      if (setConnectionLineEnd) {
        setConnectionLineEnd(null);
      }
    };
  }, [toX, toY, setConnectionLineEnd]);

  // Log received props for connection line
  console.log('ManhattanConnectionLine Render:', { fromX, fromY, toX, toY });
  
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
    // Only return the path now
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

// Basic Custom Edge Component (Temporary Reset)
const CustomWireEdge: React.FC<EdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition = Position.Right,
  targetPosition = Position.Left,
  style = {},
  data,
  selected,
}) => {
  // --- Log received props --- 
  /*
  console.log(`CustomWireEdge Render [${id}]:`, { 
    sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition 
  });
  */
  // --------------------------
  
  const { deleteElements } = useReactFlow();

  // Calculate the path using the new Manhattan helper
  const edgePath = getManhattanPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  // Determine wire color from data if available
  const signal = typeof data?.signal === 'string' ? data.signal : ''; // Ensure signal is a string
  const wireColor = signal ? getWireColorFromSignal(signal) : (style.stroke || '#555'); // Pass guaranteed string
  const strokeWidth = selected ? 3 : (style.strokeWidth as number || 2);

  // Double-click handler to delete the edge
  const handleDoubleClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    console.log("Edge double clicked, deleting:", id);
    deleteElements({ edges: [{ id }] });
  };

  return (
    <>
      <path
        id={id}
        style={{ ...style, stroke: wireColor, strokeWidth }}
        className="react-flow__edge-path"
        d={edgePath}
        onDoubleClick={handleDoubleClick} // Add delete handler
      />
      {/* Optional: Add EdgeLabelRenderer here if needed */}
    </>
  );
};

export default memo(CustomWireEdge);
