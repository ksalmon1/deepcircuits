import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  Play, Pause, Save, Undo, Redo, 
  Download, Upload, Code, RotateCcw, ZoomIn, ZoomOut, Trash
} from 'lucide-react';
import { useProject, useSimulation } from '@/context/CircuitEditorContext';

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
 * Context-aware toolbar component for the circuit editor.
 * 
 * @requires ProjectProvider - Required for project actions through useProject
 * @requires CircuitEditorProvider - Required for simulation state through useSimulation
 * 
 * This component must be used within the necessary providers, either:
 * 1. Inside CircuitEditorPage which provides all required contexts
 * 2. Wrapped with withCircuitProviders HOC
 */
export const ContextToolbar = () => {
  const { 
    saveProject, 
    undoLastAction, 
    exportProject, 
    importProject 
  } = useProject();
  
  const {
    isSimulationRunning,
    toggleSimulation
  } = useSimulation();
  
  // Create wrapper functions to match expected prop types
  const handleSave = () => {
    // You might want to get projectId and projectName from context or elsewhere
    saveProject('default', 'My Circuit');
  };
  
  const handleImport = () => {
    // Add default or empty project data
    importProject({ components: [], wires: [], code: '' });
  };
  
  return (
    <Toolbar 
      isSimulationRunning={isSimulationRunning}
      toggleSimulation={toggleSimulation}
      saveProject={handleSave}
      undoLastAction={undoLastAction}
      exportProject={exportProject}
      importProject={handleImport}
    />
  );
};

export default Toolbar;
