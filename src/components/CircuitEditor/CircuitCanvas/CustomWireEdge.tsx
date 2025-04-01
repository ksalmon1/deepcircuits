
import React, { memo, useState, useCallback } from 'react';
import { CustomWireEdgeProps, WireData } from '@/types/circuit';
import { useReactFlow, ConnectionLineComponentProps } from '@xyflow/react';

/**
 * Generates an orthogonal path with only horizontal and vertical segments
 * connecting the source, routing points, and target
 */
const generateOrthogonalPath = (
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  routingPoints: Array<{ x: number, y: number }> = [],
  cursorPosition?: { x: number, y: number }
): string => {
  const safeSourceX = isNaN(sourceX) ? 0 : sourceX;
  const safeSourceY = isNaN(sourceY) ? 0 : sourceY;
  const safeTargetX = isNaN(targetX) ? 0 : targetX;
  const safeTargetY = isNaN(targetY) ? 0 : targetY;
  
  // Create an array of fixed points (source + routing points)
  const fixedPoints = [{ x: safeSourceX, y: safeSourceY }];
  
  // Add all routing points
  if (Array.isArray(routingPoints)) {
    routingPoints.forEach(point => {
      const x = isNaN(point.x) ? 0 : point.x;
      const y = isNaN(point.y) ? 0 : point.y;
      fixedPoints.push({ x, y });
    });
  }
  
  // Determine the final endpoint (cursor or target)
  const finalEndPoint = cursorPosition && typeof cursorPosition === 'object'
    ? { 
        x: isNaN(cursorPosition.x) ? 0 : cursorPosition.x,
        y: isNaN(cursorPosition.y) ? 0 : cursorPosition.y 
      }
    : { x: safeTargetX, y: safeTargetY };
  
  // Start the path at the first point
  let path = `M ${fixedPoints[0].x},${fixedPoints[0].y}`;
  
  // Generate orthogonal segments between fixed points only
  for (let i = 0; i < fixedPoints.length - 1; i++) {
    const current = fixedPoints[i];
    const next = fixedPoints[i + 1];
    
    // Create an L-shaped route between current and next points
    // For odd-numbered segments, go horizontal first, then vertical
    // For even-numbered segments, go vertical first, then horizontal
    if (i % 2 === 0) {
      // Horizontal first, then vertical
      path += ` L ${next.x},${current.y}`; // Horizontal segment
      path += ` L ${next.x},${next.y}`;    // Vertical segment
    } else {
      // Vertical first, then horizontal
      path += ` L ${current.x},${next.y}`; // Vertical segment
      path += ` L ${next.x},${next.y}`;    // Horizontal segment
    }
  }
  
  // Handle the final segment to the cursor/target separately
  // This ensures smooth cursor tracking without visual glitches
  const lastFixedPoint = fixedPoints[fixedPoints.length - 1];
  
  // Only add the final segment if it's different from the last fixed point
  if (lastFixedPoint.x !== finalEndPoint.x || lastFixedPoint.y !== finalEndPoint.y) {
    // Always draw horizontal line first, then vertical for consistent cursor tracking
    path += ` L ${finalEndPoint.x},${lastFixedPoint.y}`; // Horizontal segment to cursor/target x
    path += ` L ${finalEndPoint.x},${finalEndPoint.y}`;  // Vertical segment to cursor/target y
  }
  
  return path;
};

// Define a unified component that can work as both an edge and a connection line
function CustomWireEdge(props: CustomWireEdgeProps | ConnectionLineComponentProps) {
  // Determine if this is a connection line (during dragging) or a regular edge
  const isConnectionLine = 'fromNode' in props || !('id' in props) || props.id === 'connection-line';
  
  // Extract relevant props based on the component usage
  const {
    sourceX = 0,
    sourceY = 0,
    targetX = 0,
    targetY = 0,
    sourcePosition,
    targetPosition,
    style = {},
  } = props;
  
  // For regular edge functionality (not connection line)
  const [draggingPointIndex, setDraggingPointIndex] = useState<number | null>(null);
  const { setEdges } = useReactFlow();
  
  // Handle regular edge props if this is not a connection line
  let id: string = 'connection-line';
  let data: WireData | undefined;
  let selected: boolean = false;
  let onDelete: ((id: string) => void) | undefined;
  let source: string = '';
  let target: string = '';
  
  if (!isConnectionLine && 'id' in props) {
    id = props.id;
    data = (props as CustomWireEdgeProps).data;
    selected = (props as CustomWireEdgeProps).selected || false;
    onDelete = (props as CustomWireEdgeProps).onDelete;
    source = (props as CustomWireEdgeProps).source || '';
    target = (props as CustomWireEdgeProps).target || '';
  }
  
  // Extract routing points from data, if available
  const routingPoints = data?.routingPoints || [];
  const cursorPosition = data?.cursorPosition;
  
  // Only attach edge click handler if we have an onDelete function
  const handleEdgeClick = onDelete ? (event: React.MouseEvent) => {
    if (event.detail === 2) {
      event.stopPropagation();
      onDelete(id);
    }
  } : undefined;
  
  const handlePointMouseDown = useCallback((event: React.MouseEvent, index: number) => {
    event.stopPropagation();
    setDraggingPointIndex(index);
  }, []);
  
  const handlePointDrag = useCallback((event: React.MouseEvent<Element, MouseEvent>) => {
    if (draggingPointIndex === null || !id) return;
    
    const reactFlowBounds = document.querySelector('.react-flow')?.getBoundingClientRect();
    if (!reactFlowBounds) return;
    
    const reactFlow = document.querySelector('.react-flow__renderer');
    if (!reactFlow) return;
    
    const reactFlowRect = reactFlow.getBoundingClientRect();
    
    const { left, top } = reactFlowRect;
    const mouseX = event.clientX - left;
    const mouseY = event.clientY - top;
    
    // Only update edges if this is a regular edge (not a connection line)
    if (id !== 'connection-line') {
      setEdges(edges => {
        return edges.map(edge => {
          if (edge.id === id) {
            const currentRoutingPoints = edge.data?.routingPoints;
            const newRoutingPoints = Array.isArray(currentRoutingPoints) 
              ? [...currentRoutingPoints]
              : [];
            
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
    }
  }, [draggingPointIndex, id, setEdges]);
  
  const handlePointMouseUp = useCallback(() => {
    setDraggingPointIndex(null);
  }, []);
  
  React.useEffect(() => {
    if (draggingPointIndex !== null) {
      const handleGlobalMouseMove = (e: MouseEvent) => {
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
  
  const safeSourceX = isNaN(sourceX) ? 0 : sourceX;
  const safeSourceY = isNaN(sourceY) ? 0 : sourceY;
  const safeTargetX = isNaN(targetX) ? 0 : targetX;
  const safeTargetY = isNaN(targetY) ? 0 : targetY;
  
  const finalTargetX = cursorPosition && (safeSourceX === safeTargetX) ? cursorPosition.x : safeTargetX;
  const finalTargetY = cursorPosition && (safeSourceY === safeTargetY) ? cursorPosition.y : safeTargetY;
  
  // Use orthogonal path generation
  const path = generateOrthogonalPath(
    safeSourceX, 
    safeSourceY, 
    finalTargetX, 
    finalTargetY, 
    routingPoints, 
    cursorPosition
  );
  
  // Determine if this is a temporary connection line or a permanent edge
  const isTemporary = isConnectionLine || (id && id.startsWith('temp-wire-'));
  const pointerEvents = isTemporary ? 'none' : 'auto';
  
  const isActiveOrSelected = draggingPointIndex !== null || selected;
  
  // Apply the stroke width based on selection state
  const strokeWidth = isActiveOrSelected ? 3 : (style.strokeWidth || 2);
  
  return (
    <>
      <path
        id={id}
        className={`react-flow__edge-path custom-wire-path ${isConnectionLine ? 'connection-line' : ''}`}
        d={path}
        stroke={style.stroke || '#9b87f5'}
        strokeWidth={strokeWidth}
        fill="none"
        onClick={handleEdgeClick}
        style={{ pointerEvents }}
      />
      
      {/* Only show routing points when the wire is a permanent edge and is selected */}
      {!isTemporary && selected && Array.isArray(routingPoints) && routingPoints.map((point, index) => {
        const x = isNaN(point.x) ? 0 : point.x;
        const y = isNaN(point.y) ? 0 : point.y;
        
        return (
          <circle
            key={`${id}-point-${index}`}
            cx={x}
            cy={y}
            r={5}
            fill={style.stroke || '#9b87f5'}
            stroke="#ffffff"
            strokeWidth={1.5}
            opacity={1}
            className="routing-point"
            onMouseDown={(e) => handlePointMouseDown(e, index)}
            cursor="move"
            style={{ pointerEvents: 'all' }}
          />
        );
      })}
      
      {cursorPosition && !isConnectionLine && (
        <circle
          cx={isNaN(cursorPosition.x) ? 0 : cursorPosition.x}
          cy={isNaN(cursorPosition.y) ? 0 : cursorPosition.y}
          r={5}
          fill={style.stroke || '#9b87f5'}
          stroke="#ffffff"
          strokeWidth={1.5}
          className="cursor-point"
          style={{ opacity: 0.7, pointerEvents: 'none' }}
        />
      )}
    </>
  );
}

// Export the component as both a regular component and a ConnectionLineComponent
export default memo(CustomWireEdge);
