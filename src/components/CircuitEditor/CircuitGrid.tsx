
import React from 'react';

interface CircuitGridProps {
  children: React.ReactNode;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseMove: (e: React.MouseEvent) => void;
  onMouseUp: (e: React.MouseEvent) => void;
  onMouseLeave: (e: React.MouseEvent) => void;
  zoom: number;
  offset: { x: number; y: number };
  isDraggingCanvas: boolean;
  panMode: boolean;
  activeWire: boolean;
}

const CircuitGrid: React.FC<CircuitGridProps> = ({
  children,
  onDrop,
  onDragOver,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onMouseLeave,
  zoom,
  offset,
  isDraggingCanvas,
  panMode,
  activeWire
}) => {
  return (
    <div 
      className="h-full w-full grid grid-cols-[repeat(40,25px)] grid-rows-[repeat(30,25px)] bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjUiIGhlaWdodD0iMjUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSIyNSIgaGVpZ2h0PSIyNSIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDAgTCAyNSAwIE0gMCAwIEwgMCAyNSIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZTJlOGYwIiBzdHJva2Utd2lkdGg9IjEiPjwvcGF0aD48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiPjwvcmVjdD48L3N2Zz4=')]"
      onDrop={onDrop}
      onDragOver={onDragOver}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseLeave}
      style={{
        transform: `scale(${zoom}) translate(${offset.x / zoom}px, ${offset.y / zoom}px)`,
        transformOrigin: '0 0',
        transition: isDraggingCanvas ? 'none' : 'transform 0.1s ease-out',
        cursor: panMode ? 'move' : activeWire ? 'crosshair' : 'default',
        position: 'relative'
      }}
    >
      {children}
    </div>
  );
};

export default CircuitGrid;
