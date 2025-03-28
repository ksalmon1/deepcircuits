
import React from 'react';
import { Button } from '@/components/ui/button';
import { PlayCircle, StopCircle, Save, Undo, Download, Upload } from 'lucide-react';

interface ToolbarProps {
  isSimulationRunning: boolean;
  toggleSimulation: () => void;
  saveProject: () => void;
  undoLastAction: () => void;
  exportProject: () => void;
  importProject: () => void;
}

const Toolbar: React.FC<ToolbarProps> = ({
  isSimulationRunning,
  toggleSimulation,
  saveProject,
  undoLastAction,
  exportProject,
  importProject
}) => {
  return (
    <div className="flex items-center gap-2 p-2 border-b">
      <Button 
        size="sm" 
        variant={isSimulationRunning ? "destructive" : "default"}
        onClick={toggleSimulation}
      >
        {isSimulationRunning ? (
          <>
            <StopCircle className="mr-1 h-4 w-4" />
            Stop
          </>
        ) : (
          <>
            <PlayCircle className="mr-1 h-4 w-4" />
            Run
          </>
        )}
      </Button>
      
      <Button size="sm" variant="outline" onClick={saveProject}>
        <Save className="mr-1 h-4 w-4" />
        Save
      </Button>
      
      <Button size="sm" variant="outline" onClick={undoLastAction} disabled={true}>
        <Undo className="mr-1 h-4 w-4" />
        Undo
      </Button>
      
      <div className="ml-auto flex gap-2">
        <Button size="sm" variant="outline" onClick={exportProject}>
          <Download className="mr-1 h-4 w-4" />
          Export
        </Button>
        
        <Button size="sm" variant="outline" onClick={importProject}>
          <Upload className="mr-1 h-4 w-4" />
          Import
        </Button>
      </div>
    </div>
  );
};

export default Toolbar;
