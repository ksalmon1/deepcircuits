import React, { memo, useState, useCallback } from 'react';
import { CustomWireEdgeProps, WireData, WokwiNodeData } from '@/types/circuit';
import { useReactFlow, ConnectionLineComponentProps, Node } from '@xyflow/react';
import { getPinSignalType, getWireColorFromSignal } from '@/utils/wireUtils';

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

/**
 * Simple connection line component for when wires are being dragged
 */
const ConnectionLine = ({
  fromX,
  fromY,
  toX,
  toY,
  connectionLineStyle = {},
  sourceNode,
  sourceHandleId
}: ConnectionLineComponentProps) => {
  let wireColor = connectionLineStyle.stroke || '#9b87f5'; // Default color

  if (sourceNode && sourceHandleId) {
    try {
      const pinIndex = parseInt(sourceHandleId.split('-')[1]);
      if (!isNaN(pinIndex)) {
        const nodeData = sourceNode.data as WokwiNodeData;
        const pin = nodeData?.pins?.[pinIndex];
        
        if (pin && pin.signals && pin.signals.length > 0) {
          const signal = pin.signals[0];
          wireColor = getWireColorFromSignal(signal);
        } else {
          console.warn(`ConnectionLine: Could not find signal for pin ${pinIndex} on node ${sourceNode.id}`);
        }
      }
    } catch (error) {
      console.error("Error calculating connection line color:", error);
      // Keep default color on error
    }
  }

  const path = generateOrthogonalPath(
    fromX || 0,
    fromY || 0,
    toX || 0,
    toY || 0
  );

  return (
    <path
      className="react-flow__edge-path react-flow__connection-line"
      d={path}
      fill="none"
      stroke={wireColor}
      strokeWidth={connectionLineStyle.strokeWidth || 2}
      style={{ pointerEvents: 'none' }}
    />
  );
};

/**
 * Interactive edge component for when wires are placed
 */
const InteractiveEdge = ({
  id,
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
}: CustomWireEdgeProps) => {
  const [draggingPointIndex, setDraggingPointIndex] = useState<number | null>(null);
  const { setEdges } = useReactFlow();
  
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
  
  const isTemporary = id === 'connection-line' || (id && id.startsWith('temp-wire-'));
  const pointerEvents = isTemporary ? 'none' : 'auto';
  
  const isActiveOrSelected = draggingPointIndex !== null || selected;
  
  const activeStrokeWidth = isActiveOrSelected ? 3 : (style.strokeWidth as number || 2);
  
  return (
    <>
      <path
        id={id}
        className={`react-flow__edge-path custom-wire-path ${isTemporary ? 'connection-line' : ''}`}
        d={path}
        stroke={style.stroke || data?.color || '#9b87f5'}
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
            fill={style.stroke || data?.color || '#9b87f5'}
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
      
      {cursorPosition && !isTemporary && (
        <circle
          cx={isNaN(cursorPosition.x) ? 0 : cursorPosition.x}
          cy={isNaN(cursorPosition.y) ? 0 : cursorPosition.y}
          r={5}
          fill={style.stroke || data?.color || '#9b87f5'}
          stroke="#ffffff"
          strokeWidth={1.5}
          className="cursor-point"
          style={{ opacity: 0.7, pointerEvents: 'none' }}
        />
      )}
    </>
  );
};

/**
 * Universal wire edge component that handles both connection lines and interactive edges
 */
function CustomWireEdge(props: CustomWireEdgeProps | ConnectionLineComponentProps) {
  // Determine if this is a connection line or an edge
  const isConnectionLine = 'fromX' in props || !('id' in props) || props.id === 'connection-line';
  
  if (isConnectionLine) {
    return <ConnectionLine {...(props as ConnectionLineComponentProps)} />;
  } else {
    return <InteractiveEdge {...(props as CustomWireEdgeProps)} />;
  }
}

// Export the connection line component separately
export { ConnectionLine };

// Default export the main edge component
export default memo(CustomWireEdge);
