
import React, { useState, useCallback, useEffect } from 'react';
import CircuitCanvas from './CircuitCanvas';
import CodeEditor from './CodeEditor';
import SerialMonitor from './SerialMonitor';
import { toast } from 'sonner';
import ComponentPanel from './ComponentPanel';
import { WokwiComponent } from '@/integrations/wokwi/WokwiIntegration';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { PlayCircle, StopCircle, Save, Undo, Download, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import DynamicPropertyEditor from './DynamicPropertyEditor';
import { useMediaQuery } from '@/hooks/use-mobile';

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

// Interface definitions for component props
interface ComponentPanelProps {
  onComponentSelect: (component: WokwiComponent) => void;
}

interface CodeEditorProps {
  code: string;
  onChange: (code: string) => void;
}

interface SerialMonitorProps {
  isSimulationRunning: boolean;
  serialOutput: string[];
}

interface PropertyEditorProps {
  component: WokwiComponent;
  onUpdateAttributes: (attributes: Record<string, any>) => void;
}

const CircuitEditorPage = () => {
  const [components, setComponents] = useState<WokwiComponent[]>([]);
  const [selectedComponent, setSelectedComponent] = useState<WokwiComponent | null>(null);
  const [code, setCode] = useState<string>(initialCode);
  const [isSimulationRunning, setIsSimulationRunning] = useState<boolean>(false);
  const [serialOutput, setSerialOutput] = useState<string[]>([]);
  const isMobile = useMediaQuery("(max-width: 768px)");
  
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
  
  const toggleSimulation = () => {
    setIsSimulationRunning(!isSimulationRunning);
  };
  
  const saveProject = () => {
    toast.success('Project saved successfully!');
  };
  
  const undoLastAction = () => {
    toast.error('Undo not available.');
  };
  
  const exportProject = () => {
    toast.success('Project exported successfully!');
  };
  
  const importProject = () => {
    toast.success('Project imported successfully!');
  };
  
  // Define the ComponentPanel component with the appropriate props
  const ComponentPanelWithProps = ComponentPanel as React.FC<ComponentPanelProps>;
  // Define the CodeEditor component with the appropriate props
  const CodeEditorWithProps = CodeEditor as React.FC<CodeEditorProps>;
  // Define the SerialMonitor component with the appropriate props
  const SerialMonitorWithProps = SerialMonitor as React.FC<SerialMonitorProps>;
  // Define the DynamicPropertyEditor component with the appropriate props
  const PropertyEditorWithProps = DynamicPropertyEditor as React.FC<PropertyEditorProps>;
  
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 p-2 border-b">
        <Button 
          size="sm" 
          variant={isSimulationRunning ? "destructive" : "default"}
          onClick={toggleSimulation}
        >
          {isSimulationRunning ? (
            <>
              <StopCircle className="mr-1 h-4 w-4" />
              Stop
            </>
          ) : (
            <>
              <PlayCircle className="mr-1 h-4 w-4" />
              Run
            </>
          )}
        </Button>
        
        <Button size="sm" variant="outline" onClick={saveProject}>
          <Save className="mr-1 h-4 w-4" />
          Save
        </Button>
        
        <Button size="sm" variant="outline" onClick={undoLastAction} disabled={true}>
          <Undo className="mr-1 h-4 w-4" />
          Undo
        </Button>
        
        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="outline" onClick={exportProject}>
            <Download className="mr-1 h-4 w-4" />
            Export
          </Button>
          
          <Button size="sm" variant="outline" onClick={importProject}>
            <Upload className="mr-1 h-4 w-4" />
            Import
          </Button>
        </div>
      </div>
      
      <ResizablePanelGroup direction={isMobile ? "vertical" : "horizontal"} className="flex-1">
        {!isMobile ? (
          <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
            <div className="h-full overflow-auto p-2">
              <ComponentPanelWithProps onComponentSelect={handleComponentSelect} />
            </div>
          </ResizablePanel>
        ) : (
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="m-2">
                Components
              </Button>
            </SheetTrigger>
            <SheetContent side="left">
              <ComponentPanelWithProps onComponentSelect={handleComponentSelect} />
            </SheetContent>
          </Sheet>
        )}
        
        {!isMobile && <ResizableHandle />}
        
        <ResizablePanel defaultSize={60}>
          <div className="h-full flex flex-col">
            <div className="flex-1 relative">
              <CircuitCanvas 
                components={components} 
                onComponentsChange={handleComponentsChange} 
              />
            </div>
          </div>
        </ResizablePanel>
        
        {!isMobile && <ResizableHandle />}
        
        <ResizablePanel defaultSize={20} minSize={15} maxSize={40}>
          <Tabs defaultValue="code">
            <TabsList className="w-full">
              <TabsTrigger value="code" className="flex-1">Code</TabsTrigger>
              <TabsTrigger value="properties" className="flex-1">Properties</TabsTrigger>
              <TabsTrigger value="serial" className="flex-1">Serial</TabsTrigger>
            </TabsList>
            
            <TabsContent value="code" className="h-[calc(100%-40px)]">
              <CodeEditorWithProps code={code} onChange={setCode} />
            </TabsContent>
            
            <TabsContent value="properties" className="h-[calc(100%-40px)] overflow-auto p-4">
              {selectedComponent ? (
                <PropertyEditorWithProps
                  component={selectedComponent}
                  onUpdateAttributes={(attributes) =>
                    handleUpdateComponentAttributes(selectedComponent.id, attributes)
                  }
                />
              ) : (
                <div className="text-center text-gray-500 mt-8">
                  Select a component to edit its properties
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="serial" className="h-[calc(100%-40px)]">
              <SerialMonitorWithProps 
                isSimulationRunning={isSimulationRunning} 
                serialOutput={serialOutput} 
              />
            </TabsContent>
          </Tabs>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
};

export default CircuitEditorPage;
