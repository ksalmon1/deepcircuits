
import React, { useEffect, memo, useRef, useContext } from 'react';
import { Handle, Position, NodeProps, useReactFlow } from '@xyflow/react';
import { WokwiNodeData } from '@/types/circuit';
import { toast } from 'sonner';
import { getWireColorFromSignal } from '@/utils/wireUtils';

interface WokwiComponentNodeProps extends NodeProps {
  data: WokwiNodeData;
}

const WokwiComponentNode = ({ 
  id, 
  data,
  selected
}: WokwiComponentNodeProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const reactFlow = useReactFlow();

  const type = data?.type || '';
  const attributes = data?.attributes || {};
  const pins = data?.pins || [];
  const svgPath = data?.svgPath;
  const isOriginal = data?.isOriginal;

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
          
          containerRef.current.innerHTML = svgPath.trim();
          
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
    boxShadow: selected ? '0 0 8px rgba(76, 114, 244, 0.4)' : 'none',
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

  const getSignalColor = (signals: string[] = []) => {
    if (!signals || signals.length === 0) return '#4BC0C0';
    
    return getWireColorFromSignal(signals[0]);
  };

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
          const pinColor = getSignalColor(pin.signals);
          
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
