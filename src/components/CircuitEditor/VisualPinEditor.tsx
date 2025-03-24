
import React, { useState, useRef, useEffect } from 'react';
import { Move, Plus, X } from 'lucide-react';
import { Button } from "@/components/ui/button";

interface PinConfig {
  name: string;
  x: number;
  y: number;
  signals: string[];
}

interface VisualPinEditorProps {
  pins: PinConfig[];
  componentType: string;
  onChange: (pins: PinConfig[]) => void;
}

const VisualPinEditor: React.FC<VisualPinEditorProps> = ({ pins, componentType, onChange }) => {
  const [draggedPin, setDraggedPin] = useState<number | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const [editorSize, setEditorSize] = useState({ width: 0, height: 0 });
  const [showGrid, setShowGrid] = useState(true);

  useEffect(() => {
    if (editorRef.current) {
      const { width, height } = editorRef.current.getBoundingClientRect();
      setEditorSize({ width, height });
    }
  }, []);

  const handlePinDragStart = (index: number) => {
    setDraggedPin(index);
  };

  const handleEditorClick = (e: React.MouseEvent) => {
    if (draggedPin === null) return;
    
    const rect = editorRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = Math.round((e.clientX - rect.left) / 10) * 10;
    const y = Math.round((e.clientY - rect.top) / 10) * 10;

    const updatedPins = [...pins];
    updatedPins[draggedPin] = {
      ...updatedPins[draggedPin],
      x,
      y
    };

    onChange(updatedPins);
    setDraggedPin(null);
  };

  const addNewPin = () => {
    const newPin = {
      name: `Pin ${pins.length + 1}`,
      x: 50,
      y: 50,
      signals: ['digital']
    };
    onChange([...pins, newPin]);
  };

  const removePin = (index: number) => {
    const updatedPins = pins.filter((_, i) => i !== index);
    onChange(updatedPins);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Visual Pin Configuration</h3>
        <div className="space-x-2">
          <Button onClick={() => setShowGrid(!showGrid)} size="sm" variant="outline">
            {showGrid ? "Hide Grid" : "Show Grid"}
          </Button>
          <Button onClick={addNewPin} size="sm">Add Pin</Button>
        </div>
      </div>

      <div 
        ref={editorRef}
        className="border rounded-md relative h-[300px] overflow-hidden cursor-crosshair"
        onClick={handleEditorClick}
      >
        {showGrid && (
          <div className="component-grid absolute inset-0"></div>
        )}

        {/* Component visual representation */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 p-4">
          {componentType && (
            <div className="component-preview-container">
              <div id="pinEditor-component-preview"></div>
            </div>
          )}
        </div>

        {/* Pin markers */}
        {pins.map((pin, index) => (
          <div
            key={`pin-${index}`}
            className={`pin-marker ${draggedPin === index ? 'ring-2 ring-primary' : ''}`}
            style={{ 
              left: `${pin.x}px`, 
              top: `${pin.y}px`,
              backgroundColor: getSignalColor(pin.signals[0]) 
            }}
            data-pin-name={pin.name}
            onMouseDown={() => handlePinDragStart(index)}
          >
            <button 
              className="absolute -top-5 -right-5 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center"
              onClick={(e) => {
                e.stopPropagation();
                removePin(index);
              }}
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}

        {/* Drag instruction */}
        {draggedPin !== null && (
          <div className="absolute top-4 left-4 bg-black bg-opacity-70 text-white p-2 rounded text-sm">
            Click to place pin
          </div>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4">
        {pins.map((pin, index) => (
          <div key={`pin-details-${index}`} className="border p-3 rounded-md">
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium text-sm">Pin {index + 1}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => handlePinDragStart(index)}
              >
                <Move className="h-3 w-3" />
              </Button>
            </div>
            <div className="text-xs space-y-1">
              <div>Name: <span className="font-mono">{pin.name}</span></div>
              <div>Position: <span className="font-mono">({pin.x}, {pin.y})</span></div>
              <div>Signal: <span className="font-mono">{pin.signals.join(', ')}</span></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

function getSignalColor(signal: string): string {
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
  
  return colors[signal] || '#4BC0C0';
}

export default VisualPinEditor;
