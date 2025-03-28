
import React from 'react';
import { ConnectionLineComponentProps } from '@xyflow/react';
import { getWireColorFromSignal, getPinSignalType } from '@/utils/wireUtils';
import { WokwiComponent } from '@/integrations/wokwi/WokwiIntegration';

interface CustomConnectionLineProps extends ConnectionLineComponentProps {
  components: WokwiComponent[];
}

/**
 * Custom connection line component that changes color based on signal type
 */
const CustomConnectionLine = ({
  fromX,
  fromY,
  toX,
  toY,
  fromPosition,
  toPosition,
  fromHandle,
  components,
}: CustomConnectionLineProps) => {
  // Determine signal type and color based on the source pin
  let wireColor = '#FF0000'; // Default red color
  
  if (fromHandle) {
    const sourceId = fromHandle.nodeId;
    const pinIdParts = fromHandle.handleId?.toString().split('-');
    if (sourceId && pinIdParts && pinIdParts.length > 1) {
      const pinIndex = parseInt(pinIdParts[1]);
      const signal = getPinSignalType(components, sourceId, pinIndex);
      if (signal) {
        wireColor = getWireColorFromSignal(signal);
      }
    }
  }
  
  // Define path style
  const pathStyle: React.CSSProperties = {
    stroke: wireColor,
    strokeWidth: 2,
    fill: 'none',
  };

  // Calculate control points for a smooth bezier curve
  const dx = Math.abs(toX - fromX);
  const offsetX = dx / 2;
  
  // Create a smooth curve
  const path = `M ${fromX} ${fromY} C ${fromX + offsetX} ${fromY} ${toX - offsetX} ${toY} ${toX} ${toY}`;
  
  return (
    <g>
      <path d={path} style={pathStyle} />
      {/* Optional arrow or marker at end of line */}
      <circle 
        cx={toX} 
        cy={toY} 
        r={3} 
        fill={wireColor} 
        style={{ pointerEvents: 'none' }}
      />
    </g>
  );
};

export default CustomConnectionLine;
