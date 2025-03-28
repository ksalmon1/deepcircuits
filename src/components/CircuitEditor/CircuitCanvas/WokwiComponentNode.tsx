
import React, { useEffect, memo } from 'react';
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
  // Ensure data is not undefined and has the correct type
  const safeData: WokwiNodeData = data || { type: '', attributes: {}, pins: [] };
  const { type, attributes, pins = [] } = safeData;
  
  useEffect(() => {
    const elementId = `wokwi-element-${id}`;
    
    const renderWokwiElement = async () => {
      try {
        let elementContainer = document.getElementById(elementId);
        
        if (!elementContainer) {
          elementContainer = document.createElement('div');
          elementContainer.id = elementId;
          
          const nodeElement = document.getElementById(`node-${id}`);
          if (nodeElement) {
            nodeElement.appendChild(elementContainer);
          }
        }
        
        if (elementContainer) {
          elementContainer.innerHTML = '';
          
          const integration = await import('@/integrations/wokwi/WokwiIntegration');
          const customIntegration = await import('@/integrations/custom/CustomComponents');
          
          if (type && customIntegration.isCustomComponent(type)) {
            await customIntegration.renderCustomComponent(type, elementId, attributes);
          } else if (type) {
            await integration.renderWokwiElement(type, elementId, attributes);
          }
        }
      } catch (error) {
        console.error(`Error rendering Wokwi component ${type}:`, error);
        toast.error(`Failed to render component ${type || 'unknown'}`);
      }
    };
    
    renderWokwiElement();
    
    return () => {
      const elementContainer = document.getElementById(elementId);
      if (elementContainer) {
        elementContainer.innerHTML = '';
      }
    };
  }, [id, type, attributes]);
  
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
      <div id={`wokwi-element-${id}`} />
      
      {pins && pins.map((pin, index) => {
        const pinColor = getSignalColor(pin.signals);
        const style = {
          top: pin.y,
          left: pin.x,
          background: pinColor,
          width: '8px',
          height: '8px',
          zIndex: 10
        };
        
        // Each pin can act as both source and target for connections
        return (
          <Handle
            key={`pin-${index}`}
            id={`pin-${index}`}
            type="source"
            position={Position.Right}
            style={style}
            className="custom-handle"
            isConnectable={true}
            title={pin.name}
          />
        );
      })}
    </div>
  );
};

export default memo(WokwiComponentNode);
