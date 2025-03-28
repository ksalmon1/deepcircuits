
import { useState, useCallback } from 'react';
import { WokwiComponent } from '@/integrations/wokwi/WokwiIntegration';
import { toast } from 'sonner';

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

export function useCircuitEditor() {
  const [components, setComponents] = useState<WokwiComponent[]>([]);
  const [selectedComponent, setSelectedComponent] = useState<WokwiComponent | null>(null);
  const [code, setCode] = useState<string>(initialCode);
  const [isSimulationRunning, setIsSimulationRunning] = useState<boolean>(false);
  const [serialOutput, setSerialOutput] = useState<string[]>([]);
  
  const handleComponentsChange = useCallback((updatedComponents: WokwiComponent[]) => {
    setComponents(updatedComponents);
    
    if (selectedComponent) {
      const updatedSelectedComponent = updatedComponents.find(
        (comp) => comp.id === selectedComponent.id
      );
      setSelectedComponent(updatedSelectedComponent || null);
    }
    
    if (
      selectedComponent &&
      !updatedComponents.some((comp) => comp.id === selectedComponent.id)
    ) {
      setSelectedComponent(null);
    }
  }, [selectedComponent]);
  
  const handleComponentSelect = useCallback((component: WokwiComponent) => {
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
  }, [isSimulationRunning]);
  
  const saveProject = useCallback(() => {
    toast.success('Project saved successfully!');
  }, []);
  
  const undoLastAction = useCallback(() => {
    toast.error('Undo not available.');
  }, []);
  
  const exportProject = useCallback(() => {
    toast.success('Project exported successfully!');
  }, []);
  
  const importProject = useCallback(() => {
    toast.success('Project imported successfully!');
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
