
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
  let styleProps: { stroke?: string; strokeWidth?: number } = {};
  
  if (isConnectionLine) {
    const connectionProps = props as ConnectionLineComponentProps;
    sourceX = connectionProps.fromX || 0;
    sourceY = connectionProps.fromY || 0;
    targetX = connectionProps.toX || 0;
    targetY = connectionProps.toY || 0;
    
    // Extract style properties safely
    if (connectionProps.connectionLineStyle) {
      const lineStyle = connectionProps.connectionLineStyle;
      styleProps = {
        stroke: typeof lineStyle.stroke === 'string' ? lineStyle.stroke : '#9b87f5',
        strokeWidth: typeof lineStyle.strokeWidth === 'number' ? lineStyle.strokeWidth : 2
      };
    } else {
      styleProps = { stroke: '#9b87f5', strokeWidth: 2 };
    }
  } else {
    const edgeProps = props as CustomWireEdgeProps;
    sourceX = edgeProps.sourceX || 0;
    sourceY = edgeProps.sourceY || 0;
    targetX = edgeProps.targetX || 0;
    targetY = edgeProps.targetY || 0;
    sourcePosition = edgeProps.sourcePosition;
    targetPosition = edgeProps.targetPosition;
    
    // Extract style properties safely
    if (edgeProps.style) {
      const edgeStyle = edgeProps.style;
      styleProps = {
        stroke: typeof edgeStyle.stroke === 'string' ? edgeStyle.stroke : '#9b87f5',
        strokeWidth: typeof edgeStyle.strokeWidth === 'number' ? edgeStyle.strokeWidth : 2
      };
    } else {
      styleProps = { stroke: '#9b87f5', strokeWidth: 2 };
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
  
  const strokeWidth = isActiveOrSelected ? 3 : (styleProps.strokeWidth || 2);
  
  return (
    <>
      <path
        id={id}
        className={`react-flow__edge-path custom-wire-path ${isConnectionLine ? 'connection-line' : ''}`}
        d={path}
        stroke={styleProps.stroke || '#9b87f5'}
        strokeWidth={strokeWidth}
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
            fill={styleProps.stroke || '#9b87f5'}
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
          fill={styleProps.stroke || '#9b87f5'}
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
