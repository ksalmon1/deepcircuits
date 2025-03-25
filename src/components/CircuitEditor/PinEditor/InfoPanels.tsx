
import React from 'react';

/**
 * Displays coordinate system information
 */
export const CoordinateSystemInfo: React.FC = () => {
  return (
    <div className="mt-4 p-3 bg-blue-50 rounded text-xs space-y-2">
      <p className="font-medium">Coordinate System:</p>
      <ul className="list-disc pl-4 space-y-1 text-gray-700">
        <li>The <span className="font-semibold">red dot</span> marks the origin (0,0) at the top-left of the component</li>
        <li>All coordinates are <span className="font-semibold">relative to this origin point</span></li>
        <li>These exact coordinates will be used in the circuit editor</li>
        <li>Pin positions should align with the visible component terminals</li>
      </ul>
    </div>
  );
};

/**
 * Displays control information
 */
export const ControlsInfo: React.FC = () => {
  return (
    <div className="mt-3 p-3 bg-gray-50 rounded text-xs space-y-2">
      <p className="font-medium">Controls:</p>
      <ul className="list-disc pl-4 space-y-1 text-gray-700">
        <li>Click to add new pins</li>
        <li>Drag existing pins to reposition</li>
        <li>Click a pin to edit its properties</li>
        <li>Use mouse wheel or buttons to zoom</li>
        <li>Hold middle mouse button or use Pan Mode to move the view</li>
      </ul>
    </div>
  );
};
