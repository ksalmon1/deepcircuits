
import React from 'react';
import { ZoomIn, ZoomOut, Move } from 'lucide-react';

interface CanvasControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  panMode: boolean;
  togglePanMode: () => void;
}

/**
 * Component for zoom and pan controls in the circuit canvas
 */
const CanvasControls: React.FC<CanvasControlsProps> = ({
  zoom,
  onZoomIn,
  onZoomOut,
  panMode,
  togglePanMode
}) => {
  return (
    <div className="absolute top-2 right-2 bg-white rounded-md shadow-md p-1 z-20 flex gap-1">
      <button
        onClick={onZoomIn}
        className="p-1 hover:bg-gray-100 rounded"
        title="Zoom In (or use Ctrl+Scroll)"
      >
        <ZoomIn size={18} />
      </button>
      <button
        onClick={onZoomOut}
        className="p-1 hover:bg-gray-100 rounded"
        title="Zoom Out (or use Ctrl+Scroll)"
      >
        <ZoomOut size={18} />
      </button>
      <button
        onClick={togglePanMode}
        className={`p-1 hover:bg-gray-100 rounded ${panMode ? 'bg-gray-200' : ''}`}
        title="Pan Mode (or use middle mouse button)"
      >
        <Move size={18} />
      </button>
      <div className="px-2 flex items-center text-xs text-gray-600">
        {Math.round(zoom * 100)}%
      </div>
    </div>
  );
};

export default CanvasControls;
