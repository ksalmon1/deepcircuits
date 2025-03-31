
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { CircuitComponent } from '@/types/component';
import { PinConnection } from '@/types/pin';
import { toast } from 'sonner';
import { WokwiComponent } from '@/integrations/wokwi/WokwiIntegration';
import { AppError, formatErrorMessage, ComponentError, logError } from '@/utils/errorHandling';
import { CircuitEditorErrorState } from '@/types/circuit';

// Define the context shape
interface CircuitEditorContextType {
  // Circuit components
  components: CircuitComponent[];
  setComponents: React.Dispatch<React.SetStateAction<CircuitComponent[]>>;
  handleComponentsChange: (updatedComponents: CircuitComponent[]) => void;
  
  // Selected component
  selectedComponent: CircuitComponent | null;
  selectComponent: (component: CircuitComponent | null) => void;
  
  // Connections
  connections: PinConnection[];
  setConnections: React.Dispatch<React.SetStateAction<PinConnection[]>>;
  addConnection: (connection: PinConnection) => void;
  removeConnection: (connectionId: string) => void;
  
  // Editor state
  isSimulationRunning: boolean;
  setIsSimulationRunning: React.Dispatch<React.SetStateAction<boolean>>;
  
  // Code
  code: string;
  setCode: React.Dispatch<React.SetStateAction<string>>;
  
  // Serial Monitor
  serialOutput: string[];
  addSerialOutput: (message: string) => void;
  clearSerialOutput: () => void;
  
  // Project actions
  saveProject: () => void;
  undoLastAction: () => void;
  exportProject: () => void;
  importProject: () => void;
  
  // Component attributes
  handleUpdateComponentAttributes: (componentId: string, attributes: Record<string, any>) => void;
  
  // Toggle simulation
  toggleSimulation: () => void;
  
  // Error handling
  errorState: CircuitEditorErrorState;
  clearError: () => void;
  setError: (error: Error, context: string, code?: string) => void;
}

// Create the context with a default undefined value
const CircuitEditorContext = createContext<CircuitEditorContextType | undefined>(undefined);

// Default code for Arduino sketch
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

// Provider component
interface CircuitEditorProviderProps {
  children: ReactNode;
}

export const CircuitEditorProvider: React.FC<CircuitEditorProviderProps> = ({ children }) => {
  // State for components and selection
  const [components, setComponents] = useState<CircuitComponent[]>([]);
  const [selectedComponent, setSelectedComponent] = useState<CircuitComponent | null>(null);
  const [connections, setConnections] = useState<PinConnection[]>([]);
  const [code, setCode] = useState<string>(initialCode);
  const [isSimulationRunning, setIsSimulationRunning] = useState<boolean>(false);
  const [serialOutput, setSerialOutput] = useState<string[]>([]);
  
  // Error state
  const [errorState, setErrorState] = useState<CircuitEditorErrorState>({
    hasError: false,
    error: null,
    errorInfo: null,
    errorCode: '',
    errorContext: '',
    errorTimestamp: 0
  });
  
  // Set error in the error state
  const setError = useCallback((error: Error, context: string, code: string = 'UNKNOWN_ERROR') => {
    setErrorState({
      hasError: true,
      error,
      errorInfo: null,
      errorCode: error instanceof AppError ? error.code : code,
      errorContext: context,
      errorTimestamp: Date.now()
    });
    
    logError(error, context);
    
    toast.error('An error occurred', {
      description: formatErrorMessage(error),
      duration: 5000,
    });
  }, []);
  
  // Clear the error state
  const clearError = useCallback(() => {
    setErrorState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorCode: '',
      errorContext: '',
      errorTimestamp: 0
    });
  }, []);
  
  // Handle component changes and update selected component if modified
  const handleComponentsChange = useCallback((updatedComponents: CircuitComponent[]) => {
    try {
      setComponents(updatedComponents);
      
      // Update selected component if it was modified
      if (selectedComponent) {
        const updatedSelectedComponent = updatedComponents.find(
          (comp) => comp.id === selectedComponent.id
        );
        setSelectedComponent(updatedSelectedComponent || null);
      }
      
      // If selected component was removed, clear selection
      if (
        selectedComponent &&
        !updatedComponents.some((comp) => comp.id === selectedComponent.id)
      ) {
        setSelectedComponent(null);
      }
    } catch (error) {
      setError(
        error instanceof Error 
          ? error 
          : new ComponentError('Failed to update components', 'COMPONENT_UPDATE_ERROR'),
        'handleComponentsChange'
      );
    }
  }, [selectedComponent, setError]);
  
  const selectComponent = useCallback((component: CircuitComponent | null) => {
    setSelectedComponent(component);
  }, []);
  
  const addConnection = useCallback((connection: PinConnection) => {
    try {
      // Validate connection
      if (!connection.sourceId || !connection.targetId) {
        throw new ComponentError('Invalid connection: missing source or target ID', 'INVALID_CONNECTION');
      }
      
      setConnections(prev => [...prev, connection]);
    } catch (error) {
      setError(
        error instanceof Error 
          ? error 
          : new ComponentError('Failed to add connection', 'CONNECTION_ADD_ERROR'),
        'addConnection'
      );
    }
  }, [setError]);
  
  const removeConnection = useCallback((connectionId: string) => {
    try {
      setConnections(prev => prev.filter(conn => 
        `${conn.sourceId}-${conn.sourcePinIndex}-${conn.targetId}-${conn.targetPinIndex}` !== connectionId
      ));
    } catch (error) {
      setError(
        error instanceof Error 
          ? error 
          : new ComponentError('Failed to remove connection', 'CONNECTION_REMOVE_ERROR'),
        'removeConnection'
      );
    }
  }, [setError]);
  
  const addSerialOutput = useCallback((message: string) => {
    setSerialOutput(prev => [...prev, message]);
  }, []);
  
  const clearSerialOutput = useCallback(() => {
    setSerialOutput([]);
  }, []);
  
  // Component attribute updates
  const handleUpdateComponentAttributes = useCallback((componentId: string, attributes: Record<string, any>) => {
    try {
      // Validate inputs
      if (!componentId) {
        throw new ComponentError('Invalid component ID', 'INVALID_COMPONENT_ID');
      }
      
      if (!attributes || typeof attributes !== 'object') {
        throw new ComponentError('Invalid attributes', 'INVALID_ATTRIBUTES');
      }
      
      setComponents((prevComponents) =>
        prevComponents.map((component) =>
          component.id === componentId
            ? { ...component, attributes: { ...component.attributes, ...attributes } }
            : component
        )
      );
    } catch (error) {
      setError(
        error instanceof Error 
          ? error 
          : new ComponentError('Failed to update component attributes', 'ATTRIBUTES_UPDATE_ERROR'),
        'handleUpdateComponentAttributes'
      );
    }
  }, [setError]);
  
  // Toggle simulation
  const toggleSimulation = useCallback(() => {
    try {
      setIsSimulationRunning(prev => !prev);
      
      if (!isSimulationRunning) {
        // Starting simulation
        setSerialOutput(prev => [
          ...prev, 
          '--- Simulation started ---',
          'Compiling code...',
          'Uploading to virtual microcontroller...'
        ]);
        
        // Simulate some output after a delay
        setTimeout(() => {
          setSerialOutput(prev => [
            ...prev,
            'Program running...',
            'LED ON'
          ]);
        }, 1500);
      } else {
        // Stopping simulation
        setSerialOutput(prev => [
          ...prev, 
          '--- Simulation stopped ---'
        ]);
      }
    } catch (error) {
      setError(
        error instanceof Error 
          ? error 
          : new ComponentError('Failed to toggle simulation', 'SIMULATION_TOGGLE_ERROR'),
        'toggleSimulation'
      );
    }
  }, [isSimulationRunning, setError]);
  
  // Project actions
  const saveProject = useCallback(() => {
    try {
      // Simulate save operation
      toast.success('Project saved successfully!');
    } catch (error) {
      setError(
        error instanceof Error 
          ? error 
          : new ComponentError('Failed to save project', 'PROJECT_SAVE_ERROR'),
        'saveProject'
      );
    }
  }, [setError]);
  
  const undoLastAction = useCallback(() => {
    try {
      toast.error('Undo not available.');
    } catch (error) {
      setError(
        error instanceof Error 
          ? error 
          : new ComponentError('Undo operation failed', 'UNDO_ERROR'),
        'undoLastAction'
      );
    }
  }, [setError]);
  
  const exportProject = useCallback(() => {
    try {
      const projectData = {
        components,
        code
      };
      
      const dataStr = JSON.stringify(projectData, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = 'circuit-project.json';
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      
      toast.success('Project exported successfully!');
    } catch (error) {
      setError(
        error instanceof Error 
          ? error 
          : new ComponentError('Failed to export project', 'PROJECT_EXPORT_ERROR'),
        'exportProject'
      );
    }
  }, [components, code, setError]);
  
  const importProject = useCallback(() => {
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      
      input.onchange = (e: Event) => {
        const target = e.target as HTMLInputElement;
        if (target?.files && target.files[0]) {
          const file = target.files[0];
          const reader = new FileReader();
          
          reader.onload = (e) => {
            try {
              const result = e.target?.result as string;
              const projectData = JSON.parse(result);
              
              if (projectData.components && Array.isArray(projectData.components)) {
                setComponents(projectData.components);
              }
              
              if (projectData.code && typeof projectData.code === 'string') {
                setCode(projectData.code);
              }
              
              toast.success('Project imported successfully!');
            } catch (error) {
              setError(
                new ComponentError(
                  'Failed to parse imported project: ' + (error instanceof Error ? error.message : String(error)), 
                  'PROJECT_PARSE_ERROR'
                ),
                'importProject.parse'
              );
            }
          };
          
          reader.onerror = () => {
            setError(
              new ComponentError('Failed to read the file', 'FILE_READ_ERROR'),
              'importProject.read'
            );
          };
          
          reader.readAsText(file);
        }
      };
      
      input.click();
    } catch (error) {
      setError(
        error instanceof Error 
          ? error 
          : new ComponentError('Failed to import project', 'PROJECT_IMPORT_ERROR'),
        'importProject'
      );
    }
  }, [setError]);
  
  const value = {
    components,
    setComponents,
    handleComponentsChange,
    selectedComponent,
    selectComponent,
    connections,
    setConnections,
    addConnection,
    removeConnection,
    isSimulationRunning,
    setIsSimulationRunning,
    code,
    setCode,
    serialOutput,
    addSerialOutput,
    clearSerialOutput,
    saveProject,
    undoLastAction,
    exportProject,
    importProject,
    handleUpdateComponentAttributes,
    toggleSimulation,
    errorState,
    clearError,
    setError
  };
  
  return (
    <CircuitEditorContext.Provider value={value}>
      {children}
    </CircuitEditorContext.Provider>
  );
};

// Hook to use the circuit editor context
export const useCircuitEditor = (): CircuitEditorContextType => {
  const context = useContext(CircuitEditorContext);
  if (context === undefined) {
    throw new Error('useCircuitEditor must be used within a CircuitEditorProvider');
  }
  return context;
};
