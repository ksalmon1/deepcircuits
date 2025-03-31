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
  const safeSourceX = isNaN(sourceX) ? 0 : sourceX;
  const safeSourceY = isNaN(sourceY) ? 0 : sourceY;
  const safeTargetX = isNaN(targetX) ? 0 : targetX;
  const safeTargetY = isNaN(targetY) ? 0 : targetY;
  
  let path = `M ${safeSourceX},${safeSourceY}`;
  
  if (Array.isArray(routingPoints)) {
    routingPoints.forEach(point => {
      const x = isNaN(point.x) ? 0 : point.x;
      const y = isNaN(point.y) ? 0 : point.y;
      path += ` L ${x},${y}`;
    });
  }
  
  if (cursorPosition && typeof cursorPosition === 'object') {
    const x = isNaN(cursorPosition.x) ? 0 : cursorPosition.x;
    const y = isNaN(cursorPosition.y) ? 0 : cursorPosition.y;
    path += ` L ${x},${y}`;
  } else {
    path += ` L ${safeTargetX},${safeTargetY}`;
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
    if (event.detail === 2 && onDelete) {
      event.stopPropagation();
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
    
    const { left, top } = reactFlowRect;
    const mouseX = event.clientX - left;
    const mouseY = event.clientY - top;
    
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
  
  const path = generatePath(safeSourceX, safeSourceY, finalTargetX, finalTargetY, routingPoints, cursorPosition);
  
  const isTemporary = id.startsWith('temp-wire-');
  const pointerEvents = isTemporary ? 'none' : 'auto';
  
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
      
      {!isTemporary && Array.isArray(routingPoints) && routingPoints.map((point, index) => {
        const x = isNaN(point.x) ? 0 : point.x;
        const y = isNaN(point.y) ? 0 : point.y;
        
        return (
          <circle
            key={`${id}-point-${index}`}
            cx={x}
            cy={y}
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
        );
      })}
      
      {cursorPosition && (
        <circle
          cx={isNaN(cursorPosition.x) ? 0 : cursorPosition.x}
          cy={isNaN(cursorPosition.y) ? 0 : cursorPosition.y}
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
