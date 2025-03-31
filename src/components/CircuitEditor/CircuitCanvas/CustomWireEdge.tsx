
import React, { memo, useState, useCallback } from 'react';
import { CustomWireEdgeProps, WireData } from '@/types/circuit';
import { useReactFlow } from '@xyflow/react';

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
  const [draggingPointIndex, setDraggingPointIndex] = useState<number | null>(null);
  const { setEdges } = useReactFlow();
  
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
  
  const handlePointMouseDown = useCallback((event: React.MouseEvent, index: number) => {
    event.stopPropagation();
    setDraggingPointIndex(index);
  }, []);
  
  const handlePointDrag = useCallback((event: React.MouseEvent<Element, MouseEvent>) => {
    if (draggingPointIndex === null) return;
    
    const reactFlowBounds = document.querySelector('.react-flow')?.getBoundingClientRect();
    if (!reactFlowBounds) return;
    
    const reactFlow = document.querySelector('.react-flow__renderer');
    if (!reactFlow) return;
    
    const reactFlowRect = reactFlow.getBoundingClientRect();
    
    // Get the mouse position relative to the flow container
    const { left, top } = reactFlowRect;
    const mouseX = event.clientX - left;
    const mouseY = event.clientY - top;
    
    setEdges(edges => {
      return edges.map(edge => {
        if (edge.id === id) {
          // Fix: Safely handle the routing points with type checking
          const currentRoutingPoints = edge.data?.routingPoints;
          // Ensure routingPoints is an array before spreading
          const newRoutingPoints = Array.isArray(currentRoutingPoints) 
            ? [...currentRoutingPoints]
            : [];
          
          // Update point if index is valid
          if (draggingPointIndex >= 0 && draggingPointIndex < newRoutingPoints.length) {
            newRoutingPoints[draggingPointIndex] = { x: mouseX, y: mouseY };
          }
          
          return {
            ...edge,
            data: {
              ...edge.data,
              routingPoints: newRoutingPoints
            }
          };
        }
        return edge;
      });
    });
  }, [draggingPointIndex, id, setEdges]);
  
  const handlePointMouseUp = useCallback(() => {
    setDraggingPointIndex(null);
  }, []);
  
  // Add global mouse move and mouse up event listeners when dragging a point
  React.useEffect(() => {
    if (draggingPointIndex !== null) {
      // Properly type the global event handlers
      const handleGlobalMouseMove = (e: MouseEvent) => {
        // Convert the MouseEvent to React.MouseEvent equivalent with type assertion
        const reactEvent = {
          clientX: e.clientX,
          clientY: e.clientY,
          stopPropagation: () => {},
          preventDefault: () => {}
        } as React.MouseEvent<Element, MouseEvent>;
        
        handlePointDrag(reactEvent);
      };
      
      const handleGlobalMouseUp = () => {
        handlePointMouseUp();
      };
      
      window.addEventListener('mousemove', handleGlobalMouseMove);
      window.addEventListener('mouseup', handleGlobalMouseUp);
      
      return () => {
        window.removeEventListener('mousemove', handleGlobalMouseMove);
        window.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [draggingPointIndex, handlePointDrag, handlePointMouseUp]);
  
  // Use cursor position if available (for temporary edges)
  // If sourceX/Y and targetX/Y are the same (temporary edge), we use the cursor position
  const finalTargetX = cursorPosition && (sourceX === targetX) ? cursorPosition.x : targetX;
  const finalTargetY = cursorPosition && (sourceY === targetY) ? cursorPosition.y : targetY;
  
  const path = generatePath(sourceX, sourceY, finalTargetX, finalTargetY, routingPoints, cursorPosition);
  
  // Use pointer-events: none for the temporary edge to prevent it from capturing clicks
  const isTemporary = id.startsWith('temp-wire-');
  const pointerEvents = isTemporary ? 'none' : 'auto';
  
  // Check if edge is being dragged or is selected
  const isActiveOrSelected = draggingPointIndex !== null || selected;
  
  return (
    <>
      <path
        id={id}
        className="react-flow__edge-path custom-wire-path"
        d={path}
        stroke={edgeColor}
        strokeWidth={isActiveOrSelected ? 3 : 2}
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
          r={isActiveOrSelected ? 5 : 3}
          fill={isActiveOrSelected ? edgeColor : 'white'}
          stroke={edgeColor}
          strokeWidth={1.5}
          opacity={isActiveOrSelected ? 1 : 0.5}
          className="routing-point"
          onMouseDown={(e) => handlePointMouseDown(e, index)}
          cursor="move"
          style={{ pointerEvents: 'all' }}
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
