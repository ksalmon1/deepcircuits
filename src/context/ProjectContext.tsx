import React, { createContext, useContext, useState, useCallback, ReactNode, useMemo } from 'react';
import { CircuitComponent } from '@/types/component';
import { WireEdge } from '@/types/circuit';
import { toast } from 'sonner';
import { ComponentError, withErrorHandling } from '@/utils/errorHandling';
import { useError } from './ErrorContext';
import { useAuth } from '@/context/AuthContext';
import { saveProjectToSupabase, getProjectById } from '@/integrations/supabase/projectsApi';

// Define the shape of the state managed by history
interface ProjectState {
  components: CircuitComponent[];
  wires: WireEdge[];
  code: string;
}

// Define the shape of the combined history state
interface HistoryState {
  history: ProjectState[];
  currentIndex: number;
}

interface ProjectContextType {
  // Provide current state values
  components: CircuitComponent[];
  wires: WireEdge[]; 
  code: string;

  // Drag state
  draggingComponentType: string | null;

  // Remove direct setters
  // setComponents: React.Dispatch<React.SetStateAction<CircuitComponent[]>>;
  // setWires: React.Dispatch<React.SetStateAction<WireEdge[]>>;
  setCode: (newCode: string) => void;

  // Action handlers
  handleComponentsChange: (updatedComponents: CircuitComponent[]) => void;
  handleWiresChange: (updatedWires: WireEdge[]) => void;
  updateCode: (newCode: string) => void; // New handler for code changes
  handleUpdateComponentAttributes: (componentId: string, attributes: Record<string, any>) => void;
  rotateComponent: (componentId: string, angleIncrement?: number) => void;
  
  // Drag actions
  setDraggingComponentType: (type: string | null) => void;
  
  // History actions
  undoLastAction: () => void;
  redoLastAction: () => void; // Add redo
  canUndo: boolean; // Add flags for UI
  canRedo: boolean; // Add flags for UI
  clearCircuitState: () => void; // Add clear action type

  // Other actions
  saveProject: (projectId: string, projectName: string) => Promise<boolean>;
  exportProject: () => void;
  importProject: (projectData: ProjectState) => void; // Update import signature

  // Initialization action
  initializeProjectState: (projectData: ProjectState) => void; // Added action
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

const initialCode = `// Arduino sketch
void setup() {
  Serial.begin(9600);
  pinMode(LED_BUILTIN, OUTPUT);
}

void loop() {
  digitalWrite(LED_BUILTIN, HIGH);
  Serial.println("LED ON");
  delay(1000);
  digitalWrite(LED_BUILTIN, LOW);
  Serial.println("LED OFF");
  delay(1000);
}`;

// Initial state for the history
const initialProjectState: ProjectState = {
  components: [],
  wires: [],
  code: initialCode,
};

// Updated initial state for the combined history
const initialHistoryState: HistoryState = {
  history: [initialProjectState],
  currentIndex: 0,
};

interface ProjectProviderProps {
  children: ReactNode;
}

export const ProjectProvider: React.FC<ProjectProviderProps> = ({ children }) => {
  // Use combined state for history and index
  const [historyState, setHistoryState] = useState<HistoryState>(initialHistoryState);
  const [draggingComponentType, setDraggingComponentTypeState] = useState<string | null>(null);
  const { setError } = useError();
  const { user } = useAuth();

  // Get current project state from combined history state
  const currentState = historyState.history[historyState.currentIndex];

  // --- Refactored Core Action Handlers (Use functional updates) ---
  
  const coreHandleComponentsChange = (updatedComponents: CircuitComponent[]) => {
    setHistoryState(prev => {
      const currentSt = prev.history[prev.currentIndex];
      const newState = { ...currentSt, components: updatedComponents };
      const newHistory = prev.history.slice(0, prev.currentIndex + 1);
      return {
        history: [...newHistory, newState],
        currentIndex: newHistory.length,
      };
    });
  };
  
  const coreHandleWiresChange = (updatedWires: WireEdge[]) => {
    setHistoryState(prev => {
      const currentSt = prev.history[prev.currentIndex];
      const newState = { ...currentSt, wires: updatedWires };
      const newHistory = prev.history.slice(0, prev.currentIndex + 1);
      return {
        history: [...newHistory, newState],
        currentIndex: newHistory.length,
      };
    });
  };

  const coreUpdateCode = (newCode: string) => {
    setHistoryState(prev => {
      const currentSt = prev.history[prev.currentIndex];
      const newState = { ...currentSt, code: newCode };
      const newHistory = prev.history.slice(0, prev.currentIndex + 1);
      return {
        history: [...newHistory, newState],
        currentIndex: newHistory.length,
      };
    });
  };
  
  const coreUpdateComponentAttributes = (componentId: string, attributes: Record<string, any>) => {
    if (!componentId) throw new ComponentError('Invalid component ID', 'INVALID_COMPONENT_ID');
    if (!attributes || typeof attributes !== 'object') throw new ComponentError('Invalid attributes', 'INVALID_ATTRIBUTES');
    
    setHistoryState(prev => {
      const currentSt = prev.history[prev.currentIndex];
      const updatedComponents = currentSt.components.map((component) =>
        component.id === componentId
          ? { ...component, attributes: { ...component.attributes, ...attributes } }
          : component
      );
      // Avoid pushing history if no change occurred
      if (JSON.stringify(updatedComponents) === JSON.stringify(currentSt.components)) {
        return prev; // No change, return previous state
      }
      const newState = { ...currentSt, components: updatedComponents };
      const newHistory = prev.history.slice(0, prev.currentIndex + 1);
      return {
        history: [...newHistory, newState],
        currentIndex: newHistory.length,
      };
    });
  };

  const coreRotateComponent = (componentId: string, angleIncrement: number = 90) => {
    if (!componentId) throw new ComponentError('Invalid component ID for rotation', 'INVALID_COMPONENT_ID');

    setHistoryState(prev => {
      const currentSt = prev.history[prev.currentIndex];
      let changed = false;
      const updatedComponents = currentSt.components.map((component) => {
        if (component.id === componentId) {
          const currentRotation = component.rotation || 0;
          let newRotation = (currentRotation + angleIncrement) % 360;
          if (newRotation < 0) newRotation += 360;
          if (newRotation !== currentRotation) changed = true;
          return { ...component, rotation: newRotation };
        }
        return component;
      });

      if (!changed) {
        console.warn(`Component with ID ${componentId} not found or rotation resulted in no change.`);
        return prev; // No change, return previous state
      }

      const newState: ProjectState = { ...currentSt, components: updatedComponents };
      const newHistory = prev.history.slice(0, prev.currentIndex + 1);
       return {
        history: [...newHistory, newState],
        currentIndex: newHistory.length,
      };
    });
  };

  // --- Core Drag Action (remains the same) ---
  const coreSetDraggingComponentType = (type: string | null) => {
    setDraggingComponentTypeState(type);
  };

  // --- Refactored Core History Actions ---
  const coreUndoLastAction = useCallback(() => {
    setHistoryState(prev => {
      if (prev.currentIndex > 0) {
        return { ...prev, currentIndex: prev.currentIndex - 1 };
      } else {
        toast.info('Nothing to undo');
        return prev;
      }
    });
  }, []);

  const coreRedoLastAction = useCallback(() => {
     setHistoryState(prev => {
      if (prev.currentIndex < prev.history.length - 1) {
        return { ...prev, currentIndex: prev.currentIndex + 1 };
      } else {
        toast.info('Nothing to redo');
        return prev;
      }
    });
  }, []);

  // --- New Core Initialization Action ---
  const coreInitializeProjectState = useCallback((projectData: ProjectState) => {
    //console.log("Initializing project state with data:", projectData);
    const validatedState: ProjectState = {
        components: Array.isArray(projectData.components) ? projectData.components : [],
        wires: Array.isArray(projectData.wires) ? projectData.wires : [],
        code: typeof projectData.code === 'string' ? projectData.code : initialCode, // Use initialCode as fallback
    };
    // Reset history to only contain the loaded state
    setHistoryState({
        history: [validatedState],
        currentIndex: 0,
    });
    toast.info("Project loaded.");
  }, []);

  // --- Other Core Actions (save/export use currentState, import resets state) ---
  const coreSaveProject = useCallback(async (projectId: string, projectName: string): Promise<boolean> => {
    if (!user) {
      toast.error('You must be logged in to save a project.');
      setError(new Error('User not authenticated for saving.'), 'PROJECT_SAVE');
      return false; // Indicate failure
    }

    const currentProjectState = historyState.history[historyState.currentIndex];
    //console.log('Attempting to save Project State to Supabase:', { id: projectId, user_id: user.id, name: projectName, ...currentProjectState });

    try {
      const result = await saveProjectToSupabase({
        id: projectId,
        user_id: user.id,
        name: projectName,
        components: currentProjectState.components,
        wires: currentProjectState.wires,
        code: currentProjectState.code,
        // description is not part of currentProjectState, potentially add later
      });

      if (result) {
        console.log('Project saved successfully:', result);
        toast.success('Project saved successfully!');
        return true; // Indicate success
      } else {
        // This case might not be reachable if saveProjectToSupabase throws on error,
        // but handle it defensively.
        console.error('Save operation returned null/undefined.');
        toast.error('Failed to save project.', { description: 'The save operation did not return the expected result.'});
        setError(new Error('Save operation failed unexpectedly.'), 'PROJECT_SAVE');
        return false; // Indicate failure
      }
    } catch (error) {
      console.error('Error during save project operation:', error);
      toast.error('Failed to save project.', {
        description: error instanceof Error ? error.message : 'An unknown error occurred.',
      });
      setError(error instanceof Error ? error : new Error('An unknown save error occurred.'), 'PROJECT_SAVE');
      return false; // Indicate failure
    }
  }, [user, historyState, setError]);
  
  const coreExportProject = useCallback(() => {
    const projectData = currentState; // currentState is derived correctly
    const dataStr = JSON.stringify(projectData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = 'circuit-project.json';
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    toast.success('Project exported successfully!');
  }, [currentState]);
  
  const coreImportProject = useCallback((projectData: ProjectState) => {
    if (!projectData || typeof projectData !== 'object') {
        throw new ComponentError('Invalid project data format', 'PROJECT_PARSE_ERROR');
    }
    const validatedState: ProjectState = {
        components: Array.isArray(projectData.components) ? projectData.components : [],
        wires: Array.isArray(projectData.wires) ? projectData.wires : [],
        code: typeof projectData.code === 'string' ? projectData.code : initialCode,
    };
    // Reset history, similar to initializeProjectState
    setHistoryState({
        history: [validatedState],
        currentIndex: 0,
    });
    toast.success("Project imported.");
  }, []);
  
  // --- Add Core Clear Action --- 
  const coreClearCircuitState = useCallback(() => {
    // Reset state completely, similar to initialization but with initialProjectState
    setHistoryState({
        history: [initialProjectState],
        currentIndex: 0,
    });
    toast.info("Circuit cleared.");
  }, []);
  
  // --- Wrap core functions with error handling --- 
  // Wrap the error handlers themselves in useCallback to stabilize their references
  const handleComponentsChange = useCallback(
    withErrorHandling(coreHandleComponentsChange, 'Failed to update components', setError),
    [coreHandleComponentsChange, setError]
  );
  const handleWiresChange = useCallback(
    withErrorHandling(coreHandleWiresChange, 'Failed to update wires', setError),
    [coreHandleWiresChange, setError]
  );
  const updateCode = useCallback(
    withErrorHandling(coreUpdateCode, 'Failed to update code', setError),
    [coreUpdateCode, setError]
  );
  const handleUpdateComponentAttributes = useCallback(
    withErrorHandling(coreUpdateComponentAttributes, 'Failed to update component attributes', setError),
    [coreUpdateComponentAttributes, setError]
  );
  const rotateComponent = useCallback(
    withErrorHandling(coreRotateComponent, 'Failed to rotate component', setError),
    [coreRotateComponent, setError]
  );
  const setDraggingComponentType = useCallback(
    withErrorHandling(coreSetDraggingComponentType, 'Failed to set dragging component type', setError),
    [coreSetDraggingComponentType, setError]
  );
  const saveProject = useCallback(
    withErrorHandling(coreSaveProject, 'Failed to save project', setError),
    [coreSaveProject, setError] // Depends on the memoized coreSaveProject
  );
  const undoLastAction = useCallback(
    withErrorHandling(coreUndoLastAction, 'Failed to undo action', setError),
    [coreUndoLastAction, setError]
  );
  const redoLastAction = useCallback(
    withErrorHandling(coreRedoLastAction, 'Failed to redo action', setError),
    [coreRedoLastAction, setError]
  );
  const exportProject = useCallback(
    withErrorHandling(coreExportProject, 'Failed to export project', setError),
    [coreExportProject, setError]
  );
  const importProject = useCallback(
    withErrorHandling(coreImportProject, 'Failed to import project', setError),
    [coreImportProject, setError]
  );
  const clearCircuitState = useCallback(
    withErrorHandling(coreClearCircuitState, 'Failed to clear circuit state', setError),
    [coreClearCircuitState, setError]
  );
  const initializeProjectState = useCallback(
    withErrorHandling(coreInitializeProjectState, 'Failed to initialize project state', setError),
    [coreInitializeProjectState, setError]
  );

  // --- Calculate derived state from combined state ---
  const canUndo = historyState.currentIndex > 0;
  const canRedo = historyState.currentIndex < historyState.history.length - 1;

  // --- Memoized Context Value --- 
  const contextValue = useMemo(() => {
    const current = historyState.history[historyState.currentIndex];
    //console.log(`ProjectContext: Providing value - Components: ${current.components.length} Wires: ${current.wires.length}`);
    return {
      components: current.components,
      wires: current.wires,
      code: current.code,
      draggingComponentType: draggingComponentType,
      // Actions:
      handleComponentsChange: withErrorHandling(coreHandleComponentsChange, 'UPDATE_COMPONENTS', setError),
      handleWiresChange: withErrorHandling(coreHandleWiresChange, 'UPDATE_WIRES', setError),
      updateCode: withErrorHandling(coreUpdateCode, 'UPDATE_CODE', setError),
      setCode: withErrorHandling(coreUpdateCode, 'UPDATE_CODE', setError),
      handleUpdateComponentAttributes: withErrorHandling(coreUpdateComponentAttributes, 'UPDATE_ATTRIBUTES', setError),
      rotateComponent: withErrorHandling(coreRotateComponent, 'ROTATE_COMPONENT', setError),
      setDraggingComponentType: coreSetDraggingComponentType, // No error handling needed
      undoLastAction: withErrorHandling(coreUndoLastAction, 'UNDO', setError),
      redoLastAction: withErrorHandling(coreRedoLastAction, 'REDO', setError),
      clearCircuitState: withErrorHandling(() => {
          // Wrap the state reset logic for error handling if needed, though unlikely to fail
          setHistoryState(initialHistoryState);
          toast.info('Circuit cleared.');
      }, 'CLEAR_CIRCUIT', setError),
      saveProject: withErrorHandling(coreSaveProject, 'SAVE_PROJECT', setError),
      exportProject: withErrorHandling(coreExportProject, 'EXPORT_PROJECT', setError),
      importProject: withErrorHandling(coreImportProject, 'IMPORT_PROJECT', setError),
      initializeProjectState: withErrorHandling(coreInitializeProjectState, 'INITIALIZE_PROJECT', setError),
      // History flags:
      canUndo: historyState.currentIndex > 0,
      canRedo: historyState.currentIndex < historyState.history.length - 1,
    };
  }, [historyState, draggingComponentType, setError, coreUndoLastAction, coreRedoLastAction, coreInitializeProjectState, coreSaveProject, coreExportProject, coreImportProject]);

  return (
    <ProjectContext.Provider value={contextValue}>
      {children}
    </ProjectContext.Provider>
  );
};

export const useProject = (): ProjectContextType => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
};
