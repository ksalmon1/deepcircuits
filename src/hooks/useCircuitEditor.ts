
import { useState, useCallback } from 'react';
import { CircuitComponent } from '@/types/component';
import { toast } from 'sonner';
import { useCircuitEditor as useCircuitEditorContext } from '@/context/CircuitEditorContext';

/**
 * @deprecated Use useCircuitEditor from @/context/CircuitEditorContext instead
 * This hook is maintained for backward compatibility during refactoring
 */
export function useCircuitEditor() {
  try {
    // Try to use the new context-based hook if available
    return useCircuitEditorContext();
  } catch (error) {
    // Fall back to the old implementation if not within provider
    console.warn('Using legacy useCircuitEditor hook outside of CircuitEditorProvider. Please update your code.');
    
    // Default initial code for Arduino sketch
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

    const [components, setComponents] = useState<CircuitComponent[]>([]);
    const [selectedComponent, setSelectedComponent] = useState<CircuitComponent | null>(null);
    const [code, setCode] = useState<string>(initialCode);
    const [isSimulationRunning, setIsSimulationRunning] = useState<boolean>(false);
    const [serialOutput, setSerialOutput] = useState<string[]>([]);
    
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
    
    const handleComponentSelect = useCallback((component: CircuitComponent) => {
      setSelectedComponent(component);
    }, []);
    
    const handleUpdateComponentAttributes = useCallback((componentId: string, attributes: Record<string, any>) => {
      setComponents((prevComponents) =>
        prevComponents.map((component) =>
          component.id === componentId
            ? { ...component, attributes: { ...component.attributes, ...attributes } }
            : component
        )
      );
    }, []);
    
    const toggleSimulation = useCallback(() => {
      setIsSimulationRunning(!isSimulationRunning);
      
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
    
    return {
      components,
      setComponents,
      selectedComponent,
      setSelectedComponent,
      code,
      setCode,
      isSimulationRunning,
      setIsSimulationRunning,
      serialOutput,
      setSerialOutput,
      handleComponentsChange,
      handleComponentSelect,
      handleUpdateComponentAttributes,
      toggleSimulation,
      saveProject,
      undoLastAction,
      exportProject,
      importProject
    };
  }
}
