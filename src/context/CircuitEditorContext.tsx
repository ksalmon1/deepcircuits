import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { CircuitComponent } from '@/types/component';
import { PinConnection } from '@/types/pin';
import { toast } from 'sonner';
import { useCircuitCanvasState } from '@/hooks/useCircuitCanvasState';
import { WokwiComponent } from '@/integrations/wokwi/WokwiIntegration';

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
  
  // State from useCircuitCanvasState
  canvasState: ReturnType<typeof useCircuitCanvasState>;
  
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
  
  // Initialize canvas state
  const canvasState = useCircuitCanvasState(components as WokwiComponent[]);
  
  // Handle component changes and update selected component if modified
  const handleComponentsChange = useCallback((updatedComponents: CircuitComponent[]) => {
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
  }, [selectedComponent]);
  
  const selectComponent = useCallback((component: CircuitComponent | null) => {
    setSelectedComponent(component);
  }, []);
  
  const addConnection = useCallback((connection: PinConnection) => {
    setConnections(prev => [...prev, connection]);
  }, []);
  
  const removeConnection = useCallback((connectionId: string) => {
    setConnections(prev => prev.filter(conn => 
      `${conn.sourceId}-${conn.sourcePinIndex}-${conn.targetId}-${conn.targetPinIndex}` !== connectionId
    ));
  }, []);
  
  const addSerialOutput = useCallback((message: string) => {
    setSerialOutput(prev => [...prev, message]);
  }, []);
  
  const clearSerialOutput = useCallback(() => {
    setSerialOutput([]);
  }, []);
  
  // Component attribute updates
  const handleUpdateComponentAttributes = useCallback((componentId: string, attributes: Record<string, any>) => {
    setComponents((prevComponents) =>
      prevComponents.map((component) =>
        component.id === componentId
          ? { ...component, attributes: { ...component.attributes, ...attributes } }
          : component
      )
    );
  }, []);
  
  // Toggle simulation
  const toggleSimulation = useCallback(() => {
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
  }, [isSimulationRunning]);
  
  // Project actions
  const saveProject = useCallback(() => {
    toast.success('Project saved successfully!');
  }, []);
  
  const undoLastAction = useCallback(() => {
    toast.error('Undo not available.');
  }, []);
  
  const exportProject = useCallback(() => {
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
  }, [components, code]);
  
  const importProject = useCallback(() => {
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
            console.error('Error parsing imported project:', error);
            toast.error('Failed to import project. Invalid file format.');
          }
        };
        
        reader.onerror = () => {
          toast.error('Failed to read the file');
        };
        
        reader.readAsText(file);
      }
    };
    
    input.click();
  }, []);
  
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
    canvasState,
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
    toggleSimulation
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
