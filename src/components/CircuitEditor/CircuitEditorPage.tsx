
import React, { useState } from 'react';
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
import { ChevronLeft, ChevronRight, PanelLeft, PanelRight } from 'lucide-react';

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
  const [isComponentPanelVisible, setIsComponentPanelVisible] = useState(true);
  
  const toggleComponentPanel = () => {
    setIsComponentPanelVisible(!isComponentPanelVisible);
  };
  
  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden">
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
          <>
            {isComponentPanelVisible && (
              <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
                <div className="h-full flex flex-col overflow-hidden">
                  <ComponentPanel onComponentSelect={handleComponentSelect} />
                </div>
              </ResizablePanel>
            )}
            
            <Button
              variant="outline"
              size="sm"
              className="absolute left-0 top-1/2 transform -translate-y-1/2 z-10 bg-white shadow-md rounded-r-md border border-l-0 h-12 hover:bg-gray-50"
              onClick={toggleComponentPanel}
              aria-label={isComponentPanelVisible ? "Hide components panel" : "Show components panel"}
              title={isComponentPanelVisible ? "Hide components panel" : "Show components panel"}
            >
              {isComponentPanelVisible ? 
                <PanelLeft className="h-5 w-5" /> : 
                <PanelRight className="h-5 w-5" />
              }
            </Button>
            
            {isComponentPanelVisible && <ResizableHandle />}
          </>
        ) : (
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="m-2">
                <PanelLeft className="h-4 w-4 mr-2" />
                Components
              </Button>
            </SheetTrigger>
            <SheetContent side="left">
              <ComponentPanel onComponentSelect={handleComponentSelect} />
            </SheetContent>
          </Sheet>
        )}
        
        <ResizablePanel defaultSize={isComponentPanelVisible ? 60 : 80}>
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
