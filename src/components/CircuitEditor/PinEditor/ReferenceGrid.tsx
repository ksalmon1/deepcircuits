
import React from 'react';

interface ReferenceGridProps {
  size?: number;
  divisions?: number;
  showCoordinates?: boolean;
}

/**
 * Renders a reference grid for the canvas with optional coordinate labels
 */
const ReferenceGrid: React.FC<ReferenceGridProps> = ({ 
  size = 100, 
  divisions = 12,
  showCoordinates = true
}) => {
  return (
    <div className="absolute left-0 top-0 w-full h-full pointer-events-none">
      {/* Grid lines */}
      {Array.from({ length: divisions + 1 }).map((_, i) => (
        <div 
          key={`h-${i}`} 
          className="absolute left-0 right-0 border-t border-gray-200" 
          style={{ top: `${(i / divisions) * 100}%` }}
        >
          {showCoordinates && i > 0 && i < divisions && (
            <span className="absolute -translate-y-1/2 -translate-x-full left-0 text-[10px] text-gray-500 px-1">
              {Math.round((i / divisions) * size)}
            </span>
          )}
        </div>
      ))}
      
      {Array.from({ length: divisions + 1 }).map((_, i) => (
        <div 
          key={`v-${i}`} 
          className="absolute top-0 bottom-0 border-l border-gray-200" 
          style={{ left: `${(i / divisions) * 100}%` }}
        >
          {showCoordinates && i > 0 && i < divisions && (
            <span className="absolute -translate-x-1/2 -translate-y-full top-0 text-[10px] text-gray-500 px-1">
              {Math.round((i / divisions) * size)}
            </span>
          )}
        </div>
      ))}
      
      {/* Origin marker */}
      <div className="absolute top-0 left-0 w-2 h-2 bg-red-500 rounded-full transform -translate-x-1/2 -translate-y-1/2 z-10" title="Origin (0,0)"></div>
      
      {/* Coordinate labels for origin */}
      {showCoordinates && (
        <div className="absolute top-0 left-0 text-[10px] text-red-500 font-semibold ml-2 mt-2">
          (0,0)
        </div>
      )}
    </div>
  );
};

export default ReferenceGrid;
