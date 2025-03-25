
import React, { useState } from 'react';
import { ComponentPin } from '@/types/database';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X } from 'lucide-react';
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
  "Custom"
];

/**
 * Displays a list of pins with their details and provides controls to edit or delete them
 */
const PinList: React.FC<PinListProps> = ({ 
  pins, 
  readonly = false,
  onDeletePin, 
  onEditPin,
  onHoverPin,
  onUpdatePinSignal
}) => {
  if (pins.length === 0) {
    return (
      <div className="text-xs text-center text-muted-foreground p-2">
        {readonly ? "No pins defined" : "Click on the diagram to add pins"}
      </div>
    );
  }

  const handleSignalChange = (index: number, value: string) => {
    if (onUpdatePinSignal) {
      onUpdatePinSignal(index, value);
    }
  };

  return (
    <div className="space-y-1 max-h-[250px] overflow-y-auto pr-1">
      {pins.map((pin, i) => (
        <div 
          key={i} 
          className="flex items-center justify-between p-2 border rounded hover:bg-gray-50"
          onMouseEnter={() => onHoverPin && onHoverPin(i)}
          onMouseLeave={() => onHoverPin && onHoverPin(null)}
          onClick={() => !readonly && onEditPin(i)}
        >
          <div className="overflow-hidden flex-grow">
            <div className="font-medium truncate flex items-center gap-1">
              <span className="bg-blue-500 text-white w-4 h-4 rounded-full flex items-center justify-center text-xs">{i+1}</span>
              {pin.name}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              x: {Math.round(Number(pin.x))}, y: {Math.round(Number(pin.y))}
            </div>
            <div className="flex flex-wrap gap-1 mt-1">
              {!readonly ? (
                <Select 
                  value={(pin.signals && pin.signals[0]) || ""}
                  onValueChange={(value) => handleSignalChange(i, value)}
                >
                  <SelectTrigger className="h-7 w-full text-xs">
                    <SelectValue placeholder="Select signal type" />
                  </SelectTrigger>
                  <SelectContent>
                    {AVAILABLE_SIGNALS.map(signal => (
                      <SelectItem key={signal} value={signal} className="text-xs">
                        {signal}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                pin.signals && pin.signals.length > 0 ? (
                  pin.signals.map((signal, j) => (
                    <Badge key={j} variant="outline" className="text-xs">{signal}</Badge>
                  ))
                ) : (
                  <span className="text-xs text-muted-foreground">No signals</span>
                )
              )}
            </div>
          </div>
          {!readonly && (
            <Button 
              size="icon" 
              variant="ghost" 
              className="h-6 w-6 ml-2 flex-shrink-0" 
              onClick={(e) => {
                e.stopPropagation();
                onDeletePin(i);
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      ))}
    </div>
  );
};

export default PinList;
