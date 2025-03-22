
import React, { useState } from 'react';
import CircuitCanvas from './CircuitCanvas';
import ComponentPanel from './ComponentPanel';
import { Button } from '@/components/ui/button';
import { Play, Save, Undo, Redo, Trash2, Download, Upload } from 'lucide-react';
import { toast } from 'sonner';

export const CircuitEditorLayout = () => {
  const [circuitName, setCircuitName] = useState<string>('Untitled Circuit');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const handleSaveCircuit = () => {
    setIsSaving(true);
    // Simulate a save operation
    setTimeout(() => {
      setIsSaving(false);
      toast.success('Circuit saved successfully', {
        description: `${circuitName} has been saved`,
      });
    }, 800);
  };

  const handleSimulate = () => {
    toast.info('Starting simulation...', {
      description: 'Simulation feature will be available in the next update',
    });
  };

  const handleClearCircuit = () => {
    toast.warning('Clear circuit?', {
      description: 'This will remove all components from the canvas',
      action: {
        label: 'Clear',
        onClick: () => {
          // We'll implement this in a future step
          toast.success('Circuit cleared');
        },
      },
    });
  };

  return (
    <div className="h-full flex flex-col">
      {/* Top toolbar */}
      <div className="bg-white border-b p-2 flex items-center justify-between">
        <div className="flex items-center">
          <div className="text-lg font-semibold text-primary mr-4">Circuit Editor</div>
          <input
            type="text"
            value={circuitName}
            onChange={(e) => setCircuitName(e.target.value)}
            className="border rounded px-2 py-1 text-sm w-64"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleClearCircuit}>
            <Trash2 className="mr-1 h-4 w-4" />
            Clear
          </Button>
          <Button variant="outline" size="sm">
            <Undo className="mr-1 h-4 w-4" />
            Undo
          </Button>
          <Button variant="outline" size="sm">
            <Redo className="mr-1 h-4 w-4" />
            Redo
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleSaveCircuit}
            disabled={isSaving}
          >
            <Save className="mr-1 h-4 w-4" />
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
          <Button 
            size="sm"
            onClick={handleSimulate}
          >
            <Play className="mr-1 h-4 w-4" />
            Simulate
          </Button>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex">
        {/* Left panel - Component palette */}
        <div className="w-64 border-r bg-gray-50 p-4 overflow-y-auto">
          <ComponentPanel />
        </div>

        {/* Main canvas area */}
        <div className="flex-1 overflow-hidden">
          <CircuitCanvas />
        </div>
      </div>
    </div>
  );
};

export default CircuitEditorLayout;
