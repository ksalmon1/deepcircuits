import React, { memo } from 'react';
import { Handle, NodeProps, Position } from '@xyflow/react';
import { CircuitComponent } from '@/types/component';
import { ComponentPin } from '@/types/pin';
import clsx from 'clsx';
import './CircuitCanvas/CircuitComponentNode.css';

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

// Define the props specifically for this node type
interface CustomNodeProps extends NodeProps {
  // Expecting CircuitComponent data, potentially extended 
  // with simulation state/callbacks later
  data: CircuitComponent & { hideHandles?: boolean }; 
}

// Rename for clarity?
const CircuitComponentNode: React.FC<CustomNodeProps> = ({ id, data, selected }) => {
  const handleSize = 8;

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
      position: 'absolute', // Use absolute positioning
      left: `${pin.x - offsetX}px`, // Set left based on pin.x
      top: `${pin.y - offsetY}px`,  // Set top based on pin.y
      background: '#555',
      width: `${handleSize}px`,
      height: `${handleSize}px`,
      borderRadius: '50%',
      // Add border for visibility if needed
      // border: '1px solid white',
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
      {!data.hideHandles && data.pins && data.pins.map((pin, index) => (
        <Handle
          key={pin.name || `pin-${index}`}
          type="source" // Use "source" to match editor functionality
          position={Position.Top} // Position doesn't visually matter due to style override
          id={`pin-${index}`}
          style={getHandleStyle(pin)}
          isConnectable={true}
        />
      ))}
    </div>
  );
};

export default memo(CircuitComponentNode); 