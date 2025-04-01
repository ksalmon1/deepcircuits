import React from 'react';
import { ConnectionLineComponentProps, useNodesData } from '@xyflow/react';
// Import the project context hook and the utility function
import { useProject } from '@/context/ProjectContext'; 
import { getPinSignalType, getWireColorFromSignal } from '@/utils/wireUtils'; 

const DynamicConnectionLine: React.FC<ConnectionLineComponentProps> = ({
  fromNode,
  fromHandle,
  fromX,
  fromY,
  toX,
  toY,
  connectionLineStyle,
}) => {
  // Get the components list from the context
  const { components } = useProject();
  let strokeColor = '#9b87f5'; // Default color

  // Check if we have the necessary info to determine the color
  if (fromNode?.id && fromHandle?.id) {
    try {
      // We no longer need useNodesData here, as we use the context state
      // const sourceNodeData = useNodesData(fromNode?.id ?? null);
      // const componentData = sourceNodeData.data;
      
      const handleId = fromHandle.id;
      const sourceNodeId = fromNode.id; // Get source node ID directly
      const pinIndex = parseInt(handleId.split('-')[1]);

      if (!isNaN(pinIndex)) {
        // Use getPinSignalType with the full components list from context
        const signal = getPinSignalType(components, sourceNodeId, pinIndex);

        // Get color from signal
        strokeColor = getWireColorFromSignal(signal || '');
      } else {
          console.warn('Could not parse pin index from handle:', handleId);
      }
    } catch (error) {
      console.error('Error determining connection line color:', error);
      // Keep default color on error
    }
  }

  // Calculate the path string for the SVG line
  const pathString = `M${fromX},${fromY} L${toX},${toY}`;

  return (
    <g>
      <path
        fill="none"
        stroke={strokeColor} // Apply dynamic or default color
        strokeWidth={2}      // Standard width
        className="animated-connection-line" // Optional class for styling/animation
        d={pathString}
      />
    </g>
  );
};

export default DynamicConnectionLine; 