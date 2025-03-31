import React, { useState, useEffect, useRef } from 'react';
import { ComponentPin, PinSignalType, SIGNAL_COLOR_MAP } from '@/types/pin';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Edit, Check, Trash2 } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from "@/components/ui/select";

interface PinListProps {
  pins: ComponentPin[];
  readonly?: boolean;
  onDeletePin: (index: number) => void;
  onEditPin: (index: number) => void;
  onHoverPin?: (index: number | null) => void;
  onUpdatePinSignal?: (index: number, signal: string) => void;
  onUpdatePinName?: (index: number, name: string) => void;
}

const AVAILABLE_SIGNALS = [
  "Digital Input",
  "Digital Output",
  "Analog Input", 
  "Analog Output",
  "Power",
  "Ground",
  "Clock",
  "Data",
  "Reset",
  "Passive",
  "I2C",
  "SPI",
  "Custom"
];

/**
 * List of pins with their properties
 * Displays each pin with its name, coordinates, and allows editing
 */
const PinList: React.FC<PinListProps> = ({
  pins,
  readonly = false,
  onDeletePin,
  onEditPin,
  onHoverPin,
  onUpdatePinName,
  onUpdatePinSignal
}) => {
  const [editingPinName, setEditingPinName] = useState<number | null>(null);
  const [editingPinNameValue, setEditingPinNameValue] = useState<string>('');
  
  const inputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    if (editingPinName !== null && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editingPinName]);

  const handleStartEditName = (index: number) => {
    if (readonly) return;
    setEditingPinName(index);
    setEditingPinNameValue(pins[index].name);
  };

  const handleSubmitNameEdit = () => {
    if (editingPinName !== null && editingPinNameValue.trim()) {
      onUpdatePinName(editingPinName, editingPinNameValue.trim());
      setEditingPinName(null);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmitNameEdit();
    } else if (e.key === 'Escape') {
      setEditingPinName(null);
    }
  };

  // Function to get a color based on signal type
  const getSignalColor = (signal: string): string => {
    return SIGNAL_COLOR_MAP[signal.toLowerCase()] || SIGNAL_COLOR_MAP[PinSignalType.OTHER];
  };
  
  if (pins.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500 italic bg-gray-50 rounded">
        No pins defined yet. Click on the component preview to add pins.
      </div>
    );
  }
  
  return (
    <div className="space-y-3 mb-6">
      {pins.map((pin, i) => (
        <div 
          key={i}
          className="border rounded p-2 relative group"
          onMouseEnter={() => onHoverPin(i)}
          onMouseLeave={() => onHoverPin(null)}
        >
          <div className="overflow-hidden flex-grow">
            <div className="font-medium truncate flex items-center gap-1 mb-1">
              <span 
                className="text-white w-5 h-5 rounded-full flex items-center justify-center text-xs"
                style={{ 
                  backgroundColor: pin.signals && pin.signals.length > 0
                    ? getSignalColor(pin.signals[0])
                    : '#4BC0C0' 
                }}
              >
                {i+1}
              </span>
              
              {editingPinName === i ? (
                <div className="flex items-center gap-1 flex-grow">
                  <input
                    ref={inputRef}
                    type="text"
                    value={editingPinNameValue}
                    onChange={(e) => setEditingPinNameValue(e.target.value)}
                    onBlur={handleSubmitNameEdit}
                    onKeyDown={handleKeyPress}
                    className="text-sm border rounded p-1 flex-grow"
                    placeholder="Pin name"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-gray-500"
                    onClick={handleSubmitNameEdit}
                  >
                    <Check className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between w-full">
                  <span className="truncate">{pin.name}</span>
                  {!readonly && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleStartEditName(i)}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              )}
            </div>
            
            <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
              <span>x: {Math.round(Number(pin.x))}, y: {Math.round(Number(pin.y))}</span>
            </div>
            
            {!readonly && (
              <div className="flex items-center gap-2">
                <Select
                  value={pin.signals && pin.signals.length > 0 ? pin.signals[0].toLowerCase() : 'digital'}
                  onValueChange={(value) => onUpdatePinSignal(i, value)}
                >
                  <SelectTrigger className="w-full h-7 text-xs">
                    <SelectValue placeholder="Signal type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="power">Power</SelectItem>
                    <SelectItem value="ground">Ground</SelectItem>
                    <SelectItem value="digital">Digital</SelectItem>
                    <SelectItem value="analog">Analog</SelectItem>
                    <SelectItem value="passive">Passive</SelectItem>
                    <SelectItem value="i2c">I2C</SelectItem>
                    <SelectItem value="spi">SPI</SelectItem>
                    <SelectItem value="uart">UART</SelectItem>
                    <SelectItem value="rx">RX</SelectItem>
                    <SelectItem value="tx">TX</SelectItem>
                  </SelectContent>
                </Select>
                
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-gray-500 hover:text-red-500"
                  onClick={() => onDeletePin(i)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default PinList;
