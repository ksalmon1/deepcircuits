import React, { memo, useContext, useCallback } from 'react';
import { Handle, NodeProps, Position, useNodes } from '@xyflow/react';
import { CircuitComponent } from '@/types/component';
import { ComponentPin } from '@/types/pin';
import clsx from 'clsx';
import './CircuitCanvas/CircuitComponentNode.css';
import { useCircuitEditor, CircuitEditorContextType } from '@/context/CircuitEditorContext';
import { isValidConnection } from '@/domain/connectionRules';
import { ComponentLibraryItem } from '@/types/component';

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
}

const CircuitComponentNode: React.FC<CustomNodeProps> = ({ id: sourceNodeId, data, selected }) => {
  const handleSize = 8;
  // Get context for highlighting
  const { highlightedPins, setHighlightedPins } = useCircuitEditor();
  // Get all current nodes on the canvas
  const nodes = useNodes<CircuitComponent>();

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

  // Basic styling - remove the border, background, radius as it interferes with outline
  const nodeStyle: React.CSSProperties = {
    padding: '0', // Ensure no padding interferes with SVG positioning
    fontSize: '10px',
    position: 'relative',
    lineHeight: '0', // Helps when only image/SVG is present
    overflow: 'visible', // Allow SVG stroke to go outside bounds if needed
  };

  // Function to calculate handle style using pin.x and pin.y
  const getHandleStyle = (pin: ComponentPin): React.CSSProperties => {
    // Assumption: pin.x, pin.y are pixel coordinates relative to the node's top-left corner (inside padding).
    // We offset by half the handle size to center the handle on the coordinate.
    const offsetX = handleSize / 2;
    const offsetY = handleSize / 2;

    return {
      position: 'absolute',
      left: `${pin.x - offsetX}px`,
      top: `${pin.y - offsetY}px`,
      background: '#555', // Restore background color
      width: `${handleSize}px`,
      height: `${handleSize}px`,
      borderRadius: '50%',
      zIndex: 10, 
      cursor: 'crosshair',
      border: 'none' // Ensure no default border interferes
    };
  };

  // Render the component's visual representation
  const renderComponentVisual = () => {
    if (data.svgPath) {
      const svgString = data.svgPath;
      if (typeof svgString === 'string' && svgString.trim().startsWith('<svg')) {
        // Render raw SVG inline using dangerouslySetInnerHTML
        // Add a wrapper div to help with styling/positioning if needed
        return (
          <div
            className="component-svg-wrapper"
            dangerouslySetInnerHTML={{ __html: svgString }}
          />
        );
      } else {
        // If svgPath is a URL, render as image (outline might not work well)
        console.warn(`Component ${data.name} uses an image URL, outline selection may not apply.`);
        return (
          <img
            src={svgString} // It's a URL here
            alt={data.name || data.type}
            style={{ display: 'block', maxWidth: '100%', height: 'auto' }}
          />
        );
      }
    } else {
      // Fallback to simple text label
      return (
        <div style={{ padding: '5px', background: 'white', border: '1px dashed #ccc' }}>
          {data.name || data.type}
        </div>
      );
    }
  };

  return (
    // Add conditional class based on selection state
    <div style={nodeStyle} className={clsx('circuit-component-node', { 'selected': selected })}>
      {renderComponentVisual()}
      {/* Conditionally render handles based on data.hideHandles */}
      {!data.hideHandles && data.pins && data.pins.map((pin, index) => {
        // Check if this pin should be highlighted
        const isHighlighted = highlightedPins?.some(hp => hp.nodeId === sourceNodeId && hp.pinIndex === index);
        // Check if this pin is a valid target for a potential connection
        const isValidTarget = highlightedPins?.some(hp => hp.nodeId === sourceNodeId && hp.pinIndex === index && hp.nodeId !== highlightedPins[0]?.nodeId);

        return (
          // Apply handlers and class directly to Handle
          <Handle
            key={pin.name || `pin-${index}`}
            type="source" 
            position={Position.Top} // Position doesn't visually matter due to style override
            id={`pin-${index}`}
            style={getHandleStyle(pin)} // Apply style directly
            className={clsx('circuit-pin-handle', { 'pin-highlighted': isHighlighted })} // Apply class directly
            onMouseEnter={() => handlePinMouseEnter(index)} // Attach hover handlers
            onMouseLeave={handlePinMouseLeave}
            isConnectable={true}
          />
        );
      })}
    </div>
  );
};

export default memo(CircuitComponentNode); 