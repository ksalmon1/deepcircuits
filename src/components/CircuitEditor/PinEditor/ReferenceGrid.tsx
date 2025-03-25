
import React from 'react';

/**
 * Renders a reference grid for the canvas
 */
const ReferenceGrid: React.FC = () => {
  return (
    <div className="absolute left-0 top-0 w-full h-full grid grid-cols-12 grid-rows-12 pointer-events-none">
      {Array.from({ length: 13 }).map((_, i) => (
        <div key={`h-${i}`} className="absolute left-0 right-0 border-t border-gray-200" style={{ top: `${(i / 12) * 100}%` }}></div>
      ))}
      {Array.from({ length: 13 }).map((_, i) => (
        <div key={`v-${i}`} className="absolute top-0 bottom-0 border-l border-gray-200" style={{ left: `${(i / 12) * 100}%` }}></div>
      ))}
    </div>
  );
};

export default ReferenceGrid;
