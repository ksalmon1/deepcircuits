
import React from 'react';
import CircuitCanvasWrapper from '@/components/CircuitEditor/CircuitCanvasWrapper';
import CodeEditor from '@/components/CircuitEditor/CodeEditor';
import SerialMonitor from '@/components/CircuitEditor/SerialMonitor';
import ComponentPanel from '@/components/CircuitEditor/ComponentPanel';
import Toolbar from '@/components/CircuitEditor/Toolbar';
import PropertiesPanel from '@/components/CircuitEditor/PropertiesPanel';
import { useCircuitEditor, CircuitEditorProvider } from '@/context/CircuitEditorContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import ErrorBoundary from '@/components/CircuitEditor/ErrorBoundary';
import { useCircuitCanvasState } from '@/hooks/useCircuitCanvasState';

// Internal component that uses the context
const CircuitEditorContent = () => {
  const {
    components,
    selectedComponent,
    code,
    setCode,
    isSimulationRunning,
    serialOutput,
    handleComponentsChange,
    selectComponent,
    handleUpdateComponentAttributes,
    toggleSimulation,
    saveProject,
    undoLastAction,
    exportProject,
    importProject,
    errorState,
    clearError
  } = useCircuitEditor();
  
  // Directly use the useCircuitCanvasState hook instead of getting it from context
  const canvasState = useCircuitCanvasState(components);
  
  const isMobile = useIsMobile();
  
  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden">
      <ErrorBoundary 
        context="CircuitEditorToolbar" 
        resetKey={errorState.errorTimestamp}
      >
        <Toolbar 
          isSimulationRunning={isSimulationRunning}
          toggleSimulation={toggleSimulation}
          saveProject={saveProject}
          undoLastAction={undoLastAction}
          exportProject={exportProject}
          importProject={importProject}
        />
      </ErrorBoundary>
      
      <ResizablePanelGroup direction={isMobile ? "vertical" : "horizontal"} className="flex-1 overflow-hidden">
        {!isMobile ? (
          <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
            <ErrorBoundary context="ComponentPanel">
              <div className="h-full flex flex-col overflow-hidden">
                <ComponentPanel onComponentSelect={selectComponent} />
              </div>
            </ErrorBoundary>
          </ResizablePanel>
        ) : (
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="m-2">
                Components
              </Button>
            </SheetTrigger>
            <SheetContent side="left">
              <ErrorBoundary context="ComponentPanel">
                <ComponentPanel onComponentSelect={selectComponent} />
              </ErrorBoundary>
            </SheetContent>
          </Sheet>
        )}
        
        {!isMobile && <ResizableHandle />}
        
        <ResizablePanel defaultSize={60}>
          <div className="h-full flex flex-col">
            <div className="flex-1 relative">
              <ErrorBoundary 
                context="CircuitCanvas" 
                resetKey={errorState.errorTimestamp}
                onError={(error) => {
                  console.error("Circuit canvas error:", error);
                }}
              >
                <CircuitCanvasWrapper 
                  components={components} 
                  onComponentsChange={handleComponentsChange} 
                />
              </ErrorBoundary>
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
              <ErrorBoundary context="CodeEditor">
                <CodeEditor code={code} onChange={setCode} />
              </ErrorBoundary>
            </TabsContent>
            
            <TabsContent value="properties" className="flex-1 overflow-auto p-4">
              <ErrorBoundary context="PropertiesPanel">
                <PropertiesPanel 
                  selectedComponent={selectedComponent}
                  handleUpdateComponentAttributes={handleUpdateComponentAttributes}
                />
              </ErrorBoundary>
            </TabsContent>
            
            <TabsContent value="serial" className="flex-1 overflow-hidden">
              <ErrorBoundary context="SerialMonitor">
                <SerialMonitor 
                  isSimulationRunning={isSimulationRunning} 
                  serialOutput={serialOutput} 
                />
              </ErrorBoundary>
            </TabsContent>
          </Tabs>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
};

// Main component that provides the context
const CircuitEditorPage = () => {
  return (
    <ErrorBoundary 
      context="CircuitEditorPage"
      fallback={
        <div className="p-8 flex flex-col items-center justify-center h-screen">
          <div className="bg-red-50 border border-red-300 rounded-lg p-6 max-w-md">
            <h2 className="text-xl font-bold text-red-800 mb-4">Circuit Editor Error</h2>
            <p className="text-red-700 mb-4">
              The circuit editor has encountered a critical error and cannot be loaded.
            </p>
            <Button 
              onClick={() => window.location.reload()}
              variant="destructive"
            >
              Reload Page
            </Button>
          </div>
        </div>
      }
    >
      <CircuitEditorProvider>
        <CircuitEditorContent />
      </CircuitEditorProvider>
    </ErrorBoundary>
  );
};

export default CircuitEditorPage;
