
import React, { useState } from 'react';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import ComponentPanel from './ComponentPanel';
import CircuitCanvas from './CircuitCanvas';
import CodeEditor from './CodeEditor';
import SerialMonitor from './SerialMonitor';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { WokwiComponent } from '@/integrations/wokwi/WokwiIntegration';
import { useComponentLibrary } from '@/hooks/useComponentLibrary';

const CircuitEditorPage = () => {
  // State for circuit components
  const [components, setComponents] = useState<WokwiComponent[]>([]);
  
  // Pre-fetch all component details to have them ready for the circuit canvas
  const { refetchComponents } = useComponentLibrary();
  
  // Ensure we have the latest component library data
  React.useEffect(() => {
    refetchComponents();
  }, [refetchComponents]);

  const handleComponentsChange = (newComponents: WokwiComponent[]) => {
    setComponents(newComponents);
  };

  return (
    <div className="h-screen flex flex-col">
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        {/* Left panel: Component Library */}
        <ResizablePanel defaultSize={20} minSize={15} className="bg-muted/20 border-r">
          <div className="p-3 h-full">
            <ComponentPanel />
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Center panel: Circuit Canvas */}
        <ResizablePanel defaultSize={55}>
          <CircuitCanvas 
            components={components} 
            onComponentsChange={handleComponentsChange} 
          />
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Right panel: Code Editor & Serial Monitor */}
        <ResizablePanel defaultSize={25} minSize={20} className="bg-muted/20 border-l">
          <Tabs defaultValue="code" className="h-full flex flex-col">
            <div className="border-b px-3 py-1">
              <TabsList className="bg-transparent">
                <TabsTrigger value="code" className="data-[state=active]:bg-background">Code</TabsTrigger>
                <TabsTrigger value="serial" className="data-[state=active]:bg-background">Serial Monitor</TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="code" className="flex-1 mt-0 p-0">
              <CodeEditor />
            </TabsContent>
            
            <TabsContent value="serial" className="flex-1 mt-0 p-0">
              <SerialMonitor />
            </TabsContent>
          </Tabs>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
};

export default CircuitEditorPage;
