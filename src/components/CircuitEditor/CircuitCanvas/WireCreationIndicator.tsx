
import React from 'react';
import { Wire } from '@/types/circuit';

interface WireCreationIndicatorProps {
  activeWire: Wire | null;
}

/**
 * Component to display information about an active wire being created
 */
const WireCreationIndicator: React.FC<WireCreationIndicatorProps> = ({ activeWire }) => {
  if (!activeWire) return null;
  
  return (
    <div className="absolute top-12 right-2 bg-yellow-100 text-sm p-2 rounded-md shadow-md z-20">
      {activeWire.points.length > 1 ? 
        "Creating wire: Click canvas to add points, click a pin to complete, or press Esc to cancel." :
        "Creating wire: Click another pin to complete the connection, or press Esc to cancel."}
    </div>
  );
};

export default WireCreationIndicator;
