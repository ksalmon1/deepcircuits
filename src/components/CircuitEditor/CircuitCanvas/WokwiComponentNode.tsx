
import React, { useEffect, memo, useRef } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { WokwiNodeData } from '@/types/circuit';
import { toast } from 'sonner';

// Define the component props correctly
interface WokwiComponentNodeProps extends NodeProps {
  data: WokwiNodeData;
}

const WokwiComponentNode = ({ 
  id, 
  data,
  selected
}: WokwiComponentNodeProps) => {
  // Create a ref for the component container
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Ensure data is not undefined and has the correct type
  const safeData: WokwiNodeData = data || { type: '', attributes: {}, pins: [] };
  const { type, attributes, pins = [], svgPath, isOriginal } = safeData;
  
  useEffect(() => {
    const renderComponent = async () => {
      try {
        if (!containerRef.current) return;
        
        // Clear the container
        containerRef.current.innerHTML = '';

        console.log(`Component ${id}: type=${type}, isOriginal=${isOriginal}, svgPath exists=${!!svgPath}`);
        
        // Check if this is a custom SVG component - improve the condition logic
        const isCustomSvgComponent = !!svgPath;
        
        if (isCustomSvgComponent) {
          console.log(`Rendering custom SVG component: ${type}, svgPath length: ${svgPath.length}`);
          
          // Set the SVG content directly (ensure SVG content is trusted)
          containerRef.current.innerHTML = svgPath;
          
          // Get the SVG element and ensure it has appropriate attributes
          const svgElement = containerRef.current.querySelector('svg');
          if (svgElement) {
            if (!svgElement.hasAttribute('width')) {
              svgElement.setAttribute('width', '100%');
            }
            if (!svgElement.hasAttribute('height')) {
              svgElement.setAttribute('height', '100%');
            }
            svgElement.setAttribute('preserveAspectRatio', 'xMidYMid meet');
          } else {
            console.warn(`SVG element not found in svgPath for component ${id}`);
          }
        } else {
          console.log(`Rendering Wokwi element: ${type}`);
          
          // Create an element ID for the Wokwi component
          const elementId = `wokwi-element-${id}`;
          
          // Create a container for the Wokwi element
          const elementContainer = document.createElement('div');
          elementContainer.id = elementId;
          containerRef.current.appendChild(elementContainer);
          
          // Render the Wokwi element
          const integration = await import('@/integrations/wokwi/WokwiIntegration');
          const customIntegration = await import('@/integrations/custom/CustomComponents');
          
          if (type && customIntegration.isCustomComponent(type)) {
            await customIntegration.renderCustomComponent(type, elementId, attributes);
          } else if (type) {
            await integration.renderWokwiElement(type, elementId, attributes);
          }
        }
      } catch (error) {
        console.error(`Error rendering component ${type}:`, error);
        toast.error(`Failed to render component ${type || 'unknown'}`);
      }
    };
    
    renderComponent();
    
    return () => {
      // Clean up when the component unmounts
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [id, type, attributes, svgPath, isOriginal]);
  
  useEffect(() => {
    const nodeElement = document.getElementById(`node-${id}`);
    if (nodeElement) {
      nodeElement.setAttribute('data-component-id', id);
      nodeElement.setAttribute('data-component-type', type || '');
    }
  }, [id, type]);
  
  const nodeStyle: React.CSSProperties = {
    background: 'transparent',
    border: selected ? '1px dashed #4C72F4' : 'none',
    padding: selected ? '8px' : '0',
    borderRadius: '4px',
    position: 'relative',
    width: 'auto',
    height: 'auto',
    minWidth: '30px',
    minHeight: '30px',
  };
  
  useEffect(() => {
    const nodeElement = document.getElementById(`node-${id}`);
    if (nodeElement) {
      nodeElement.ondragstart = (e) => {
        e.preventDefault();
        return false;
      };
    }
  }, [id]);
  
  const getSignalColor = (signals: string[] = []) => {
    if (!signals || signals.length === 0) return '#4BC0C0';
    
    const signal = signals[0].toLowerCase();
    
    if (signal.includes('power') || signal.includes('+5v') || signal.includes('+3.3v') || signal.includes('vcc')) {
      return '#FF6384';
    }
    if (signal.includes('ground') || signal.includes('gnd')) {
      return '#36A2EB';
    }
    if (signal.includes('analog')) {
      return '#FFCE56';
    }
    if (signal.includes('i2c')) {
      return '#FF9F40';
    }
    if (signal.includes('spi')) {
      return '#C9CBCF';
    }
    if (signal.includes('uart') || signal.includes('rx') || signal.includes('tx')) {
      return '#7CFC00';
    }
    
    return '#4BC0C0';
  };
  
  return (
    <div id={`node-${id}`} style={nodeStyle}>
      <div ref={containerRef} id={`component-container-${id}`} style={{ width: '100%', height: '100%' }} />
      
      {pins && pins.map((pin, index) => {
        const pinColor = getSignalColor(pin.signals);
        
        // Use absolute positioning for the handles based on pin coordinates
        const handleStyle: React.CSSProperties = {
          top: `${pin.y}px`,
          left: `${pin.x}px`, 
          background: pinColor,
          width: '8px',
          height: '8px',
          zIndex: 10,
          position: 'absolute',
          transform: 'translate(-50%, -50%)',
        };
        
        // Each pin can act as both source and target for connections
        return (
          <Handle
            key={`pin-${index}`}
            id={`pin-${index}`}
            type="source"
            position={Position.Left} // Default position for React Flow's internal use
            style={handleStyle}
            className="custom-handle nodrag"
            isConnectable={true}
            title={pin.name}
          />
        );
      })}
    </div>
  );
};

export default memo(WokwiComponentNode);
