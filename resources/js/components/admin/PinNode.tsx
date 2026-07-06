import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { ComponentPin } from '@/types/pin';

// Define the data structure expected by this node
interface PinNodeData {
  pin: ComponentPin;
  pinIndex: number;
}

// Basic styling for the pin node - updated to match CircuitComponentNode handles
const pinNodeStyle: React.CSSProperties = {
  width: '8px', // Match handleSize
  height: '8px', // Match handleSize
  backgroundColor: '#555', // Match handle background
  borderRadius: '50%',
  cursor: 'grab', // Keep cursor for draggable node
  // boxShadow: '0 1px 3px rgba(0,0,0,0.2)', // Remove shadow
  // Center the node origin visually
  // transform: 'translate(-50%, -50%)', // REMOVE transform for centering test
};

// Remove the problematic PinNodeComponentProps interface
/*
interface PinNodeComponentProps extends NodeProps {
  data: PinNodeData; // Ensure data matches our interface
}
*/

// Use the generic NodeProps
const PinNode: React.FC<NodeProps> = ({ data, selected }) => {
  // Use double assertion: first to unknown, then to PinNodeData
  const { pin, pinIndex } = data as unknown as PinNodeData;

  // Add a slightly different style when selected
  const currentStyle = {
    ...pinNodeStyle,
    backgroundColor: selected ? '#3b82f6' : pinNodeStyle.backgroundColor,
  };

  // We don't need handles for this pin configuration canvas,
  // but React Flow requires at least one Handle component for nodes to be connectable
  // or draggable in some contexts. Adding a hidden one avoids potential issues.
  return (
    <div style={currentStyle} title={`Pin ${pinIndex + 1}: ${pin.name} (Drag to move)`}>
      <Handle
        type="source" // Type doesn't matter much here
        position={Position.Top} // Position doesn't matter much here
        id={`pin-${pinIndex}-handle`}
        style={{ visibility: 'hidden', width: 0, height: 0 }} // Make it invisible
      />
       {/* You could optionally render the pin name or index here if needed */}
    </div>
  );
};

export default PinNode;