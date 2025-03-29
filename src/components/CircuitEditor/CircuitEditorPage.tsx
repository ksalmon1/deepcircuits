
import React from 'react';
import CircuitCanvas from './CircuitCanvas';
import CodeEditor from './CodeEditor';
import SerialMonitor from './SerialMonitor';
import ComponentPanel from './ComponentPanel';
import Toolbar from './Toolbar';
import PropertiesPanel from './PropertiesPanel';
import { useCircuitEditor } from '@/hooks/useCircuitEditor';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';

const CircuitEditorPage = () => {
  const {
    components,
    selectedComponent,
    code,
    setCode,
    isSimulationRunning,
    serialOutput,
    handleComponentsChange,
    handleComponentSelect,
    handleUpdateComponentAttributes,
    toggleSimulation,
    saveProject,
    undoLastAction,
    exportProject,
    importProject
  } = useCircuitEditor();
  
  const isMobile = useIsMobile();
  
  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Toolbar 
        isSimulationRunning={isSimulationRunning}
        toggleSimulation={toggleSimulation}
        saveProject={saveProject}
        undoLastAction={undoLastAction}
        exportProject={exportProject}
        importProject={importProject}
      />
      
      <ResizablePanelGroup direction={isMobile ? "vertical" : "horizontal"} className="flex-1 overflow-hidden">
        {!isMobile ? (
          <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
            <div className="h-full flex flex-col overflow-hidden">
              <ComponentPanel onComponentSelect={handleComponentSelect} />
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
              <ComponentPanel onComponentSelect={handleComponentSelect} />
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
          <Tabs defaultValue="code" className="h-full flex flex-col">
            <TabsList className="w-full">
              <TabsTrigger value="code" className="flex-1">Code</TabsTrigger>
              <TabsTrigger value="properties" className="flex-1">Properties</TabsTrigger>
              <TabsTrigger value="serial" className="flex-1">Serial</TabsTrigger>
            </TabsList>
            
            <TabsContent value="code" className="flex-1 overflow-hidden">
              <CodeEditor code={code} onChange={setCode} />
            </TabsContent>
            
            <TabsContent value="properties" className="flex-1 overflow-auto p-4">
              <PropertiesPanel 
                selectedComponent={selectedComponent}
                handleUpdateComponentAttributes={handleUpdateComponentAttributes}
              />
            </TabsContent>
            
            <TabsContent value="serial" className="flex-1 overflow-hidden">
              <SerialMonitor 
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
