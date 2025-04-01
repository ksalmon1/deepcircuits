import React, { memo } from 'react';
import { Handle, NodeProps } from '@xyflow/react';
import { CircuitComponent } from '@/types/component';
import { ComponentPin } from '@/types/pin';

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

  // Basic styling
  const nodeStyle: React.CSSProperties = {
    border: selected ? '2px solid #9b87f5' : '1px solid #ccc',
    // Remove padding to align handle coordinates with visual element origin
    // padding: '10px', 
    borderRadius: '5px',
    background: 'white',
    // Let the content (SVG/Text) determine alignment if needed
    // textAlign: 'center',
    fontSize: '10px', // Keep font size for fallback text
    position: 'relative', 
    // Add line-height to prevent container collapse if only text is shown
    lineHeight: '0', // Helps when only image is present
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

  // Render the component's visual representation based ONLY on svgPath
  const renderComponentVisual = () => {
    // Remove check for componentRegistry
    /* 
    const CustomComponent = componentRegistry[data.type];
    if (CustomComponent) {
      try {
          return <CustomComponent {...data} />;
      } catch (error) {
          console.error(`Error rendering custom component <${data.type}>:`, error);
          return <div>{data.name || data.type} (Render Error)</div>;
      }
    }
    */
    
    // Render ONLY based on svgPath or fallback to text
    if (data.svgPath) {
      let imageSrc = data.svgPath;
      if (typeof imageSrc === 'string' && imageSrc.trim().startsWith('<svg')) {
        try {
          const base64Svg = btoa(imageSrc);
          imageSrc = `data:image/svg+xml;base64,${base64Svg}`;
        } catch (error) {
          console.error("Error encoding SVG to Base64:", error);
          return <div>{data.name || data.type} (SVG Error)</div>;
        }
      }
      
      return (
        <img 
          src={imageSrc}
          alt={data.name || data.type} 
          style={{ display: 'block', maxWidth: '100%', height: 'auto' }}
          onError={(e) => {
            console.error("Error loading image:", imageSrc, e);
          }}
        />
      );
    } else {
      // Fallback to simple text label
      return (
        // Add padding ONLY for text fallback for better appearance
        <div style={{ padding: '5px' }}>{data.name || data.type}</div>
      );
    }
  };

  return (
    <div style={nodeStyle}>
      {renderComponentVisual()}
      {/* Conditionally render handles based on data.hideHandles */}
      {!data.hideHandles && data.pins && data.pins.map((pin, index) => (
        <Handle
          key={pin.name || `pin-${index}`}
          type="source" 
          id={`pin-${index}`}
          style={getHandleStyle(pin)}
          isConnectable={true}
        />
      ))}
    </div>
  );
};

export default memo(CircuitComponentNode); // Renamed export 