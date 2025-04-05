import React, { memo, useContext, useCallback } from 'react';
import { Handle, NodeProps, Position, useNodes } from '@xyflow/react';
import { CircuitComponent } from '@/types/component';
import { ComponentPin } from '@/types/pin';
import clsx from 'clsx';
import './CircuitCanvas/CircuitComponentNode.css';
import { useCircuitEditor } from '@/context/CircuitEditorContext';
import { isValidConnection } from '@/domain/connectionRules';

/**
 * A node component that represents a circuit component in the editor.
 * 
 * @requires ErrorProvider - Required for error handling through useCircuitEditor
 * @requires ProjectProvider - Required for project state through useCircuitEditor
 * @requires CircuitEditorProvider - Required for editor state and actions
 * 
 * This component must be used within the necessary providers, either:
 * 1. Inside CircuitEditorPage which provides all required contexts
 * 2. Wrapped with withCircuitProviders HOC
 */

// Remove registry and placeholder imports
/*
// --- Placeholder Imports for Your Custom Components ---
// import CustomResistor from './CustomResistor';
// ... etc

// Map component types to your future custom React components
const componentRegistry: Record<string, React.ComponentType<any>> = {
  // 'resistor': CustomResistor, // Example
};
*/
// ---------------------------------------------------

// Interface for Highlighted Pin
interface HighlightedPin {
  nodeId: string;
  pinIndex: number;
}

// Define the props specifically for this node type
interface CustomNodeProps extends NodeProps {
  // Expecting CircuitComponent data, potentially extended 
  // with simulation state/callbacks later
  data: CircuitComponent & { hideHandles?: boolean };
  // Destructure width and height provided by React Flow
  width?: number | null;
  height?: number | null;
}

const CircuitComponentNode: React.FC<CustomNodeProps> = ({
  id: sourceNodeId,
  data,
  selected,
  width,  // Get width
  height, // Get height
}) => {
  const handleSize = 8;
  // Get context for highlighting
  const { highlightedPins, setHighlightedPins } = useCircuitEditor();
  // Get all current nodes on the canvas
  const nodes = useNodes<CircuitComponent>();

  // Get rotation value from data, default to 0
  const rotation = data.rotation || 0;

  // --- Pin Hover Handlers ---
  const handlePinMouseEnter = useCallback((sourcePinIndex: number) => {
    if (!setHighlightedPins) return;

    const validTargets: HighlightedPin[] = [];
    // Iterate through all nodes on the canvas
    nodes.forEach(targetNode => {
      // Skip self
      if (targetNode.id === sourceNodeId) return;

      // Ensure target node has pin data
      if (targetNode.data?.pins && Array.isArray(targetNode.data.pins)) {
        targetNode.data.pins.forEach((_, targetPinIndex) => {
          // Check connection validity using the domain rule
          if (isValidConnection(nodes.map(n => n.data), sourceNodeId, sourcePinIndex, targetNode.id, targetPinIndex)) {
            validTargets.push({ nodeId: targetNode.id, pinIndex: targetPinIndex });
          }
        });
      }
    });
    
    // Add the source pin itself to the highlighted list for visual feedback
    const selfPin: HighlightedPin = { nodeId: sourceNodeId, pinIndex: sourcePinIndex };
    
    console.log('Highlighting pins:', [selfPin, ...validTargets]); // Debug log
    setHighlightedPins([selfPin, ...validTargets]); // Update context

  }, [nodes, sourceNodeId, setHighlightedPins]);

  const handlePinMouseLeave = useCallback(() => {
    if (setHighlightedPins) {
      // console.log('Clearing pin highlights'); // Debug log
      setHighlightedPins(null); // Clear highlights
    }
  }, [setHighlightedPins]);
  // -----------------------

  // Node style: Apply rotation transform to the main container
  const nodeStyle: React.CSSProperties = {
    padding: '0',
    fontSize: '10px',
    position: 'relative',
    lineHeight: '0',
    overflow: 'visible',
    width: width ? `${width}px` : undefined,
    height: height ? `${height}px` : undefined,
    // Apply transform HERE
    transform: `rotate(${rotation}deg)`,
    border: selected ? '1px solid blue' : 'none',
    background: 'transparent',
  };

  // Function to calculate handle style using ORIGINAL pin.x/pin.y
  const getHandleStyle = useCallback((pin: ComponentPin): React.CSSProperties => {
    const offsetX = handleSize / 2;
    const offsetY = handleSize / 2;
    // Use original pin coordinates
    const finalX = pin.x;
    const finalY = pin.y;
    return {
      position: 'absolute',
      left: `${finalX - offsetX}px`,
      top: `${finalY - offsetY}px`,
      background: '#555',
      width: `${handleSize}px`,
      height: `${handleSize}px`,
      borderRadius: '50%',
      zIndex: 10,
      cursor: 'crosshair',
      border: 'none',
    };
    // No complex dependencies needed
  }, []);

  // Render the component's visual representation (no inner rotation needed)
  const renderComponentVisual = () => {
    if (data.svgPath) {
      const svgString = data.svgPath;
      if (typeof svgString === 'string' && svgString.trim().startsWith('<svg')) {
        return (
          <div
            className="component-svg-wrapper"
            // No inline style needed here
            dangerouslySetInnerHTML={{ __html: svgString }}
          />
        );
      } else {
        return (
          <img
            src={svgString}
            alt={data.name || data.type}
            style={{ display: 'block', maxWidth: '100%', height: 'auto' }}
          />
        );
      }
    } else {
      return (
        <div style={{ padding: '5px', background: 'rgba(255,255,255,0.8)', border: '1px dashed #ccc' }}>
          {data.name || data.type}
        </div>
      );
    }
  };

  // React Flow might render the node before width/height are measured.
  // Handle this case to avoid errors in calculations.
  if (width === null || height === null || width === undefined || height === undefined) {
    return null; // Render nothing until dimensions are known
  }

  return (
    // Main container IS rotated
    <div style={nodeStyle} className={clsx('circuit-component-node', { 'selected': selected })}>
      {/* Visual content rendered directly */}
      {renderComponentVisual()}

      {/* Handles positioned relative to rotating parent */}
      {!data.hideHandles && data.pins && data.pins.map((pin, index) => {
        const isHighlighted = highlightedPins?.some(hp => hp.nodeId === sourceNodeId && hp.pinIndex === index);

        return (
          <Handle
            key={pin.name || `pin-${index}`}
            type="both"
            position={Position.Top}
            id={`pin-${index}`}
            style={getHandleStyle(pin)}
            className={clsx('circuit-pin-handle', { 'pin-highlighted': isHighlighted })}
            onMouseEnter={() => handlePinMouseEnter(index)}
            onMouseLeave={handlePinMouseLeave}
          />
        );
      })}
    </div>
  );
};

export default memo(CircuitComponentNode); 