
import React, { useState } from 'react';
import { ComponentPin } from '@/types/database';

interface PinVisualizerProps {
  pins: ComponentPin[];
  readonly?: boolean;
  onEditPin: (index: number) => void;
  componentElement?: HTMLElement | null;
  hoveredPinIndex?: number | null;
}

/**
 * Visual representation of pins on the component preview
 * Pins are positioned relative to the component's top-left corner (0,0)
 */
const PinVisualizer: React.FC<PinVisualizerProps> = ({
  pins,
  readonly = false,
  onEditPin,
  componentElement,
  hoveredPinIndex
}) => {
  const [hoveredPin, setHoveredPin] = useState<number | null>(null);
  
  return (
    <>
      {pins.map((pin, i) => {
        const pinX = Number(pin.x);
        const pinY = Number(pin.y);
        const isHovered = hoveredPin === i || hoveredPinIndex === i;
        
        return (
          <div 
            key={i} 
            className="absolute" 
            style={{
              left: `${pinX}px`,
              top: `${pinY}px`,
              transform: 'translate(-50%, -50%)',
              cursor: readonly ? 'default' : 'move',
              zIndex: 10
            }}
            onMouseEnter={() => setHoveredPin(i)}
            onMouseLeave={() => setHoveredPin(null)}
          >
            <div 
              className={`rounded-full flex items-center justify-center ${isHovered ? 'bg-yellow-400' : readonly ? 'bg-blue-200' : 'bg-blue-500 hover:bg-blue-600'} transition-colors`}
              style={{
                width: '6px',
                height: '6px',
                border: '1px solid rgba(0,0,0,0.3)',
                boxShadow: isHovered ? '0 0 0 2px rgba(255, 204, 0, 0.5)' : 'none'
              }}
              onClick={() => onEditPin(i)}
            />
          </div>
        );
      })}
    </>
  );
};

export default PinVisualizer;
