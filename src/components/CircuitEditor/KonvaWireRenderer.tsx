
import React, { useEffect, useRef, useState } from 'react';
import { Layer, Line, Stage, Circle, Group } from 'react-konva';
import { Wire } from '@/hooks/useWireSystem';
import { KonvaEventObject } from 'konva/lib/Node';

interface KonvaWireRendererProps {
  wires: Wire[];
  activeWire: Wire | null;
  stageWidth: number;
  stageHeight: number;
  onMouseMove: (e: KonvaEventObject<MouseEvent>) => void;
  onMouseUp: () => void;
  onClick: (e: KonvaEventObject<MouseEvent>) => void;
  zoom?: number;
  offset?: { x: number; y: number };
  onPointMove?: (wireId: string, pointIndex: number, newX: number, newY: number) => void;
}

const KonvaWireRenderer: React.FC<KonvaWireRendererProps> = ({
  wires,
  activeWire,
  stageWidth,
  stageHeight,
  onMouseMove,
  onMouseUp,
  onClick,
  zoom = 1,
  offset = { x: 0, y: 0 },
  onPointMove
}) => {
  const stageRef = useRef<any>(null);
  // Track point dragging state more explicitly
  const [isDragging, setIsDragging] = useState(false);
  const [draggedPoint, setDraggedPoint] = useState<{wireId: string, pointIndex: number} | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<{wireId: string, pointIndex: number} | null>(null);
  const lastMousePosition = useRef<{x: number, y: number} | null>(null);
  
  // Convert wire points to flat array for Konva Line
  const wirePointsToFlatArray = (wire: Wire): number[] => {
    return wire.points.flatMap(point => [point.x, point.y]);
  };
  
  // Apply zoom and offset to transform points
  const transformPoints = (points: number[]): number[] => {
    const transformedPoints: number[] = [];
    for (let i = 0; i < points.length; i += 2) {
      transformedPoints.push(points[i] * zoom + offset.x);
      transformedPoints.push(points[i + 1] * zoom + offset.y);
    }
    return transformedPoints;
  };
  
  // Transform a single point
  const transformPoint = (point: { x: number; y: number }): { x: number; y: number } => {
    return {
      x: point.x * zoom + offset.x,
      y: point.y * zoom + offset.y
    };
  };
  
  // Untransform a point (from screen to canvas coordinates)
  const untransformPoint = (point: { x: number; y: number }): { x: number; y: number } => {
    return {
      x: (point.x - offset.x) / zoom,
      y: (point.y - offset.y) / zoom
    };
  };
  
  // Handle stage mouse down for point dragging
  const handleStageMouseDown = (e: KonvaEventObject<MouseEvent>) => {
    if (!draggedPoint) return;
    
    setIsDragging(true);
    
    // Capture initial mouse position
    const stage = e.target.getStage();
    if (stage) {
      const pos = stage.getPointerPosition();
      if (pos) {
        lastMousePosition.current = { x: pos.x, y: pos.y };
      }
    }
    
    // Prevent event bubbling
    e.cancelBubble = true;
  };
  
  // Handle stage mouse move during dragging
  const handleStageMouseMove = (e: KonvaEventObject<MouseEvent>) => {
    // First, handle the parent's mouse move callback for wire creation
    if (onMouseMove) {
      onMouseMove(e);
    }
    
    // Then, handle our internal point dragging logic
    if (!isDragging || !draggedPoint || !lastMousePosition.current) return;
    
    const stage = e.target.getStage();
    if (!stage) return;
    
    const pos = stage.getPointerPosition();
    if (!pos) return;
    
    // Convert the current screen position to canvas coordinates
    const canvasPos = untransformPoint(pos);
    
    // Update the point position if a handler is provided
    if (onPointMove) {
      console.log(`Moving point: wire ${draggedPoint.wireId}, point ${draggedPoint.pointIndex} to:`, canvasPos);
      onPointMove(draggedPoint.wireId, draggedPoint.pointIndex, canvasPos.x, canvasPos.y);
    }
    
    // Update last mouse position
    lastMousePosition.current = { x: pos.x, y: pos.y };
    
    // Prevent event bubbling
    e.cancelBubble = true;
  };
  
  // Handle stage mouse up to end dragging
  const handleStageMouseUp = (e: KonvaEventObject<MouseEvent>) => {
    // First, handle the parent's mouse up callback for wire completion
    if (onMouseUp) {
      onMouseUp();
    }
    
    // Then, handle our internal point dragging end logic
    if (isDragging) {
      setIsDragging(false);
      console.log('Point drag ended');
    }
    
    // Reset dragging state
    lastMousePosition.current = null;
  };
  
  // Handle point mouse down to start dragging
  const handlePointMouseDown = (wireId: string, pointIndex: number) => {
    console.log(`Point mouse down: wire ${wireId}, point ${pointIndex}`);
    setDraggedPoint({ wireId, pointIndex });
  };
  
  // Handle point hover
  const handlePointHover = (wireId: string, pointIndex: number) => {
    setHoveredPoint({ wireId, pointIndex });
  };
  
  // Handle point hover exit
  const handlePointHoverExit = () => {
    setHoveredPoint(null);
  };
  
  // Handle direct click on the stage (not on a point)
  const handleClick = (e: KonvaEventObject<MouseEvent>) => {
    console.log("KonvaWireRenderer: Stage clicked");
    
    // Only pass the click event up if we're not ending a drag operation
    if (!isDragging && onClick) {
      onClick(e);
    }
  };

  // Log wire information for debugging
  useEffect(() => {
    console.log(`Wire renderer updated: ${wires.length} wires, active wire: ${activeWire ? 'yes' : 'no'}`);
    console.log(`Zoom: ${zoom}, Offset: ${offset.x},${offset.y}`);
    
    if (activeWire) {
      console.log('Active wire points:', activeWire.points);
    }
  }, [wires, activeWire, zoom, offset]);

  return (
    <Stage 
      ref={stageRef}
      width={stageWidth} 
      height={stageHeight}
      onMouseDown={handleStageMouseDown}
      onMouseMove={handleStageMouseMove}
      onMouseUp={handleStageMouseUp}
      onClick={handleClick}
      style={{ 
        position: 'absolute', 
        top: 0, 
        left: 0, 
        pointerEvents: activeWire || isDragging ? 'auto' : 'none',
        zIndex: 20 // Higher z-index to ensure wires are visible above other elements but below pin tooltips
      }}
    >
      <Layer>
        {/* Render completed wires */}
        {wires.map((wire) => {
          const wireKey = `wire-${wire.id}`;
          return (
            <Group key={wireKey}>
              <Line
                key={`${wireKey}-line`}
                points={transformPoints(wirePointsToFlatArray(wire))}
                stroke={wire.color}
                strokeWidth={4}
                lineCap="round"
                lineJoin="round"
                listening={false}
                opacity={1.0}
              />
              
              {/* Render wire points for each wire */}
              {wire.points.map((point, pointIndex) => {
                // Skip rendering points for the first and last points of completed wires
                if (wire.isComplete && (pointIndex === 0 || pointIndex === wire.points.length - 1)) {
                  return null;
                }
                
                const transformedPoint = transformPoint(point);
                
                // Determine if this point can be dragged (not first or last point of completed wire)
                const canDrag = wire.isComplete && (pointIndex !== 0 && pointIndex !== wire.points.length - 1);
                
                // Determine if this point is currently being hovered
                const isHovered = hoveredPoint && 
                                  hoveredPoint.wireId === wire.id && 
                                  hoveredPoint.pointIndex === pointIndex;
                
                // Determine if this point is currently being dragged
                const isDraggingThisPoint = isDragging && 
                                          draggedPoint && 
                                          draggedPoint.wireId === wire.id && 
                                          draggedPoint.pointIndex === pointIndex;
                
                const pointKey = `${wireKey}-point-${pointIndex}`;
                
                return (
                  <Circle
                    key={pointKey}
                    x={transformedPoint.x}
                    y={transformedPoint.y}
                    radius={isHovered || isDraggingThisPoint ? 7 : 5}
                    fill={isHovered || isDraggingThisPoint ? '#9B87F5' : wire.color}
                    stroke={isHovered || isDraggingThisPoint ? '#FFFFFF' : '#FFFFFF'}
                    strokeWidth={isHovered || isDraggingThisPoint ? 2 : 1}
                    opacity={isHovered || isDraggingThisPoint ? 1 : 0.8}
                    listening={canDrag}
                    onMouseDown={canDrag ? () => handlePointMouseDown(wire.id, pointIndex) : undefined}
                    onMouseEnter={() => handlePointHover(wire.id, pointIndex)}
                    onMouseLeave={handlePointHoverExit}
                  />
                );
              })}
            </Group>
          );
        })}
        
        {/* Render active wire being drawn */}
        {activeWire && (
          <Group key={`active-wire-${activeWire.id}`}>
            <Line
              key={`active-wire-line-${activeWire.id}`}
              points={transformPoints(wirePointsToFlatArray(activeWire))}
              stroke={activeWire.color}
              strokeWidth={4}
              lineCap="round"
              lineJoin="round"
              dash={[6, 3]}
              listening={false}
              opacity={0.8}
            />
            
            {/* Render active wire points */}
            {activeWire.points.map((point, pointIndex) => {
              // Skip rendering the last point for active wire (follows the mouse)
              if (pointIndex === activeWire.points.length - 1) {
                return null;
              }
              
              const transformedPoint = transformPoint(point);
              
              return (
                <Circle
                  key={`active-wire-${activeWire.id}-point-${pointIndex}`}
                  x={transformedPoint.x}
                  y={transformedPoint.y}
                  radius={5}
                  fill={activeWire.color}
                  stroke="#fff"
                  strokeWidth={1}
                  opacity={0.8}
                  listening={false}
                />
              );
            })}
          </Group>
        )}
      </Layer>
    </Stage>
  );
};

export default KonvaWireRenderer;
