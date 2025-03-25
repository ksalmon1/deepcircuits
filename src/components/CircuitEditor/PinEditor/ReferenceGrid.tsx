
import React from 'react';

interface ReferenceGridProps {
  size?: number;
  divisions?: number;
  showCoordinates?: boolean;
  componentElement?: HTMLElement | null;
}

/**
 * Renders a reference grid for the canvas with optional coordinate labels
 * The grid's origin (0,0) is positioned at the component's top-left corner
 */
const ReferenceGrid: React.FC<ReferenceGridProps> = ({ 
  size = 100, 
  divisions = 12,
  showCoordinates = true,
  componentElement = null
}) => {
  // Get component position if available
  const componentLeft = componentElement ? componentElement.offsetLeft : 0;
  const componentTop = componentElement ? componentElement.offsetTop : 0;
  
  return (
    <div className="absolute left-0 top-0 w-full h-full pointer-events-none">
      {/* Grid lines */}
      {Array.from({ length: divisions + 1 }).map((_, i) => {
        // Calculate real-world coordinate value for this gridline
        const yCoord = Math.round(((i / divisions) * size) - componentTop);
        
        return (
          <div 
            key={`h-${i}`} 
            className="absolute left-0 right-0 border-t border-gray-200" 
            style={{ top: `${(i / divisions) * 100}%` }}
          >
            {showCoordinates && i > 0 && i < divisions && (
              <span className="absolute -translate-y-1/2 -translate-x-full left-0 text-[10px] text-gray-500 px-1">
                {yCoord}
              </span>
            )}
          </div>
        );
      })}
      
      {Array.from({ length: divisions + 1 }).map((_, i) => {
        // Calculate real-world coordinate value for this gridline
        const xCoord = Math.round(((i / divisions) * size) - componentLeft);
        
        return (
          <div 
            key={`v-${i}`} 
            className="absolute top-0 bottom-0 border-l border-gray-200" 
            style={{ left: `${(i / divisions) * 100}%` }}
          >
            {showCoordinates && i > 0 && i < divisions && (
              <span className="absolute -translate-x-1/2 -translate-y-full top-0 text-[10px] text-gray-500 px-1">
                {xCoord}
              </span>
            )}
          </div>
        );
      })}
      
      {/* Origin marker positioned at the component's top-left */}
      <div 
        className="absolute w-2 h-2 bg-red-500 rounded-full transform -translate-x-1/2 -translate-y-1/2 z-10" 
        style={{ 
          left: `${componentLeft}px`, 
          top: `${componentTop}px` 
        }}
        title="Origin (0,0)"
      ></div>
      
      {/* Coordinate labels for origin */}
      {showCoordinates && (
        <div 
          className="absolute text-[10px] text-red-500 font-semibold ml-2 mt-2"
          style={{ 
            left: `${componentLeft}px`, 
            top: `${componentTop}px` 
          }}
        >
          (0,0)
        </div>
      )}
    </div>
  );
};

export default ReferenceGrid;
