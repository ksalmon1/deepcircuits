
import React from 'react';
import { EdgeProps, BaseEdge, getBezierPath, EdgeLabelRenderer } from '@xyflow/react';
import { X, Edit, Check } from 'lucide-react';

// Define the type for control points
interface ControlPoint {
  x: number;
  y: number;
}

// Define the type for edge data
interface WireEdgeData {
  color?: string;
  isEditing?: boolean;
  controlPoints?: ControlPoint[];
  onStartEdit?: (id: string) => void;
  onFinishEdit?: (id: string) => void;
  onControlPointDrag?: (id: string, index: number, e: React.MouseEvent) => void;
}

// Extended EdgeProps to include our custom data
interface WireEdgeProps extends EdgeProps {
  data?: WireEdgeData;
}

const WireEdge: React.FC<WireEdgeProps> = ({
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
    stroke: wireColor as string,
    strokeWidth: selected ? 3 : 2,
    ...style,
  };

  // Determine if edge is in edit mode
  const isEditMode = data?.isEditing === true;

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={wireStyle} />
      
      {/* Show control buttons when wire is selected */}
      {selected && (
        <EdgeLabelRenderer>
          <div
            className="wire-controls nodrag nopan"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              display: 'flex',
              gap: '4px',
            }}
          >
            {!isEditMode ? (
              <>
                <button
                  className="wire-control-button wire-edit-button"
                  title="Edit wire path"
                  onClick={(event) => {
                    event.stopPropagation();
                    if (data?.onStartEdit) {
                      data.onStartEdit(id);
                    }
                  }}
                >
                  <Edit size={12} />
                </button>
                <button
                  className="wire-control-button wire-delete-button"
                  title="Delete wire"
                  onClick={(event) => {
                    event.stopPropagation();
                    // The edge will be removed by React Flow's built-in handlers
                  }}
                >
                  <X size={12} />
                </button>
              </>
            ) : (
              <button
                className="wire-control-button wire-done-button"
                title="Finish editing"
                onClick={(event) => {
                  event.stopPropagation();
                  if (data?.onFinishEdit) {
                    data.onFinishEdit(id);
                  }
                }}
              >
                <Check size={12} />
              </button>
            )}
          </div>
        </EdgeLabelRenderer>
      )}
      
      {/* Show edit points when in edit mode */}
      {isEditMode && data?.controlPoints && Array.isArray(data.controlPoints) && (
        <EdgeLabelRenderer>
          <div className="wire-control-points nodrag nopan">
            {data.controlPoints.map((point: ControlPoint, index: number) => (
              <div
                key={`control-point-${id}-${index}`}
                className="wire-control-point"
                style={{
                  position: 'absolute',
                  left: `${point.x}px`,
                  top: `${point.y}px`,
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  backgroundColor: wireColor as string,
                  border: '2px solid white',
                  transform: 'translate(-50%, -50%)',
                  cursor: 'move',
                  zIndex: 1000,
                }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  if (data?.onControlPointDrag) {
                    data.onControlPointDrag(id, index, e);
                  }
                }}
              />
            ))}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};

export default WireEdge;
