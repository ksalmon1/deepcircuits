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
  
  const fixedPoints = [{ x: safeSourceX, y: safeSourceY }];
  
  if (Array.isArray(routingPoints)) {
    routingPoints.forEach(point => {
      const x = isNaN(point.x) ? 0 : point.x;
      const y = isNaN(point.y) ? 0 : point.y;
      fixedPoints.push({ x, y });
    });
  }
  
  const finalEndPoint = cursorPosition && typeof cursorPosition === 'object'
    ? { 
        x: isNaN(cursorPosition.x) ? 0 : cursorPosition.x,
        y: isNaN(cursorPosition.y) ? 0 : cursorPosition.y 
      }
    : { x: safeTargetX, y: safeTargetY };
  
  let path = `M ${fixedPoints[0].x},${fixedPoints[0].y}`;
  
  for (let i = 0; i < fixedPoints.length - 1; i++) {
    const current = fixedPoints[i];
    const next = fixedPoints[i + 1];
    
    if (i % 2 === 0) {
      path += ` L ${next.x},${current.y}`;
      path += ` L ${next.x},${next.y}`;
    } else {
      path += ` L ${current.x},${next.y}`;
      path += ` L ${next.x},${next.y}`;
    }
  }
  
  const lastFixedPoint = fixedPoints[fixedPoints.length - 1];
  
  if (lastFixedPoint.x !== finalEndPoint.x || lastFixedPoint.y !== finalEndPoint.y) {
    path += ` L ${finalEndPoint.x},${lastFixedPoint.y}`;
    path += ` L ${finalEndPoint.x},${finalEndPoint.y}`;
  }
  
  return path;
};

function CustomWireEdge(props: CustomWireEdgeProps | ConnectionLineComponentProps) {
  const isConnectionLine = 'fromNode' in props || !('id' in props) || props.id === 'connection-line';
  
  let sourceX = 0;
  let sourceY = 0;
  let targetX = 0;
  let targetY = 0;
  let sourcePosition = null;
  let targetPosition = null;
  let wireColor = '#9b87f5';
  let strokeWidth = 2;
  
  if (isConnectionLine) {
    const connectionProps = props as ConnectionLineComponentProps;
    sourceX = connectionProps.fromX || 0;
    sourceY = connectionProps.fromY || 0;
    targetX = connectionProps.toX || 0;
    targetY = connectionProps.toY || 0;
    
    if (connectionProps.connectionLineStyle) {
      if (typeof connectionProps.connectionLineStyle.stroke === 'string') {
        wireColor = connectionProps.connectionLineStyle.stroke;
      }
      if (typeof connectionProps.connectionLineStyle.strokeWidth === 'number') {
        strokeWidth = connectionProps.connectionLineStyle.strokeWidth;
      }
    }
  } else {
    const edgeProps = props as CustomWireEdgeProps;
    sourceX = edgeProps.sourceX || 0;
    sourceY = edgeProps.sourceY || 0;
    targetX = edgeProps.targetX || 0;
    targetY = edgeProps.targetY || 0;
    sourcePosition = edgeProps.sourcePosition;
    targetPosition = edgeProps.targetPosition;
    
    if (edgeProps.style) {
      if (typeof edgeProps.style.stroke === 'string') {
        wireColor = edgeProps.style.stroke;
      }
      if (edgeProps.style.strokeWidth !== undefined) {
        const width = edgeProps.style.strokeWidth;
        strokeWidth = typeof width === 'number' ? width : parseFloat(width);
        if (isNaN(strokeWidth)) strokeWidth = 2;
      }
    }
  }
  
  const [draggingPointIndex, setDraggingPointIndex] = useState<number | null>(null);
  const { setEdges } = useReactFlow();
  
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
  
  const routingPoints = data?.routingPoints || [];
  const cursorPosition = data?.cursorPosition;
  
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
  
  const path = generateOrthogonalPath(
    safeSourceX, 
    safeSourceY, 
    finalTargetX, 
    finalTargetY, 
    routingPoints, 
    cursorPosition
  );
  
  const isTemporary = isConnectionLine || (id && id.startsWith('temp-wire-'));
  const pointerEvents = isTemporary ? 'none' : 'auto';
  
  const isActiveOrSelected = draggingPointIndex !== null || selected;
  
  const activeStrokeWidth = isActiveOrSelected ? 3 : strokeWidth;
  
  return (
    <>
      <path
        id={id}
        className={`react-flow__edge-path custom-wire-path ${isConnectionLine ? 'connection-line' : ''}`}
        d={path}
        stroke={wireColor}
        strokeWidth={activeStrokeWidth}
        fill="none"
        onClick={handleEdgeClick}
        style={{ pointerEvents }}
      />
      
      {!isTemporary && selected && Array.isArray(routingPoints) && routingPoints.map((point, index) => {
        const x = isNaN(point.x) ? 0 : point.x;
        const y = isNaN(point.y) ? 0 : point.y;
        
        return (
          <circle
            key={`${id}-point-${index}`}
            cx={x}
            cy={y}
            r={5}
            fill={wireColor}
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
          fill={wireColor}
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
