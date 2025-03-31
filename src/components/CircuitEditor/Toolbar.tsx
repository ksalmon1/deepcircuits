
import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  Play, Pause, Save, Undo, Redo, 
  Download, Upload, Code, RotateCcw, ZoomIn, ZoomOut, Trash
} from 'lucide-react';
import { useCircuitEditor } from '@/context/CircuitEditorContext';

interface ToolbarProps {
  isSimulationRunning: boolean;
  toggleSimulation: () => void;
  saveProject: () => void;
  undoLastAction: () => void;
  exportProject: () => void;
  importProject: () => void;
}

/**
 * Toolbar with actions for the circuit editor
 * This is a transitional component that will eventually use context directly
 */
const Toolbar: React.FC<ToolbarProps> = ({
  isSimulationRunning,
  toggleSimulation,
  saveProject,
  undoLastAction,
  exportProject,
  importProject
}) => {
  return (
    <div className="bg-background border-b p-2 flex items-center justify-between">
      <div className="flex items-center space-x-2">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={toggleSimulation}
          className={isSimulationRunning ? "bg-red-100" : ""}
        >
          {isSimulationRunning ? (
            <>
              <Pause className="h-4 w-4 mr-1" /> Stop
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-1" /> Run
            </>
          )}
        </Button>
        
        <Button variant="outline" size="sm" onClick={saveProject}>
          <Save className="h-4 w-4 mr-1" /> Save
        </Button>
        
        <Button variant="outline" size="sm" onClick={undoLastAction}>
          <Undo className="h-4 w-4 mr-1" /> Undo
        </Button>
      </div>
      
      <div className="flex items-center space-x-2">
        <Button variant="outline" size="sm" onClick={exportProject}>
          <Download className="h-4 w-4 mr-1" /> Export
        </Button>
        
        <Button variant="outline" size="sm" onClick={importProject}>
          <Upload className="h-4 w-4 mr-1" /> Import
        </Button>
      </div>
    </div>
  );
};

/**
 * Context-aware version of Toolbar
 * This will eventually replace the prop-based version
 */
export const ContextToolbar = () => {
  const { 
    isSimulationRunning, 
    toggleSimulation, 
    saveProject, 
    undoLastAction, 
    exportProject, 
    importProject 
  } = useCircuitEditor();
  
  return (
    <Toolbar 
      isSimulationRunning={isSimulationRunning}
      toggleSimulation={toggleSimulation}
      saveProject={saveProject}
      undoLastAction={undoLastAction}
      exportProject={exportProject}
      importProject={importProject}
    />
  );
};

export default Toolbar;
