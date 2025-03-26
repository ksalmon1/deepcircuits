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
  const [hoveredPoint, setHoveredPoint] = useState<{wireId: string, pointIndex: number} | null>(null);
  const [draggingPoint, setDraggingPoint] = useState<{wireId: string, pointIndex: number} | null>(null);
  const [mousePosition, setMousePosition] = useState<{x: number, y: number} | null>(null);
  
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
  
  // Start point dragging
  const handlePointMouseDown = (e: KonvaEventObject<MouseEvent>, wireId: string, pointIndex: number) => {
    e.cancelBubble = true;  // Stop event propagation
    
    // Only allow dragging intermediate points (not start/end points)
    const wire = wires.find(w => w.id === wireId);
    if (wire && wire.isComplete && (pointIndex === 0 || pointIndex === wire.points.length - 1)) {
      return; // Don't allow dragging endpoints
    }
    
    setDraggingPoint({ wireId, pointIndex });
    console.log('Started dragging point:', wireId, pointIndex);
  };
  
  // Handle stage mouse move for both wire creation and point dragging
  const handleStageMouseMove = (e: KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    if (!stage) return;
    
    const pos = stage.getPointerPosition();
    if (!pos) return;
    
    setMousePosition(pos);
    
    // Handle point dragging
    if (draggingPoint) {
      e.cancelBubble = true; // Stop event propagation
      
      // Convert the current screen position to canvas coordinates
      const canvasPos = untransformPoint(pos);
      
      // Update the point position if a handler is provided
      if (onPointMove) {
        onPointMove(
          draggingPoint.wireId, 
          draggingPoint.pointIndex, 
          canvasPos.x, 
          canvasPos.y
        );
      }
    } 
    // Handle wire creation/drawing
    else if (onMouseMove) {
      onMouseMove(e);
    }
  };
  
  // Handle stage mouse up to end dragging
  const handleStageMouseUp = (e: KonvaEventObject<MouseEvent>) => {
    // If we were dragging a point, end the drag operation
    if (draggingPoint) {
      console.log('Stopped dragging point');
      setDraggingPoint(null);
      e.cancelBubble = true;  // Stop event propagation
    } 
    // Otherwise, handle normal wire completion
    else if (onMouseUp) {
      onMouseUp();
    }
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
  const handleStageClick = (e: KonvaEventObject<MouseEvent>) => {
    // Only pass the click event up if we're not ending a drag operation
    if (!draggingPoint && onClick) {
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
      onMouseDown={e => e.target === e.currentTarget && handleStageClick(e)}
      onMouseMove={handleStageMouseMove}
      onMouseUp={handleStageMouseUp}
      onClick={handleStageClick}
      style={{ 
        position: 'absolute', 
        top: 0, 
        left: 0, 
        pointerEvents: 'auto',
        zIndex: 20
      }}
    >
      <Layer>
        {/* Render completed wires */}
        {wires.map((wire) => {
          const wireId = wire.id; // Extract for use in keys
          
          return (
            <Group key={`wire-group-${wireId}`}>
              {/* Wire line */}
              <Line
                key={`wire-line-${wireId}`}
                points={transformPoints(wirePointsToFlatArray(wire))}
                stroke={wire.color}
                strokeWidth={4}
                lineCap="round"
                lineJoin="round"
                listening={false}
                opacity={1.0}
              />
              
              {/* Render wire points */}
              {wire.points.map((point, pointIndex) => {
                const isEndpoint = wire.isComplete && (pointIndex === 0 || pointIndex === wire.points.length - 1);
                
                // Skip rendering control points for endpoints of completed wires
                if (isEndpoint) {
                  return null;
                }
                
                const transformedPoint = transformPoint(point);
                const pointId = `${wireId}-point-${pointIndex}`;
                
                // Check if this point is being hovered or dragged
                const isHovered = hoveredPoint && 
                                  hoveredPoint.wireId === wireId && 
                                  hoveredPoint.pointIndex === pointIndex;
                                  
                const isDragging = draggingPoint && 
                                  draggingPoint.wireId === wireId && 
                                  draggingPoint.pointIndex === pointIndex;
                
                // Visual properties based on state
                const radius = (isHovered || isDragging) ? 8 : 5;
                const fill = (isHovered || isDragging) ? '#9B87F5' : wire.color;
                const strokeWidth = (isHovered || isDragging) ? 2 : 1;
                const opacity = (isHovered || isDragging) ? 1 : 0.8;
                
                return (
                  <Circle
                    key={`circle-${pointId}`}
                    x={transformedPoint.x}
                    y={transformedPoint.y}
                    radius={radius}
                    fill={fill}
                    stroke="#FFFFFF"
                    strokeWidth={strokeWidth}
                    opacity={opacity}
                    onMouseDown={e => handlePointMouseDown(e, wireId, pointIndex)}
                    onMouseEnter={() => handlePointHover(wireId, pointIndex)}
                    onMouseLeave={handlePointHoverExit}
                  />
                );
              })}
            </Group>
          );
        })}
        
        {/* Render active wire being drawn */}
        {activeWire && (
          <Group key={`active-wire-group-${activeWire.id}`}>
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
