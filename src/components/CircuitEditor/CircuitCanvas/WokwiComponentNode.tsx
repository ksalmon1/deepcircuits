
import React, { useCallback, useEffect, useRef, useState, memo } from 'react';
import { NodeProps, Handle, Position, useReactFlow } from '@xyflow/react';
import { 
  isWokwiLoaded, 
  renderWokwiElement
} from '@/integrations/wokwi/WokwiIntegration';
import { WokwiNodeData } from '@/types/circuit';
import { useWireSystem } from '@/hooks/useWireSystem';
import { isCustomComponent, renderCustomComponent } from '@/integrations/custom/CustomComponents';

// Define the component with proper typing
function WokwiComponentNode({ id, data, selected }: NodeProps<WokwiNodeData>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [rendered, setRendered] = useState(false);
  const { getNodes } = useReactFlow();
  const { wiringState, startWiring } = useWireSystem([]);
  
  // Calculate handle positions based on pins
  const handlePositions = data.pins?.map((pin, index) => {
    // Handle calculation is relative to the component's top-left corner
    const x = Number(pin.x);
    const y = Number(pin.y);
    
    // Determine which side the pin is closest to
    const isTop = y < 10;
    const isBottom = y > 40;
    const isLeft = x < 10;
    const isRight = x > 40;
    
    let position = Position.Bottom;
    
    if (isTop) position = Position.Top;
    else if (isBottom) position = Position.Bottom;
    else if (isLeft) position = Position.Left;
    else if (isRight) position = Position.Right;
    
    return {
      id: `${id}-${index}`,
      x,
      y,
      position,
      name: pin.name,
      signals: pin.signals || []
    };
  }) || [];
  
  // Render the component when the node is added
  useEffect(() => {
    // Create a function to handle component rendering
    const renderComponent = async () => {
      if (!containerRef.current) return;
      
      containerRef.current.innerHTML = '';
      
      // Try to render directly from SVG path if available
      if (data.svgPath && typeof data.svgPath === 'string' && data.svgPath.trim().startsWith('<svg')) {
        // Insert the SVG directly
        containerRef.current.innerHTML = data.svgPath.trim();
        
        // Find the SVG element and set its attributes for proper scaling
        const svgElement = containerRef.current.querySelector('svg');
        if (svgElement) {
          svgElement.setAttribute('width', '100%');
          svgElement.setAttribute('height', '100%');
          svgElement.setAttribute('preserveAspectRatio', 'xMidYMid meet');
        }
        
        setRendered(true);
        return;
      }
      
      // Create an inner container for the component
      const innerContainer = document.createElement('div');
      const containerId = `wokwi-element-${id}-${Date.now()}`;
      innerContainer.id = containerId;
      innerContainer.style.width = '100%';
      innerContainer.style.height = '100%';
      containerRef.current.appendChild(innerContainer);
      
      try {
        // Choose the rendering method based on component type
        if (data.type && ((isCustomComponent && isCustomComponent(data.type)) || data.isOriginal === false)) {
          // Pass the container element (not the ID) to the custom component renderer
          await renderCustomComponent(data.type, innerContainer, data.attributes || {});
        } else if (data.type) {
          // Ensure Wokwi elements are loaded
          if (!isWokwiLoaded()) {
            console.log('Loading Wokwi elements...');
            await new Promise(resolve => setTimeout(resolve, 500));
          }
          
          console.log(`Rendering Wokwi element ${data.type}`);
          // Pass the container ID (not the element) to the Wokwi renderer
          await renderWokwiElement(data.type, containerId, data.attributes || {});
        }
        
        setRendered(true);
      } catch (error) {
        console.error(`Error rendering component ${data.type}:`, error);
      }
    };
    
    renderComponent();
  }, [data.type, data.svgPath, data.isOriginal, data.attributes, id]);
  
  const handleClickEvent = useCallback(
    (event: React.MouseEvent, handleId: string) => {
      event.stopPropagation();
      
      // If we're already in wiring mode, this will be handled by onConnect
      if (wiringState?.isActive) return;
      
      // Start wiring from this pin
      startWiring(id, handleId);
    },
    [id, wiringState, startWiring]
  );

  return (
    <div
      ref={containerRef}
      className={`wokwi-component ${selected ? 'selected' : ''}`}
      style={{
        position: 'relative',
        minWidth: '50px',
        minHeight: '50px',
        border: selected ? '2px solid #4C72F4' : 'none',
        borderRadius: '2px',
      }}
    >
      {/* Render pins/handles for the component */}
      {handlePositions.map((handle) => (
        <Handle
          key={handle.id}
          id={handle.id}
          type="source"
          position={handle.position}
          style={{
            width: '8px',
            height: '8px',
            background: '#9b87f5',
            border: '1px solid #7E69AB',
            opacity: 0.8,
            left: `${handle.x}px`,
            top: `${handle.y}px`,
            transform: 'translate(-50%, -50%)',
            zIndex: 10,
          }}
          className="pin-handle nodrag"
          onClick={(event) => handleClickEvent(event, handle.id)}
          title={`${handle.name}${handle.signals.length ? ' (' + handle.signals.join(', ') + ')' : ''}`}
        />
      ))}
    </div>
  );
}

export default memo(WokwiComponentNode);
