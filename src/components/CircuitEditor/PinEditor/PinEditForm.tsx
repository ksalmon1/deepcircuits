
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface PinEditFormProps {
  pinName: string;
  pinSignals: string;
  onPinNameChange: (name: string) => void;
  onPinSignalsChange: (signals: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

/**
 * Form for editing pin properties
 */
const PinEditForm: React.FC<PinEditFormProps> = ({
  pinName,
  pinSignals,
  onPinNameChange,
  onPinSignalsChange,
  onSave,
  onCancel
}) => {
  return (
    <div className="mb-3 space-y-2">
      <div>
        <label className="text-xs font-medium">Name:</label>
        <Input 
          value={pinName} 
          onChange={(e) => onPinNameChange(e.target.value)} 
          className="h-7 text-sm"
        />
      </div>
      <div>
        <label className="text-xs font-medium">Signals (comma-separated):</label>
        <Input 
          value={pinSignals} 
          onChange={(e) => onPinSignalsChange(e.target.value)} 
          className="h-7 text-sm"
        />
      </div>
      <div className="flex justify-end gap-1">
        <Button size="sm" onClick={onSave}>Save</Button>
        <Button size="sm" variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
};

export default PinEditForm;
