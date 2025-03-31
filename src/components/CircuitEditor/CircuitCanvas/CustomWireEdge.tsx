
import React, { FC, useEffect, useMemo, useState } from 'react';
import { Position, EdgeProps, getBezierPath } from '@xyflow/react';
import { getEdgeParams } from './utils';

interface CustomWireEdgeProps extends EdgeProps {
  data?: {
    signal?: string;
    isConnected?: boolean;
    isSelected?: boolean;
    animate?: boolean;
  };
}

const CustomWireEdge: FC<CustomWireEdgeProps> = ({ 
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}) => {
  const [edgePath, setEdgePath] = useState('');
  const [centerX, setCenterX] = useState(0);
  const [centerY, setCenterY] = useState(0);
  
  const edgeParams = useMemo(() => {
    const params = getEdgeParams(
      { x: sourceX, y: sourceY, position: sourcePosition || Position.Bottom },
      { x: targetX, y: targetY, position: targetPosition || Position.Top }
    );
    return params;
  }, [sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition]);
  
  useEffect(() => {
    // Calculate bezier path
    const [path, centerXY] = getBezierPath({
      sourceX: edgeParams.sourceX,
      sourceY: edgeParams.sourceY,
      sourcePosition: edgeParams.sourcePosition,
      targetX: edgeParams.targetX,
      targetY: edgeParams.targetY,
      targetPosition: edgeParams.targetPosition,
      curvature: 0.4, // slightly curved wires
    });
    
    setEdgePath(path);
    
    if (centerXY && Array.isArray(centerXY) && centerXY.length >= 2) {
      setCenterX(centerXY[0]);
      setCenterY(centerXY[1]);
    }
  }, [edgeParams]);
  
  const isConnected = data?.isConnected !== false;
  const isSelected = selected || data?.isSelected;
  const shouldAnimate = data?.animate;
  
  // Determine the signal class/color
  const getSignalClass = () => {
    const signal = data?.signal?.toLowerCase() || '';
    
    if (signal.includes('power') || signal.includes('vcc') || signal.includes('+')) {
      return 'stroke-red-500';
    } else if (signal.includes('ground') || signal.includes('gnd')) {
      return 'stroke-blue-500';
    } else if (signal.includes('analog')) {
      return 'stroke-yellow-500';
    } else if (signal.includes('clock') || signal.includes('clk')) {
      return 'stroke-purple-500';
    } else if (signal.includes('data') || signal.includes('io')) {
      return 'stroke-green-500';
    }
    
    return 'stroke-gray-700';
  };
  
  const signalClass = getSignalClass();
  
  return (
    <g
      className={`react-flow__edge ${isSelected ? 'selected' : ''} ${!isConnected ? 'dashed' : ''}`}
      data-testid={`edge-${id}`}
      data-signal={data?.signal || ''}
    >
      <path
        className={`
          fill-none 
          ${signalClass} 
          ${isSelected ? 'edge-path-selected stroke-2' : 'stroke-[1.5px]'} 
          ${!isConnected ? 'stroke-dashed' : ''} 
          ${shouldAnimate ? 'animate-pulse' : ''}
        `}
        d={edgePath}
        strokeDasharray={isConnected ? 'none' : '5,5'}
      />
      
      {/* Add label if needed */}
      {data?.signal && (
        <text
          x={centerX}
          y={centerY}
          dy={-10}
          className="fill-gray-700 text-[10px] edge-text font-mono"
          textAnchor="middle"
          dominantBaseline="middle"
        >
          {data.signal}
        </text>
      )}
    </g>
  );
};

export default CustomWireEdge;
