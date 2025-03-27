
import React, { useCallback } from 'react';
import { EdgeProps, BaseEdge, getBezierPath, EdgeLabelRenderer, useReactFlow } from '@xyflow/react';
import { WireEdgeData } from '@/types/circuit';

const WireEdge = ({
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
}: EdgeProps<WireEdgeData>) => {
  const reactFlowInstance = useReactFlow();
  
  // Default wire color and customize based on the data
  const wireColor = data?.color || '#FF0000';
  const wireStyle = {
    stroke: wireColor,
    strokeWidth: selected ? 3 : 2,
    ...(style || {}),
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

  const handleStartEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (data?.onStartEdit) {
      data.onStartEdit(id);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    reactFlowInstance.deleteElements({ edges: [{ id }] });
  };

  const handleAddControlPointClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (data?.onAddControlPoint) {
      data.onAddControlPoint(id);
    }
  };

  const handleFinishEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (data?.onFinishEdit) {
      data.onFinishEdit(id);
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
              backgroundColor: 'white',
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
                  onClick={handleStartEditClick}
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
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                  </svg>
                </button>
                <button
                  className="wire-control-button wire-delete-button"
                  title="Delete wire"
                  onClick={handleDeleteClick}
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
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#F56565" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </>
            ) : (
              <>
                <button
                  className="wire-control-button wire-add-button"
                  title="Add control point"
                  onClick={handleAddControlPointClick}
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
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                </button>
                <button
                  className="wire-control-button wire-done-button"
                  title="Finish editing"
                  onClick={handleFinishEditClick}
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
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#38A169" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
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
            {data.controlPoints.map((point, index) => (
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
