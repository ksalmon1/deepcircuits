
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
  
  // Get a color based on signal type
  const getSignalColor = (signals: string[] | undefined): string => {
    if (!signals || signals.length === 0) return '#4BC0C0'; // Default to teal
    
    const signal = signals[0].toLowerCase();
    const colors: Record<string, string> = {
      'power': '#FF6384',    // Red
      'ground': '#36A2EB',   // Blue
      'digital': '#4BC0C0',  // Teal
      'analog': '#FFCE56',   // Yellow
      'passive': '#9966FF',  // Purple
      'i2c': '#FF9F40',      // Orange
      'spi': '#C9CBCF',      // Gray
      'uart': '#7CFC00',     // Lime
      'rx': '#FF00FF',       // Magenta
      'tx': '#00FFFF',       // Cyan
    };
    
    // Check if the signal contains any of the color keys
    for (const key of Object.keys(colors)) {
      if (signal.includes(key)) {
        return colors[key];
      }
    }
    
    return colors[signal] || '#4BC0C0'; // Default to teal if no match
  };
  
  // Handle mouse enter for pins with debounce to ensure reliable hovering
  const handlePinMouseEnter = (index: number) => {
    setHoveredPin(index);
  };
  
  // Handle mouse leave for pins
  const handlePinMouseLeave = () => {
    setHoveredPin(null);
  };
  
  return (
    <>
      {pins.map((pin, i) => {
        const pinX = Number(pin.x);
        const pinY = Number(pin.y);
        const isHovered = hoveredPin === i || hoveredPinIndex === i;
        const pinColor = getSignalColor(pin.signals);
        
        return (
          <div 
            key={`pin-${i}`}
            className="absolute pin-marker" 
            style={{
              left: `${pinX}px`,
              top: `${pinY}px`,
              transform: 'translate(-50%, -50%)',
              cursor: readonly ? 'default' : 'pointer',
              zIndex: isHovered ? 30 : 10
            }}
            onMouseEnter={() => handlePinMouseEnter(i)}
            onMouseLeave={handlePinMouseLeave}
            onClick={() => onEditPin(i)}
            data-pin-index={i}
            data-testid={`pin-${i}`}
          >
            <div 
              className="rounded-full flex items-center justify-center transition-all duration-150"
              style={{
                width: isHovered ? '16px' : '12px',
                height: isHovered ? '16px' : '12px',
                backgroundColor: isHovered ? '#FFCE56' : pinColor,
                border: isHovered ? '2px solid rgba(0,0,0,0.7)' : '1px solid rgba(0,0,0,0.3)',
                boxShadow: isHovered ? '0 0 6px rgba(255,206,86,0.6)' : 'none'
              }}
            />
            {isHovered && (
              <div className="absolute text-xs bg-black text-white px-2 py-1 rounded whitespace-nowrap -mt-6 left-1/2 transform -translate-x-1/2 z-20">
                {pin.name || `Pin ${i+1}`}
                {pin.signals && pin.signals.length > 0 && (
                  <span className="ml-1 opacity-70">{pin.signals.join(', ')}</span>
                )}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
};

export default PinVisualizer;
