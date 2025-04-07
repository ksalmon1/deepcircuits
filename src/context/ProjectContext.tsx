import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
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
  // setCode: React.Dispatch<React.SetStateAction<string>>;

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
  saveProject: (projectId: string, projectName: string) => Promise<void>;
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
    console.log("Initializing project state with data:", projectData);
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
  const coreSaveProject = useCallback(async (projectId: string, projectName: string) => {
    if (!user) {
      toast.error('You must be logged in to save a project.');
      setError(new Error('User not authenticated for saving.'));
      return;
    }
    if (!projectId || !projectName) {
        toast.error('Project ID and Name are required to save.');
        setError(new Error('Missing Project ID or Name for saving.'));
        return;
    }

    const projectData = {
        id: projectId,
        user_id: user.id,
        name: projectName,
        components: currentState.components,
        wires: currentState.wires,
        code: currentState.code,
        // description, thumbnail_url, is_public could be added if needed
    };

    console.log("Attempting to save Project State to Supabase:", projectData); // Log data being sent
    // toast.info('Saving project...'); // Commented out the info toast

    try {
      const savedProject = await saveProjectToSupabase(projectData);
      if (savedProject) {
        toast.success('Project saved successfully!');
        console.log('Project saved successfully:', savedProject);
      } else {
        // This case might occur if upsert doesn't return data or saveProjectToSupabase returns null explicitly on non-error
        toast.warning('Project saved, but no confirmation data received.');
         console.warn('Project save operation completed, but no data returned from API function.');
      }
    } catch (error: any) {
      console.error("Error saving project:", error);
      toast.error(`Failed to save project: ${error.message}`);
      setError(error); // Set error state for potential global handling
    }
  }, [currentState, user, setError]);
  
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
    // Reset state completely for import
    setHistoryState({
        history: [validatedState],
        currentIndex: 0,
    });
    toast.success("Project imported successfully!");
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
    withErrorHandling(coreHandleComponentsChange, setError, 'Failed to update components'),
    [coreHandleComponentsChange, setError]
  );
  const handleWiresChange = useCallback(
    withErrorHandling(coreHandleWiresChange, setError, 'Failed to update wires'),
    [coreHandleWiresChange, setError]
  );
  const updateCode = useCallback(
    withErrorHandling(coreUpdateCode, setError, 'Failed to update code'),
    [coreUpdateCode, setError]
  );
  const handleUpdateComponentAttributes = useCallback(
    withErrorHandling(coreUpdateComponentAttributes, setError, 'Failed to update component attributes'),
    [coreUpdateComponentAttributes, setError]
  );
  const rotateComponent = useCallback(
    withErrorHandling(coreRotateComponent, setError, 'Failed to rotate component'),
    [coreRotateComponent, setError]
  );
  const setDraggingComponentType = useCallback(
    withErrorHandling(coreSetDraggingComponentType, setError, 'Failed to set dragging component type'),
    [coreSetDraggingComponentType, setError]
  );
  const saveProject = useCallback(
    withErrorHandling(coreSaveProject, setError, 'Failed to save project'),
    [coreSaveProject, setError] // Depends on the memoized coreSaveProject
  );
  const undoLastAction = useCallback(
    withErrorHandling(coreUndoLastAction, setError, 'Failed to undo action'),
    [coreUndoLastAction, setError]
  );
  const redoLastAction = useCallback(
    withErrorHandling(coreRedoLastAction, setError, 'Failed to redo action'),
    [coreRedoLastAction, setError]
  );
  const exportProject = useCallback(
    withErrorHandling(coreExportProject, setError, 'Failed to export project'),
    [coreExportProject, setError]
  );
  const importProject = useCallback(
    withErrorHandling(coreImportProject, setError, 'Failed to import project'),
    [coreImportProject, setError]
  );
  const clearCircuitState = useCallback(
    withErrorHandling(coreClearCircuitState, setError, 'Failed to clear circuit state'),
    [coreClearCircuitState, setError]
  );
  const initializeProjectState = useCallback(
    withErrorHandling(coreInitializeProjectState, setError, 'Failed to initialize project state'),
    [coreInitializeProjectState, setError]
  );

  // --- Calculate derived state from combined state ---
  const canUndo = historyState.currentIndex > 0;
  const canRedo = historyState.currentIndex < historyState.history.length - 1;

  // --- Provide Context Value (derived from currentState and combined state) ---
  // Now the functions provided here should have stable references
  const value = {
    components: currentState.components,
    wires: currentState.wires,
    code: currentState.code,
    draggingComponentType,
    handleComponentsChange,
    handleWiresChange,
    updateCode,
    handleUpdateComponentAttributes,
    rotateComponent,
    setDraggingComponentType,
    undoLastAction,
    redoLastAction,
    clearCircuitState,
    canUndo,
    canRedo,
    saveProject,
    exportProject,
    importProject,
    initializeProjectState,
  };
  
  // Log the value being provided
  console.log("ProjectContext: Providing value - Components:", currentState.components?.length, "Wires:", currentState.wires?.length);

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
};

export const useProject = (): ProjectContextType => {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
};
