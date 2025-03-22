
import React from 'react';
import CircuitCanvas from './CircuitCanvas';
import ComponentPanel from './ComponentPanel';
import { Button } from '@/components/ui/button';
import { Play, Save, Undo, Redo } from 'lucide-react';

export const CircuitEditorLayout = () => {
  return (
    <div className="h-full flex flex-col">
      {/* Top toolbar */}
      <div className="bg-white border-b p-2 flex items-center justify-between">
        <div className="text-lg font-semibold text-primary">Circuit Editor</div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Undo className="mr-1 h-4 w-4" />
            Undo
          </Button>
          <Button variant="outline" size="sm">
            <Redo className="mr-1 h-4 w-4" />
            Redo
          </Button>
          <Button variant="outline" size="sm">
            <Save className="mr-1 h-4 w-4" />
            Save
          </Button>
          <Button size="sm">
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
