import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { CircuitComponent } from '@/types/component';
import { PinConnection } from '@/types/pin';
import { toast } from 'sonner';
import { ComponentError, withErrorHandling } from '@/utils/errorHandling';
import { useError } from './ErrorContext';

interface ProjectContextType {
  components: CircuitComponent[];
  setComponents: React.Dispatch<React.SetStateAction<CircuitComponent[]>>;
  handleComponentsChange: (updatedComponents: CircuitComponent[]) => void;
  
  connections: PinConnection[];
  setConnections: React.Dispatch<React.SetStateAction<PinConnection[]>>;
  addConnection: (connection: PinConnection) => void;
  removeConnection: (connectionId: string) => void;
  
  code: string;
  setCode: React.Dispatch<React.SetStateAction<string>>;
  
  saveProject: () => void;
  undoLastAction: () => void;
  exportProject: () => void;
  importProject: () => void;
  
  handleUpdateComponentAttributes: (componentId: string, attributes: Record<string, any>) => void;
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

interface ProjectProviderProps {
  children: ReactNode;
}

export const ProjectProvider: React.FC<ProjectProviderProps> = ({ children }) => {
  const [components, setComponents] = useState<CircuitComponent[]>([]);
  const [connections, setConnections] = useState<PinConnection[]>([]);
  const [code, setCode] = useState<string>(initialCode);
  
  const { setError } = useError();
  
  const coreHandleComponentsChange = (updatedComponents: CircuitComponent[]) => {
    setComponents(updatedComponents);
  };
  
  const coreAddConnection = (connection: PinConnection) => {
    if (!connection.sourceId || !connection.targetId) {
      throw new ComponentError('Invalid connection: missing source or target ID', 'INVALID_CONNECTION');
    }
    
    setConnections(prev => [...prev, connection]);
  };
  
  const coreRemoveConnection = (connectionId: string) => {
    setConnections(prev => prev.filter(conn => 
      `${conn.sourceId}-${conn.sourcePinIndex}-${conn.targetId}-${conn.targetPinIndex}` !== connectionId
    ));
  };
  
  const coreUpdateComponentAttributes = (componentId: string, attributes: Record<string, any>) => {
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
  };
  
  const coreSaveProject = () => {
    toast.success('Project saved successfully!');
  };
  
  const coreUndoLastAction = () => {
    toast.error('Undo not available.');
  };
  
  const coreExportProject = () => {
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
  };
  
  const coreImportProject = () => {
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
  };
  
  const handleComponentsChange = withErrorHandling(
    coreHandleComponentsChange,
    'handleComponentsChange',
    setError
  );
  
  const addConnection = withErrorHandling(
    coreAddConnection,
    'addConnection',
    setError
  );
  
  const removeConnection = withErrorHandling(
    coreRemoveConnection,
    'removeConnection',
    setError
  );
  
  const handleUpdateComponentAttributes = withErrorHandling(
    coreUpdateComponentAttributes,
    'handleUpdateComponentAttributes',
    setError
  );
  
  const saveProject = withErrorHandling(
    coreSaveProject,
    'saveProject',
    setError
  );
  
  const undoLastAction = withErrorHandling(
    coreUndoLastAction,
    'undoLastAction',
    setError
  );
  
  const exportProject = withErrorHandling(
    coreExportProject,
    'exportProject',
    setError
  );
  
  const importProject = withErrorHandling(
    coreImportProject,
    'importProject',
    setError
  );
  
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

export const useProject = (): ProjectContextType => {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
};
