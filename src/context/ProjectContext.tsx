
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { CircuitComponent } from '@/types/component';
import { PinConnection } from '@/types/pin';
import { toast } from 'sonner';
import { ComponentError } from '@/utils/errorHandling';
import { useError } from './ErrorContext';

// Define the context shape
interface ProjectContextType {
  // Circuit components
  components: CircuitComponent[];
  setComponents: React.Dispatch<React.SetStateAction<CircuitComponent[]>>;
  handleComponentsChange: (updatedComponents: CircuitComponent[]) => void;
  
  // Connections
  connections: PinConnection[];
  setConnections: React.Dispatch<React.SetStateAction<PinConnection[]>>;
  addConnection: (connection: PinConnection) => void;
  removeConnection: (connectionId: string) => void;
  
  // Code
  code: string;
  setCode: React.Dispatch<React.SetStateAction<string>>;
  
  // Project actions
  saveProject: () => void;
  undoLastAction: () => void;
  exportProject: () => void;
  importProject: () => void;
  
  // Component attributes
  handleUpdateComponentAttributes: (componentId: string, attributes: Record<string, any>) => void;
}

// Create the context with a default undefined value
const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

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
interface ProjectProviderProps {
  children: ReactNode;
}

export const ProjectProvider: React.FC<ProjectProviderProps> = ({ children }) => {
  // State for components and connections
  const [components, setComponents] = useState<CircuitComponent[]>([]);
  const [connections, setConnections] = useState<PinConnection[]>([]);
  const [code, setCode] = useState<string>(initialCode);
  
  // Get error handling from ErrorContext
  const { setError } = useError();
  
  // Handle component changes
  const handleComponentsChange = useCallback((updatedComponents: CircuitComponent[]) => {
    try {
      setComponents(updatedComponents);
    } catch (error) {
      setError(
        error instanceof Error 
          ? error 
          : new ComponentError('Failed to update components', 'COMPONENT_UPDATE_ERROR'),
        'handleComponentsChange'
      );
    }
  }, [setError]);
  
  // Add connection to the circuit
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
  
  // Remove connection from the circuit
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
  
  // Update component attributes
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
    connections,
    setConnections,
    addConnection,
    removeConnection,
    code,
    setCode,
    saveProject,
    undoLastAction,
    exportProject,
    importProject,
    handleUpdateComponentAttributes
  };
  
  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
};

// Hook to use the project context
export const useProject = (): ProjectContextType => {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
};
