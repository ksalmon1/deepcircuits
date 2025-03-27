
import React, { useEffect, useState, useRef } from 'react';
import { Handle, Position, NodeProps, NodeResizer } from '@xyflow/react';
import { 
  renderWokwiElement, 
  isWokwiLoaded, 
  WokwiComponent,
  WokwiPin
} from '@/integrations/wokwi/WokwiIntegration';
import { fetchComponentPins } from '@/utils/componentUtils';
import { isCustomComponent, renderCustomComponent } from '@/integrations/custom/CustomComponents';
import { useComponentLibrary } from '@/hooks/useComponentLibrary';

const WokwiComponentNode: React.FC<NodeProps> = ({ id, data, selected }) => {
  const nodeRef = useRef<HTMLDivElement>(null);
  const [pins, setPins] = useState<WokwiPin[]>([]);
  const [showPins, setShowPins] = useState(false);
  const [hoveredPin, setHoveredPin] = useState<number | null>(null);
  const { componentsDetailsMap } = useComponentLibrary();
  
  // Fetch pins and render component when component is ready
  useEffect(() => {
    if (!data?.component || !isWokwiLoaded()) return;
    
    const component = data.component as WokwiComponent;
    
    // Fetch pins for this component type
    const componentPins = fetchComponentPins(component.type);
    setPins(componentPins);
    
    // Render the Wokwi element
    const elementId = `wokwi-element-${id}`;
    
    if (isCustomComponent(component.type)) {
      renderCustomComponent(component.type, elementId, component.attributes);
    } else {
      renderWokwiElement(component.type, elementId, component.attributes);
    }
  }, [id, data?.component]);
  
  // Show/hide pins on hover
  const handleMouseEnter = () => {
    setShowPins(true);
  };
  
  const handleMouseLeave = () => {
    if (!selected) {
      setShowPins(false);
    }
  };
  
  // Select/deselect component
  useEffect(() => {
    if (selected) {
      setShowPins(true);
    } else {
      setShowPins(false);
    }
  }, [selected]);
  
  // Handle pin hover
  const handlePinHover = (index: number) => {
    setHoveredPin(index);
  };
  
  const handlePinLeave = () => {
    setHoveredPin(null);
  };
  
  if (!data?.component) {
    return <div>Invalid Component</div>;
  }
  
  return (
    <div 
      ref={nodeRef}
      className="wokwi-component-node"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onDoubleClick={() => setShowPins(!showPins)}
    >
      {/* Component container */}
      <div id={`wokwi-element-${id}`} className="wokwi-element-container" />
      
      {/* Connection handles for each pin */}
      {pins && pins.length > 0 && showPins && (
        <div className="pin-handles">
          {pins.map((pin, index) => {
            // Calculate position based on pin coordinates relative to component
            const handlePosition = getHandlePosition(pin);
            const isHovered = hoveredPin === index;
            
            return (
              <React.Fragment key={`${id}-pin-${index}`}>
                <Handle
                  type="source"
                  position={handlePosition}
                  id={`pin-${index}-out`}
                  style={{
                    left: pin.x,
                    top: pin.y,
                    width: isHovered ? '12px' : '8px',
                    height: isHovered ? '12px' : '8px',
                    backgroundColor: getPinColor(pin.signals),
                    border: isHovered ? '2px solid #ffffff' : '1px solid rgba(0,0,0,0.3)',
                    zIndex: 10,
                  }}
                  onMouseEnter={() => handlePinHover(index)}
                  onMouseLeave={handlePinLeave}
                />
                <Handle
                  type="target"
                  position={handlePosition}
                  id={`pin-${index}-in`}
                  style={{
                    left: pin.x,
                    top: pin.y,
                    width: isHovered ? '12px' : '8px',
                    height: isHovered ? '12px' : '8px',
                    backgroundColor: getPinColor(pin.signals),
                    border: isHovered ? '2px solid #ffffff' : '1px solid rgba(0,0,0,0.3)',
                    zIndex: 10,
                  }}
                  onMouseEnter={() => handlePinHover(index)}
                  onMouseLeave={handlePinLeave}
                />
                
                {/* Pin tooltip */}
                {isHovered && (
                  <div 
                    className="pin-tooltip"
                    style={{
                      left: pin.x,
                      top: pin.y,
                      transform: 'translate(-50%, -100%)',
                      marginTop: '-5px'
                    }}
                  >
                    {pin.name}
                    {pin.signals && pin.signals.length > 0 && (
                      <span className="pin-signals">
                        ({pin.signals.join(', ')})
                      </span>
                    )}
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
};

// Helper function to determine the proper handle position based on pin coordinates
function getHandlePosition(pin: WokwiPin): Position {
  // This is simplified - ideally you'd use the relative position to determine this
  // If pin is on left side, use Position.Left, etc.
  return Position.Right;
}

// Helper function to get pin color based on signals
function getPinColor(signals: string[] = []): string {
  if (!signals || signals.length === 0) return '#4BC0C0';
  
  const normalizedSignal = signals[0].toLowerCase().trim();
  const signalColors: Record<string, string> = {
    'power': '#FF6384',
    '+5v': '#FF6384',
    '+3.3v': '#FF6384',
    'vcc': '#FF6384',
    'ground': '#36A2EB',
    'gnd': '#36A2EB',
    'digital': '#4BC0C0',
    'analog': '#FFCE56',
    'passive': '#9966FF',
    'i2c': '#FF9F40',
    'spi': '#C9CBCF',
    'uart': '#7CFC00',
    'rx': '#FF00FF',
    'tx': '#00FFFF',
  };
  
  for (const [key, color] of Object.entries(signalColors)) {
    if (normalizedSignal.includes(key)) {
      return color;
    }
  }
  
  return '#4BC0C0';
}

export default WokwiComponentNode;
