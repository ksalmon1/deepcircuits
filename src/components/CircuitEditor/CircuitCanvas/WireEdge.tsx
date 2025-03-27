
import React, { useCallback } from 'react';
import { EdgeProps, BaseEdge, getBezierPath, EdgeLabelRenderer, useReactFlow } from '@xyflow/react';
import { X, Edit, Check, Plus } from 'lucide-react';

// Define control point type
interface ControlPoint {
  x: number;
  y: number;
}

// Define custom edge data
interface WireEdgeData {
  color?: string;
  isEditing?: boolean;
  controlPoints?: ControlPoint[];
  onStartEdit?: (id: string) => void;
  onFinishEdit?: (id: string) => void;
  onControlPointDrag?: (id: string, index: number, e: React.MouseEvent) => void;
  onAddControlPoint?: (id: string) => void;
  [key: string]: any; // Add index signature for additional properties
}

// Use proper EdgeProps with correct generic type
const WireEdge: React.FC<EdgeProps<WireEdgeData>> = ({
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
  const reactFlowInstance = useReactFlow();
  
  // Default wire color and customize based on the data
  const wireColor = data?.color || '#FF0000';
  const wireStyle = {
    stroke: wireColor,
    strokeWidth: selected ? 3 : 2,
    ...style,
  };

  // Determine if edge is in edit mode
  const isEditMode = data?.isEditing === true;

  // Generate custom path if control points are provided
  const getCustomPath = useCallback(() => {
    if (!data?.controlPoints || !Array.isArray(data.controlPoints) || data.controlPoints.length === 0) {
      return getBezierPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetPosition,
        targetX,
        targetY,
        curvature: 0.2,
      });
    }

    // Create a custom path with the control points
    let pathSegments = '';
    const points = data.controlPoints;
    
    // Start point (source)
    pathSegments = `M ${sourceX},${sourceY} `;
    
    // Add segments through all control points
    if (points.length === 1) {
      // With just one control point, use a quadratic bezier
      pathSegments += `Q ${points[0].x},${points[0].y} ${targetX},${targetY}`;
    } else {
      // With multiple control points, use a series of cubic beziers
      for (let i = 0; i < points.length; i++) {
        const currentPoint = points[i];
        
        if (i === 0) {
          // First segment: source to first control point
          const nextPoint = points[i + 1] || { x: targetX, y: targetY };
          const controlX = currentPoint.x + (nextPoint.x - currentPoint.x) / 2;
          const controlY = currentPoint.y + (nextPoint.y - currentPoint.y) / 2;
          
          pathSegments += `C ${currentPoint.x},${currentPoint.y} ${currentPoint.x},${currentPoint.y} ${controlX},${controlY} `;
        } else if (i === points.length - 1) {
          // Last segment: last control point to target
          const prevPoint = points[i - 1];
          const controlX = prevPoint.x + (currentPoint.x - prevPoint.x) / 2;
          const controlY = prevPoint.y + (currentPoint.y - prevPoint.y) / 2;
          
          pathSegments += `C ${controlX},${controlY} ${currentPoint.x},${currentPoint.y} ${targetX},${targetY}`;
        } else {
          // Middle segments: between control points
          const prevPoint = points[i - 1];
          const nextPoint = points[i + 1];
          
          const inControlX = prevPoint.x + (currentPoint.x - prevPoint.x) / 2;
          const inControlY = prevPoint.y + (currentPoint.y - prevPoint.y) / 2;
          
          const outControlX = currentPoint.x + (nextPoint.x - currentPoint.x) / 2;
          const outControlY = currentPoint.y + (nextPoint.y - currentPoint.y) / 2;
          
          pathSegments += `S ${currentPoint.x},${currentPoint.y} ${outControlX},${outControlY} `;
        }
      }
    }

    // Calculate center for label position (approximate)
    let labelX, labelY;
    
    if (points.length > 0) {
      const middlePoint = points[Math.floor(points.length / 2)];
      labelX = middlePoint.x;
      labelY = middlePoint.y;
    } else {
      labelX = (sourceX + targetX) / 2;
      labelY = (sourceY + targetY) / 2;
    }

    return [pathSegments, labelX, labelY];
  }, [sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data?.controlPoints]);

  const [edgePath, labelX, labelY] = getCustomPath();
  
  // Handle drag of control points
  const onControlPointMouseDown = (pointIndex: number, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (data?.onControlPointDrag) {
      data.onControlPointDrag(id, pointIndex, e);
    }
  };

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
              background: 'white',
              padding: '2px',
              borderRadius: '4px',
              border: '1px solid #ddd',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              zIndex: 1000,
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
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '3px',
                    borderRadius: '2px',
                  }}
                >
                  <Edit size={12} color="#555" />
                </button>
                <button
                  className="wire-control-button wire-delete-button"
                  title="Delete wire"
                  onClick={(event) => {
                    event.stopPropagation();
                    // Use XY Flow's edge removal
                    reactFlowInstance.deleteElements({ edges: [{ id }] });
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '3px',
                    borderRadius: '2px',
                  }}
                >
                  <X size={12} color="#F56565" />
                </button>
              </>
            ) : (
              <>
                <button
                  className="wire-control-button wire-add-button"
                  title="Add control point"
                  onClick={(event) => {
                    event.stopPropagation();
                    if (data?.onAddControlPoint) {
                      data.onAddControlPoint(id);
                    }
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '3px',
                    borderRadius: '2px',
                  }}
                >
                  <Plus size={12} color="#555" />
                </button>
                <button
                  className="wire-control-button wire-done-button"
                  title="Finish editing"
                  onClick={(event) => {
                    event.stopPropagation();
                    if (data?.onFinishEdit) {
                      data.onFinishEdit(id);
                    }
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '3px',
                    borderRadius: '2px',
                  }}
                >
                  <Check size={12} color="#38A169" />
                </button>
              </>
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
                  backgroundColor: wireColor,
                  border: '2px solid white',
                  transform: 'translate(-50%, -50%)',
                  cursor: 'move',
                  zIndex: 1000,
                  boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                }}
                onMouseDown={(e) => onControlPointMouseDown(index, e)}
              />
            ))}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};

export default WireEdge;
