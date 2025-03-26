
import React, { useCallback, useState } from 'react';
import { WokwiComponent, WokwiPin } from '@/integrations/wokwi/WokwiIntegration';
import { isCustomComponent, renderCustomComponent } from '@/integrations/custom/CustomComponents';
import { renderWokwiElement } from '@/integrations/wokwi/WokwiIntegration';
import { isInteractingWithPin } from '@/utils/wireUtils';

interface ComponentLayerProps {
  components: WokwiComponent[];
  hoveredComponent: string | null;
  setHoveredComponent: (id: string | null) => void;
  visiblePins: { [componentId: string]: boolean };
  togglePinVisibility: (componentId: string) => void;
  hoveredPin: { componentId: string; pinIndex: number } | null;
  handlePinHover: (componentId: string, pinIndex: number) => void;
  handlePinHoverExit: () => void;
  handlePinClick: (componentId: string, pinIndex: number, x: number, y: number) => void;
  handleComponentMouseDown: (e: React.MouseEvent, componentId: string) => void;
  activeWire: any | null;
  potentialTargetRef: React.MutableRefObject<{ componentId: string; pinIndex: number } | null>;
  renderedComponents: Record<string, boolean>;
  setRenderedComponents: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  fetchComponentPins: (type: string) => WokwiPin[];
}

const ComponentLayer: React.FC<ComponentLayerProps> = ({
  components,
  hoveredComponent,
  setHoveredComponent,
  visiblePins,
  togglePinVisibility,
  hoveredPin,
  handlePinHover,
  handlePinHoverExit,
  handlePinClick,
  handleComponentMouseDown,
  activeWire,
  potentialTargetRef,
  renderedComponents,
  setRenderedComponents,
  fetchComponentPins
}) => {
  const handleComponentHover = useCallback((id: string, type: string) => {
    setHoveredComponent(id);
    
    const element = document.getElementById(`wokwi-element-${id}`);
    if (element && element.firstChild) {
      (element.firstChild as HTMLElement).style.outline = '2px solid #4C72F4';
      (element.firstChild as HTMLElement).style.outlineOffset = '2px';
    }
  }, [setHoveredComponent]);

  const handleComponentHoverExit = useCallback(() => {
    if (hoveredComponent) {
      const element = document.getElementById(`wokwi-element-${hoveredComponent}`);
      if (element && element.firstChild) {
        (element.firstChild as HTMLElement).style.outline = 'none';
      }
    }
    
    setHoveredComponent(null);
  }, [hoveredComponent, setHoveredComponent]);

  const renderComponent = (component: WokwiComponent) => {
    const { type, id, top, left } = component;
    
    const pins = component.pins || fetchComponentPins(type);
    
    const showPins = visiblePins[id] || 
                    hoveredComponent === id || 
                    (activeWire && (activeWire.sourceComponentId === id || 
                                  (potentialTargetRef && potentialTargetRef.current?.componentId === id)));
    
    // Render the actual component if it hasn't been rendered yet                            
    if (!renderedComponents[id]) {
      console.log(`Rendering component ${type} with id ${id}`);
      
      const elementId = `wokwi-element-${id}`;
      const element = document.getElementById(elementId);
      
      if (element) {
        if (isCustomComponent(type)) {
          renderCustomComponent(type, elementId, component.attributes);
        } else {
          renderWokwiElement(type, elementId, component.attributes);
        }
        
        setRenderedComponents(prev => ({
          ...prev,
          [id]: true
        }));
      }
    }
    
    return (
      <div 
        key={id}
        id={`wokwi-element-wrapper-${id}`}
        className="absolute"
        style={{ 
          top: `${top}px`, 
          left: `${left}px`,
          cursor: 'grab'
        }}
        onMouseDown={(e) => handleComponentMouseDown(e, id)}
        onMouseEnter={() => handleComponentHover(id, type)}
        onMouseLeave={handleComponentHoverExit}
        onDoubleClick={() => togglePinVisibility(id)}
      >
        <div id={`wokwi-element-${id}`}></div>
        
        {showPins && pins && pins.length > 0 && (
          <div className="absolute top-0 left-0 z-30 pointer-events-none">
            {pins.map((pin, index) => {
              const signalColor = pin.signals && pin.signals.length > 0 
                ? (() => {
                    const normalizedSignal = pin.signals[0].toLowerCase().trim();
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
                  })()
                : '#4BC0C0';
                
              const isPotentialTarget = activeWire && 
                activeWire.sourceComponentId !== id && 
                hoveredPin?.componentId === id && 
                hoveredPin?.pinIndex === index;
                
              return (
                <div 
                  key={`pin-${id}-${index}`}
                  className="absolute pin-marker pointer-events-auto"
                  style={{ 
                    left: `${pin.x}px`, 
                    top: `${pin.y}px`,
                    backgroundColor: signalColor,
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    transform: 'translate(-50%, -50%)',
                    border: isPotentialTarget ? '2px solid white' : '1px solid rgba(0,0,0,0.3)',
                    boxShadow: isPotentialTarget ? '0 0 0 2px rgba(0,0,0,0.3)' : 'none',
                    cursor: 'pointer',
                    zIndex: 20
                  }}
                  onMouseEnter={() => handlePinHover(id, index)}
                  onMouseLeave={handlePinHoverExit}
                  onClick={(e) => {
                    e.stopPropagation();
                    const pinPos = {
                      x: component.left + pin.x,
                      y: component.top + pin.y
                    };
                    handlePinClick(id, index, pinPos.x, pinPos.y);
                  }}
                />
              );
            })}
          </div>
        )}
        
        {hoveredPin && hoveredPin.componentId === id && pins && pins[hoveredPin.pinIndex] && (
          <div 
            className="absolute z-40 bg-black text-white text-xs px-1 py-0.5 rounded-sm opacity-80"
            style={{ 
              top: `${pins[hoveredPin.pinIndex].y}px`, 
              left: `${pins[hoveredPin.pinIndex].x}px`, 
              transform: 'translate(-50%, -100%)',
              marginTop: '-5px'
            }}
          >
            {pins[hoveredPin.pinIndex].name}
            {pins[hoveredPin.pinIndex].signals && pins[hoveredPin.pinIndex].signals.length > 0 && (
              <span className="text-xs opacity-70 ml-1">
                ({pins[hoveredPin.pinIndex].signals.join(', ')})
              </span>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {components.map(component => renderComponent(component))}
    </>
  );
};

export default ComponentLayer;
