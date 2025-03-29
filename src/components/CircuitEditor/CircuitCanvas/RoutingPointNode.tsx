
import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';

const RoutingPointNode = ({ id, selected }: NodeProps) => {
  const nodeStyle: React.CSSProperties = {
    width: '12px',
    height: '12px',
    background: 'white',
    border: selected ? '2px solid #4C72F4' : '2px solid #9b87f5',
    borderRadius: '3px',
    position: 'relative',
    cursor: 'move',
  };

  // Handle styles - make them invisible but functional
  const handleStyle: React.CSSProperties = {
    background: 'transparent',
    border: 'none',
    width: '8px',
    height: '8px',
    opacity: 0, // Invisible but functional
    zIndex: 10,
  };

  return (
    <div style={nodeStyle} title="Wire Routing Point">
      {/* Source handle for continuing the wire */}
      <Handle
        id={`${id}-source`}
        type="source"
        position={Position.Top}
        style={handleStyle}
        isConnectable={false}
        className="nodrag nopan"
      />
      
      {/* Target handle for receiving the wire */}
      <Handle
        id={`${id}-target`}
        type="target"
        position={Position.Bottom}
        style={handleStyle}
        isConnectable={false}
        className="nodrag nopan"
      />
    </div>
  );
};

export default memo(RoutingPointNode);
