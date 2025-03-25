
import { useState, useCallback, useRef } from 'react';

/**
 * Hook that provides zoom and pan functionality for a canvas
 */
export const useCanvasNavigation = (initialZoom = 1) => {
  const [zoom, setZoom] = useState(initialZoom);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const [panMode, setPanMode] = useState(false);
  
  // Add a reference for maintaining canvas dimensions
  const canvasDimensionsRef = useRef({ width: 0, height: 0 });

  const handleZoomIn = useCallback(() => {
    setZoom(prevZoom => Math.min(prevZoom + 0.1, 3));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(prevZoom => Math.max(prevZoom - 0.1, 0.5));
  }, []);

  const togglePanMode = useCallback(() => {
    setPanMode(prev => !prev);
  }, []);

  const startPan = useCallback((x: number, y: number) => {
    setIsDraggingCanvas(true);
    setDragStart({ x: x - offset.x, y: y - offset.y });
  }, [offset]);

  const pan = useCallback((x: number, y: number) => {
    if (isDraggingCanvas) {
      const newX = x - dragStart.x;
      const newY = y - dragStart.y;
      setOffset({ x: newX, y: newY });
    }
  }, [isDraggingCanvas, dragStart]);

  const endPan = useCallback(() => {
    setIsDraggingCanvas(false);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom(prevZoom => Math.max(0.5, Math.min(3, prevZoom + delta)));
  }, []);

  const resetView = useCallback(() => {
    setZoom(initialZoom);
    setOffset({ x: 0, y: 0 });
  }, [initialZoom]);
  
  // Update the canvas dimensions
  const updateCanvasDimensions = useCallback((width: number, height: number) => {
    canvasDimensionsRef.current = { width, height };
  }, []);
  
  // Convert screen coordinates to canvas coordinates (accounting for zoom/pan)
  const screenToCanvasCoordinates = useCallback((screenX: number, screenY: number) => {
    return {
      x: (screenX - offset.x) / zoom,
      y: (screenY - offset.y) / zoom
    };
  }, [zoom, offset]);
  
  // Convert canvas coordinates to screen coordinates
  const canvasToScreenCoordinates = useCallback((canvasX: number, canvasY: number) => {
    return {
      x: canvasX * zoom + offset.x,
      y: canvasY * zoom + offset.y
    };
  }, [zoom, offset]);

  return {
    zoom,
    setZoom,
    offset,
    panMode,
    isDraggingCanvas,
    canvasDimensions: canvasDimensionsRef.current,
    handleZoomIn,
    handleZoomOut,
    togglePanMode,
    startPan,
    pan,
    endPan,
    handleWheel,
    resetView,
    updateCanvasDimensions,
    screenToCanvasCoordinates,
    canvasToScreenCoordinates
  };
};
