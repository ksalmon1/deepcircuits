
import React from 'react';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, Move } from 'lucide-react';

interface CanvasToolbarProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onTogglePanMode: () => void;
  panMode: boolean;
}

/**
 * Toolbar with zoom and pan controls for the canvas
 */
const CanvasToolbar: React.FC<CanvasToolbarProps> = ({
  zoom,
  onZoomIn,
  onZoomOut,
  onTogglePanMode,
  panMode
}) => {
  return (
    <div className="flex justify-between items-center mb-2">
      <div className="text-sm font-medium">Visual Pin Configuration</div>
      <div className="flex items-center gap-1">
        <Button 
          variant="outline" 
          size="icon" 
          className="h-7 w-7" 
          onClick={onZoomIn} 
          title="Zoom In"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button 
          variant="outline" 
          size="icon" 
          className="h-7 w-7" 
          onClick={onZoomOut}
          title="Zoom Out"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button 
          variant="outline" 
          size="icon" 
          className={`h-7 w-7 ${panMode ? 'bg-muted' : ''}`} 
          onClick={onTogglePanMode}
          title="Pan Mode"
        >
          <Move className="h-4 w-4" />
        </Button>
        <span className="text-xs ml-1">
          {Math.round(zoom * 100)}%
        </span>
      </div>
    </div>
  );
};

export default CanvasToolbar;
