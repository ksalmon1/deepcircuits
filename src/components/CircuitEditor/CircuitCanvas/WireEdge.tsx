
import React from 'react';
import { EdgeProps, BaseEdge, getBezierPath, EdgeLabelRenderer } from '@xyflow/react';
import { X } from 'lucide-react';

const WireEdge: React.FC<EdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
  selected,
}) => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetPosition,
    targetX,
    targetY,
    curvature: 0.2,
  });
  
  // Default wire color and customize based on the data
  const wireColor = data?.color || '#FF0000';
  const wireStyle = {
    stroke: wireColor,
    strokeWidth: selected ? 3 : 2,
    ...style,
  };

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={wireStyle} />
      
      {/* Show delete button when wire is selected */}
      {selected && (
        <EdgeLabelRenderer>
          <div
            className="wire-delete-button nodrag nopan"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            }}
          >
            <button
              className="wire-delete-button-inner"
              onClick={(event) => {
                event.stopPropagation();
                // The edge will be removed by React Flow's built-in handlers
              }}
            >
              <X size={12} />
            </button>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};

export default WireEdge;
