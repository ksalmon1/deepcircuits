
import React from 'react';
import { ComponentPin } from '@/types/database';

interface PinVisualizerProps {
  pins: ComponentPin[];
  readonly?: boolean;
  onEditPin: (index: number) => void;
}

/**
 * Visual representation of pins on the component preview
 * Pins are positioned relative to the component's top-left corner (0,0)
 */
const PinVisualizer: React.FC<PinVisualizerProps> = ({
  pins,
  readonly = false,
  onEditPin
}) => {
  return (
    <>
      {pins.map((pin, i) => {
        const pinX = Number(pin.x);
        const pinY = Number(pin.y);
        
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
          >
            <div 
              className={`rounded-full w-5 h-5 flex items-center justify-center ${readonly ? 'bg-blue-200' : 'bg-blue-500 hover:bg-blue-600'} transition-colors`}
              onClick={() => onEditPin(i)}
            >
              <span className="text-white text-xs font-bold">{i+1}</span>
            </div>
            <div className="absolute whitespace-nowrap text-xs -mt-5 left-1/2 transform -translate-x-1/2 bg-white/90 px-1 py-0.5 rounded shadow-sm">
              {pin.name} ({Math.round(pinX)}, {Math.round(pinY)})
            </div>
          </div>
        );
      })}
    </>
  );
};

export default PinVisualizer;
