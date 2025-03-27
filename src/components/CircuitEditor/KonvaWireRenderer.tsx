
import React, { useRef, useState } from 'react';
import { Layer, Line, Stage, Circle, Group } from 'react-konva';
import { Wire } from '@/hooks/useWireSystem';
import { KonvaEventObject } from 'konva/lib/Node';
import { X } from 'lucide-react';

interface KonvaWireRendererProps {
  wires: Wire[];
  activeWire: Wire | null;
  stageWidth: number;
  stageHeight: number;
  onMouseMove: (e: KonvaEventObject<MouseEvent>) => void;
  onMouseUp: () => void;
  onClick: (e: KonvaEventObject<MouseEvent>) => void;
  onWireDelete?: (wireId: string) => void;
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
  onWireDelete,
  zoom = 1,
  offset = { x: 0, y: 0 }
}) => {
  const stageRef = useRef<any>(null);
  const [hoveredWireId, setHoveredWireId] = useState<string | null>(null);
  
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
  
  // Calculate midpoint of a wire for delete button positioning
  const getWireMidpoint = (wire: Wire): { x: number; y: number } => {
    if (wire.points.length < 2) return { x: 0, y: 0 };
    
    // For wires with multiple points, find a good spot in the middle segment
    if (wire.points.length > 2) {
      const middleIndex = Math.floor(wire.points.length / 2);
      const p1 = wire.points[middleIndex - 1];
      const p2 = wire.points[middleIndex];
      return {
        x: (p1.x + p2.x) / 2,
        y: (p1.y + p2.y) / 2
      };
    }
    
    // For straight wires with just two points
    const p1 = wire.points[0];
    const p2 = wire.points[wire.points.length - 1];
    return {
      x: (p1.x + p2.x) / 2,
      y: (p1.y + p2.y) / 2
    };
  };
  
  // Handle direct click on the stage
  const handleClick = (e: KonvaEventObject<MouseEvent>) => {
    console.log("KonvaWireRenderer: Stage clicked");
    
    if (onClick) {
      onClick(e);
    }
  };

  // Handle wire hover
  const handleWireHover = (wireId: string) => {
    setHoveredWireId(wireId);
  };

  // Handle wire unhover
  const handleWireUnhover = () => {
    setHoveredWireId(null);
  };

  // Handle wire delete button click
  const handleDeleteClick = (wireId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onWireDelete) {
      onWireDelete(wireId);
    }
  };

  return (
    <>
      <Stage 
        ref={stageRef}
        width={stageWidth} 
        height={stageHeight}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onClick={handleClick}
        style={{ 
          position: 'absolute', 
          top: 0, 
          left: 0, 
          pointerEvents: activeWire ? 'auto' : 'none', // Only enable full stage interaction when actively drawing a wire
          zIndex: 20 // Higher z-index to ensure wires are visible above other elements but below pin tooltips
        }}
      >
        <Layer>
          {/* Render completed wires */}
          {wires.map((wire) => {
            const wireKey = `wire-${wire.id}`;
            const isHovered = hoveredWireId === wire.id;
            
            return (
              <Group 
                key={wireKey}
                onMouseEnter={() => handleWireHover(wire.id)}
                onMouseLeave={handleWireUnhover}
              >
                <Line
                  key={`${wireKey}-line`}
                  points={transformPoints(wirePointsToFlatArray(wire))}
                  stroke={wire.color}
                  strokeWidth={isHovered ? 6 : 4}
                  lineCap="round"
                  lineJoin="round"
                  listening={true}
                  opacity={isHovered ? 1.0 : 0.8}
                />
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
      
      {/* Render delete buttons for hovered wires using DOM elements instead of Konva */}
      {hoveredWireId && wires.map((wire) => {
        if (wire.id !== hoveredWireId) return null;
        
        const midpoint = getWireMidpoint(wire);
        const transformedMidpoint = transformPoint(midpoint);
        
        return (
          <div
            key={`delete-btn-${wire.id}`}
            className="absolute flex items-center justify-center bg-white rounded-full border border-gray-300 shadow-sm cursor-pointer hover:bg-red-100 transition-colors"
            style={{
              top: `${transformedMidpoint.y}px`,
              left: `${transformedMidpoint.x}px`,
              width: '22px',
              height: '22px',
              transform: 'translate(-50%, -50%)',
              zIndex: 30,
              pointerEvents: 'auto' // Ensure delete button is always clickable
            }}
            onClick={(e) => handleDeleteClick(wire.id, e)}
          >
            <X size={14} className="text-red-500" />
          </div>
        );
      })}
    </>
  );
};

export default KonvaWireRenderer;
