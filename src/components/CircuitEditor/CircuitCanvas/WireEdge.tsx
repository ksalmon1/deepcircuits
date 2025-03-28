
import React, { useCallback, memo } from 'react';
import { EdgeProps, BaseEdge, getBezierPath, EdgeLabelRenderer, useReactFlow } from '@xyflow/react';
import { WireEdgeData } from '@/types/circuit';

/**
 * Custom React Flow edge component for circuit wires
 */
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
  
  // Wire style based on data or defaults
  const wireColor = data?.color || '#FF0000';
  const wireStyle = {
    stroke: wireColor,
    strokeWidth: selected ? 3 : 2,
    ...style
  };

  // Check if edge is in edit mode
  const isEditMode = data?.isEditing === true;

  // Calculate path based on control points
  const getCustomPath = useCallback(() => {
    if (!data?.controlPoints || !Array.isArray(data.controlPoints) || data.controlPoints.length === 0) {
      // Generate default bezier path when no control points are available
      return getBezierPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetPosition,
        targetX,
        targetY,
        curvature: 0.25,
      });
    }

    // Create a custom path with control points
    const points = data.controlPoints;
    
    if (points.length === 1) {
      // With one control point, create a quadratic bezier
      const params = {
        sourceX,
        sourceY,
        sourcePosition,
        targetPosition,
        targetX,
        targetY,
        curvature: 0.25,
      };
      const [edgePath] = getBezierPath(params);
      return [edgePath, points[0].x, points[0].y];
    } else {
      // With multiple control points, use a custom path
      let pathSegments = `M ${sourceX},${sourceY} `;
      
      // Add segments through all control points
      for (let i = 0; i < points.length; i++) {
        const currentPoint = points[i];
        
        if (i === 0) {
          // First segment
          pathSegments += `C ${sourceX + 50},${sourceY} ${currentPoint.x - 50},${currentPoint.y} ${currentPoint.x},${currentPoint.y} `;
        } else if (i === points.length - 1) {
          // Last segment to target
          pathSegments += `S ${currentPoint.x},${currentPoint.y} ${targetX - 50},${targetY} `;
          pathSegments += `S ${targetX},${targetY} ${targetX},${targetY}`;
        } else {
          // Middle segments between control points
          const prevPoint = points[i - 1];
          pathSegments += `S ${currentPoint.x},${currentPoint.y} ${(currentPoint.x + prevPoint.x) / 2},${(currentPoint.y + prevPoint.y) / 2} `;
        }
      }
      
      // Calculate approximate midpoint for label placement
      const midIndex = Math.floor(points.length / 2);
      const midPoint = points[midIndex] || { 
        x: (sourceX + targetX) / 2, 
        y: (sourceY + targetY) / 2 
      };
      
      return [pathSegments, midPoint.x, midPoint.y];
    }
  }, [sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data?.controlPoints]);

  const [edgePath, labelX, labelY] = getCustomPath();
  
  // Event handlers
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

  const onControlPointMouseDown = (pointIndex: number, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (data?.onControlPointDrag) {
      data.onControlPointDrag(id, pointIndex, e);
    }
  };

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={wireStyle} />
      
      {/* Control buttons shown when wire is selected */}
      {selected && (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan"
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
      
      {/* Control points shown when in edit mode */}
      {isEditMode && data?.controlPoints && Array.isArray(data.controlPoints) && (
        <EdgeLabelRenderer>
          <div className="nodrag nopan">
            {data.controlPoints.map((point, index) => (
              <div
                key={`cp-${id}-${index}`}
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

export default memo(WireEdge);
