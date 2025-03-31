
import React, { useEffect, memo, useRef } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { WokwiNodeData, WokwiNodeProps } from '@/types/circuit';
import { toast } from 'sonner';
import { getSignalColor } from '@/utils/pinUtils';
import { setupSvgElement, renderSvgContent } from '@/utils/svgUtils';

// Use the WokwiNodeProps interface that correctly extends NodeProps
const WokwiComponentNode = ({ 
  id, 
  data,
  selected
}: WokwiNodeProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const reactFlow = useReactFlow();

  // Safely access data properties with type checking
  const nodeData = data as WokwiNodeData;
  const type = nodeData.type || '';
  const attributes = nodeData.attributes || {};
  const pins = nodeData.pins || [];
  const svgPath = nodeData.svgPath;
  const isOriginal = nodeData.isOriginal;

  useEffect(() => {
    const renderComponent = async () => {
      try {
        if (!containerRef.current) return;
        
        containerRef.current.innerHTML = '';

        console.log(`Rendering component ${id}:`, {
          type,
          isOriginal,
          hasSvgPath: !!svgPath,
          svgPathLength: svgPath?.length || 0,
          svgPathPreview: svgPath ? svgPath.substring(0, 30) + '...' : 'none',
          pins: pins.length
        });

        if (svgPath && svgPath.trim().startsWith('<svg')) {
          console.log(`Rendering SVG for component ${id}`);
          renderSvgContent(containerRef.current, svgPath.trim());
        } else {
          console.log(`Rendering Wokwi element: ${type}`);
          
          const elementId = `wokwi-element-${id}`;
          const elementContainer = document.createElement('div');
          elementContainer.id = elementId;
          containerRef.current.appendChild(elementContainer);
          
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
    border: selected ? '2px solid #4C72F4' : 'none',
    boxShadow: selected ? '0 0 0 2px rgba(76, 114, 244, 0.3)' : 'none',
    padding: '0',
    borderRadius: '4px',
    position: 'relative',
    width: 'auto',
    height: 'auto',
    minWidth: '30px',
    minHeight: '30px',
  };

  const pinContainerStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    zIndex: 20,
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

  const handlePinClick = (event: React.MouseEvent<Element, MouseEvent>, pinIndex: number) => {
    console.log(`Pin ${pinIndex} clicked on component ${id}`);
    
    const handleId = `pin-${pinIndex}`;
    const customEvent = new CustomEvent('handle-click', { 
      detail: { nodeId: id, handleId } 
    });
    document.dispatchEvent(customEvent);
    
    event.stopPropagation();
  };

  return (
    <div id={`node-${id}`} style={nodeStyle}>
      <div ref={containerRef} id={`component-container-${id}`} style={{ width: '100%', height: '100%', position: 'relative' }} />
      
      <div style={pinContainerStyle}>
        {pins && pins.map((pin, index) => {
          const pinColor = getSignalColor(pin.signals && pin.signals.length > 0 ? pin.signals[0] : '');
          
          const handleStyle: React.CSSProperties = {
            top: `${pin.y}px`,
            left: `${pin.x}px`, 
            background: pinColor,
            width: '8px',
            height: '8px',
            zIndex: 10,
            position: 'absolute',
            transform: 'translate(-50%, -50%)',
            cursor: 'pointer',
            pointerEvents: 'auto',
          };
          
          return (
            <Handle
              key={`pin-${index}`}
              id={`pin-${index}`}
              type="source"
              position={Position.Left}
              style={handleStyle}
              className="custom-handle nodrag nopan"
              isConnectable={true}
              title={pin.name}
              onClick={(event) => handlePinClick(event, index)}
            />
          );
        })}
      </div>
    </div>
  );
};

export default memo(WokwiComponentNode);
