import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { CircuitComponent } from '@/types/component';
import { WireEdge } from '@/types/circuit';
import { toast } from 'sonner';
import { ComponentError, withErrorHandling } from '@/utils/errorHandling';
import { useError } from './ErrorContext';

// Define the shape of the state managed by history
interface ProjectState {
  components: CircuitComponent[];
  wires: WireEdge[];
  code: string;
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

  // Other actions
  saveProject: () => void;
  exportProject: () => void;
  importProject: (projectData: ProjectState) => void; // Update import signature
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

interface ProjectProviderProps {
  children: ReactNode;
}

export const ProjectProvider: React.FC<ProjectProviderProps> = ({ children }) => {
  const [history, setHistory] = useState<ProjectState[]>([initialProjectState]);
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState<number>(0);
  const [draggingComponentType, setDraggingComponentTypeState] = useState<string | null>(null);
  const { setError } = useError();

  // Get current state from history
  const currentState = history[currentHistoryIndex];

  // Helper to add a new state to history
  const pushHistory = (newState: ProjectState) => {
    // Clear future states if we are undoing/redoing
    const newHistory = history.slice(0, currentHistoryIndex + 1);
    setHistory([...newHistory, newState]);
    setCurrentHistoryIndex(newHistory.length);
  };

  // --- Core Action Handlers (Update history) ---
  const coreHandleComponentsChange = (updatedComponents: CircuitComponent[]) => {
    const newState: ProjectState = { ...currentState, components: updatedComponents };
    pushHistory(newState);
  };
  
  const coreHandleWiresChange = (updatedWires: WireEdge[]) => {
    const newState: ProjectState = { ...currentState, wires: updatedWires };
    pushHistory(newState);
  };

  const coreUpdateCode = (newCode: string) => {
    const newState: ProjectState = { ...currentState, code: newCode };
    pushHistory(newState);
  };
  
  const coreUpdateComponentAttributes = (componentId: string, attributes: Record<string, any>) => {
    if (!componentId) throw new ComponentError('Invalid component ID', 'INVALID_COMPONENT_ID');
    if (!attributes || typeof attributes !== 'object') throw new ComponentError('Invalid attributes', 'INVALID_ATTRIBUTES');
    
    const updatedComponents = currentState.components.map((component) =>
      component.id === componentId
        ? { ...component, attributes: { ...component.attributes, ...attributes } }
        : component
    );
    const newState: ProjectState = { ...currentState, components: updatedComponents };
    pushHistory(newState);
  };

  // Add core rotation function
  const coreRotateComponent = (componentId: string, angleIncrement: number = 90) => {
    if (!componentId) throw new ComponentError('Invalid component ID for rotation', 'INVALID_COMPONENT_ID');

    const updatedComponents = currentState.components.map((component) => {
      if (component.id === componentId) {
        const currentRotation = component.rotation || 0;
        // Ensure rotation stays within 0-359 degrees
        let newRotation = (currentRotation + angleIncrement) % 360;
        if (newRotation < 0) {
          newRotation += 360; // Handle negative results from modulo
        }
        return { ...component, rotation: newRotation };
      }
      return component;
    });

    // Only push history if a component was actually rotated
    if (JSON.stringify(updatedComponents) !== JSON.stringify(currentState.components)) {
        const newState: ProjectState = { ...currentState, components: updatedComponents };
        pushHistory(newState);
    } else {
        console.warn(`Component with ID ${componentId} not found for rotation.`);
        // Optionally add a toast message here if the component wasn't found
        // toast.error(`Component with ID ${componentId} not found.`);
    }
  };

  // --- Core Drag Action ---
  const coreSetDraggingComponentType = (type: string | null) => {
    setDraggingComponentTypeState(type);
  };

  // --- Core History Actions ---
  const coreUndoLastAction = () => {
    if (currentHistoryIndex > 0) {
      setCurrentHistoryIndex(currentHistoryIndex - 1);
    } else {
      toast.info('Nothing to undo');
    }
  };

  const coreRedoLastAction = () => {
    if (currentHistoryIndex < history.length - 1) {
      setCurrentHistoryIndex(currentHistoryIndex + 1);
    } else {
      toast.info('Nothing to redo');
    }
  };

  // --- Other Core Actions ---
  const coreSaveProject = () => {
    // Save currentState.components, currentState.wires, currentState.code
    console.log("Saving Project State:", currentState);
    toast.success('Project saved successfully!'); // Placeholder
  };
  
  const coreExportProject = () => {
    const projectData = currentState; // Export the current state
    const dataStr = JSON.stringify(projectData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = 'circuit-project.json';
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    toast.success('Project exported successfully!');
  };
  
  // Updated Import Logic
  const coreImportProject = (projectData: ProjectState) => {
    // Validate imported data structure (basic checks)
    if (!projectData || typeof projectData !== 'object') {
        throw new ComponentError('Invalid project data format', 'PROJECT_PARSE_ERROR');
    }
    const validatedState: ProjectState = {
        components: Array.isArray(projectData.components) ? projectData.components : [],
        wires: Array.isArray(projectData.wires) ? projectData.wires : [], // Import wires
        code: typeof projectData.code === 'string' ? projectData.code : initialCode,
    };
    // Reset history with the imported state
    setHistory([validatedState]);
    setCurrentHistoryIndex(0);
    toast.success('Project imported successfully!');
  };
  
  // --- Wrap core functions with error handling ---
  const handleComponentsChange = withErrorHandling(coreHandleComponentsChange, 'handleComponentsChange', setError);
  const handleWiresChange = withErrorHandling(coreHandleWiresChange, 'handleWiresChange', setError);
  const updateCode = withErrorHandling(coreUpdateCode, 'updateCode', setError);
  const handleUpdateComponentAttributes = withErrorHandling(coreUpdateComponentAttributes, 'handleUpdateComponentAttributes', setError);
  const rotateComponent = withErrorHandling(coreRotateComponent, 'rotateComponent', setError);
  const setDraggingComponentType = withErrorHandling(coreSetDraggingComponentType, 'setDraggingComponentType', setError);
  const saveProject = withErrorHandling(coreSaveProject, 'saveProject', setError);
  const undoLastAction = withErrorHandling(coreUndoLastAction, 'undoLastAction', setError);
  const redoLastAction = withErrorHandling(coreRedoLastAction, 'redoLastAction', setError); // Wrap redo
  const exportProject = withErrorHandling(coreExportProject, 'exportProject', setError);
  const importProject = withErrorHandling(coreImportProject, 'importProject', setError);
  
  // --- Calculate derived state ---
  const canUndo = currentHistoryIndex > 0;
  const canRedo = currentHistoryIndex < history.length - 1;

  // --- Provide Context Value ---
  const value = {
    // Current state values
    components: currentState.components,
    wires: currentState.wires,
    code: currentState.code,

    // Drag state
    draggingComponentType,

    // Action handlers
    handleComponentsChange,
    handleWiresChange,
    updateCode,
    handleUpdateComponentAttributes,
    rotateComponent,

    // Drag actions
    setDraggingComponentType,

    // History actions
    undoLastAction,
    redoLastAction,
    canUndo,
    canRedo,

    // Other actions
    saveProject,
    exportProject,
    importProject,
  };
  
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
