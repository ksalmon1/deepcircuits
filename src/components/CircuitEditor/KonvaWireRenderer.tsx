
import React, { useEffect, useRef, useState } from 'react';
import { Layer, Line, Stage, Circle, Group, Rect } from 'react-konva';
import { Wire } from '@/hooks/useWireSystem';
import { KonvaEventObject } from 'konva/lib/Node';
import { findClosestPointOnWire } from '@/utils/wireUtils';

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
  offset = { x: 0, y: 0 }
}) => {
  const stageRef = useRef<any>(null);
  const [hoveredSegment, setHoveredSegment] = useState<{ wireId: string, segmentIndex: number } | null>(null);
  const [ghostPoint, setGhostPoint] = useState<{ x: number; y: number } | null>(null);
  
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
  
  // Handle mouse move to show ghost point for potential wire point addition
  const handleStageMouseMove = (e: KonvaEventObject<MouseEvent>) => {
    if (!activeWire) {
      // When not creating a wire, check if hovering over an existing wire
      const stage = e.target.getStage();
      if (!stage) return;
      
      const pointerPos = stage.getPointerPosition();
      if (!pointerPos) return;
      
      const canvasX = (pointerPos.x - offset.x) / zoom;
      const canvasY = (pointerPos.y - offset.y) / zoom;
      
      let foundHoveredSegment = false;
      
      // Check each wire to see if mouse is near a segment
      for (const wire of wires) {
        if (!wire.isComplete) continue;
        
        const { segmentIndex, distance, point } = findClosestPointOnWire(canvasX, canvasY, wire);
        
        if (distance < 10) {
          setHoveredSegment({ wireId: wire.id, segmentIndex });
          setGhostPoint(point);
          foundHoveredSegment = true;
          break;
        }
      }
      
      if (!foundHoveredSegment) {
        setHoveredSegment(null);
        setGhostPoint(null);
      }
    }
    
    // Call the original onMouseMove handler
    if (onMouseMove) {
      onMouseMove(e);
    }
  };
  
  const handleClick = (e: KonvaEventObject<MouseEvent>) => {
    console.log("KonvaWireRenderer: Stage clicked");
    
    // Make sure the click event is passed to the parent handler
    if (onClick) {
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

  // Render dots for intermediate wire points
  const renderWirePoints = (wire: Wire, isActive: boolean = false) => {
    if (wire.points.length <= 2 && !isActive) return null; // No intermediate points for completed wires with only 2 points

    return wire.points.map((point, index) => {
      // For completed wires, skip first and last points (those are on pins)
      if (!isActive && (index === 0 || index === wire.points.length - 1)) return null;
      // For active wire, skip the last point (it follows the mouse)
      if (isActive && index === wire.points.length - 1) return null;
      
      const transformedPoint = transformPoint(point);
      
      return (
        <Circle
          key={`wire-${wire.id}-point-${index}`}
          x={transformedPoint.x}
          y={transformedPoint.y}
          radius={5}
          fill={wire.color}
          stroke="#fff"
          strokeWidth={1}
          opacity={isActive ? 0.8 : 1}
          listening={false}
        />
      );
    });
  };
  
  // Render the ghost point that shows where a new point could be added
  const renderGhostPoint = () => {
    if (!ghostPoint || !hoveredSegment) return null;
    
    const transformedPoint = transformPoint(ghostPoint);
    
    // Find the wire that matches the hoveredSegment
    const hoveredWire = wires.find(w => w.id === hoveredSegment.wireId);
    if (!hoveredWire) return null;
    
    return (
      <Circle
        x={transformedPoint.x}
        y={transformedPoint.y}
        radius={6}
        fill="rgba(255, 255, 255, 0.7)"
        stroke={hoveredWire.color}
        strokeWidth={2}
        dash={[3, 3]}
        listening={false}
      />
    );
  };

  return (
    <Stage 
      ref={stageRef}
      width={stageWidth} 
      height={stageHeight}
      onMouseMove={handleStageMouseMove}
      onMouseUp={onMouseUp}
      onClick={handleClick}
      style={{ 
        position: 'absolute', 
        top: 0, 
        left: 0, 
        pointerEvents: activeWire || hoveredSegment ? 'auto' : 'none',
        zIndex: 20 // Higher z-index to ensure wires are visible above other elements but below pin tooltips
      }}
    >
      <Layer>
        {/* Render completed wires */}
        {wires.map(wire => (
          <Group key={wire.id}>
            <Line
              points={transformPoints(wirePointsToFlatArray(wire))}
              stroke={wire.color}
              strokeWidth={4} // Increased width for better visibility
              lineCap="round"
              lineJoin="round"
              listening={false}
              opacity={1.0}
            />
            {renderWirePoints(wire)}
          </Group>
        ))}
        
        {/* Render active wire being drawn */}
        {activeWire && (
          <Group>
            <Line
              points={transformPoints(wirePointsToFlatArray(activeWire))}
              stroke={activeWire.color}
              strokeWidth={4} // Increased width for better visibility
              lineCap="round"
              lineJoin="round"
              dash={[6, 3]} // More visible dashed line for the wire being drawn
              listening={false}
              opacity={0.8}
            />
            {renderWirePoints(activeWire, true)}
          </Group>
        )}
        
        {/* Render ghost point for wire editing */}
        {renderGhostPoint()}
      </Layer>
    </Stage>
  );
};

export default KonvaWireRenderer;
