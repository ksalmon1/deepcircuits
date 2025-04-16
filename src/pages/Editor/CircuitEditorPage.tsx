import CircuitCanvasWrapper from '@/components/CircuitEditor/CircuitCanvasWrapper';
import CodeEditor from '@/components/CircuitEditor/CodeEditor';
import SerialMonitor from '@/components/CircuitEditor/SerialMonitor';
import ComponentPanel from '@/components/CircuitEditor/ComponentPanel';
import Toolbar from '@/components/CircuitEditor/Toolbar';
import PropertiesPanel from '@/components/CircuitEditor/PropertiesPanel';
import { 
  CircuitEditorProvider, 
  useProject, 
  useSimulation, 
  useSelection, 
  useError 
} from '@/context/CircuitEditorContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import ErrorBoundary from '@/components/CircuitEditor/ErrorBoundary';
import { useCircuitCanvasState } from '@/hooks/useCircuitCanvasState';
import React, { useMemo, useState, useCallback, useRef } from 'react';

// Memoize content components to prevent re-renders during resizing
const MemoizedCodeEditor = React.memo(CodeEditor);
const MemoizedSerialMonitor = React.memo(SerialMonitor);
const MemoizedPropertiesPanel = React.memo(PropertiesPanel);
const MemoizedCircuitCanvasWrapper = React.memo(CircuitCanvasWrapper);

// Internal component that uses the context
const CircuitEditorContent = () => {
  // Use the individual contexts instead of the combined useCircuitEditor
  const {
    components,
    handleComponentsChange,
    handleUpdateComponentAttributes,
    saveProject,
    undoLastAction,
    exportProject,
    importProject,
    code,
    setCode,
    wires,
    handleWiresChange
  } = useProject();
  
  const {
    isSimulationRunning,
    toggleSimulation,
    serialOutput
  } = useSimulation();
  
  const {
    selectedComponent,
    selectComponent
  } = useSelection();
  
  const {
    errorState
  } = useError();
  
  // Directly use the useCircuitCanvasState hook
  const canvasState = useCircuitCanvasState(components);
  
  const isMobile = useIsMobile();
  
  // Track active tab to prevent rendering inactive tabs
  const [activeTab, setActiveTab] = useState('code');
  
  // Store previous props in refs to compare and prevent unnecessary re-renders
  const prevCodeRef = useRef(code);
  const prevComponentsRef = useRef(components);
  const prevSerialOutputRef = useRef(serialOutput);
  const prevWiresRef = useRef(wires);
  
  // Callback for tab change
  const handleTabChange = useCallback((value: string) => {
    setActiveTab(value);
  }, []);
  
  // Memoize props with stable references
  const codeEditorProps = useMemo(() => {
    // Only update if code has changed
    if (prevCodeRef.current !== code) {
      prevCodeRef.current = code;
      return { code, onChange: setCode };
    }
    return { code: prevCodeRef.current, onChange: setCode };
  }, [code, setCode]);
  
  const canvasProps = useMemo(() => {
    // Only update if components or wires have changed
    if (prevComponentsRef.current !== components || prevWiresRef.current !== wires) {
      prevComponentsRef.current = components;
      prevWiresRef.current = wires;
      return { 
        components, 
        onComponentsChange: handleComponentsChange,
        wireConnections: wires,
        onWiresChange: handleWiresChange
      };
    }
    // Return previous props if no change
    return { 
      components: prevComponentsRef.current, 
      onComponentsChange: handleComponentsChange,
      wireConnections: prevWiresRef.current,
      onWiresChange: handleWiresChange
    };
  }, [components, handleComponentsChange, wires, handleWiresChange]);
  
  const serialMonitorProps = useMemo(() => {
    // Only update if serial output has changed
    if (prevSerialOutputRef.current !== serialOutput) {
      prevSerialOutputRef.current = serialOutput;
      return { isSimulationRunning, serialOutput };
    }
    return { isSimulationRunning, serialOutput: prevSerialOutputRef.current };
  }, [isSimulationRunning, serialOutput]);
  
  // Stable reference to the component panel props
  const componentPanelProps = useMemo(() => ({
    // Assuming this is the correct prop name, adjust if needed
    onAddComponent: selectComponent
  }), [selectComponent]);
  
  // Stable reference to the properties panel props
  const propertiesPanelProps = useMemo(() => ({
    selectedComponent,
    handleUpdateComponentAttributes
  }), [selectedComponent, handleUpdateComponentAttributes]);
  
  // Memoized content renderers to prevent re-creation on every render
  const renderCodeEditor = useCallback(() => (
    <ErrorBoundary context="CodeEditor">
      <MemoizedCodeEditor {...codeEditorProps} />
    </ErrorBoundary>
  ), [codeEditorProps]);
  
  const renderPropertiesPanel = useCallback(() => (
    <ErrorBoundary context="PropertiesPanel">
      <MemoizedPropertiesPanel {...propertiesPanelProps} />
    </ErrorBoundary>
  ), [propertiesPanelProps]);
  
  const renderSerialMonitor = useCallback(() => (
    <ErrorBoundary context="SerialMonitor">
      <MemoizedSerialMonitor {...serialMonitorProps} />
    </ErrorBoundary>
  ), [serialMonitorProps]);
  
  // Fix toolbar props to match expected types
  const toolbarProps = {
    isSimulationRunning,
    toggleSimulation,
    saveProject: () => {
      console.log('Save project called from toolbar');
      return saveProject('default-id', 'Default Project');
    },
    undoLastAction,
    exportProject,
    importProject: () => {
      console.log('Import project called from toolbar');
    }
  };
  
  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden">
      <ErrorBoundary 
        context="CircuitEditorToolbar" 
        resetKey={errorState.errorTimestamp}
      >
        <Toolbar {...toolbarProps} />
      </ErrorBoundary>
      
      <ResizablePanelGroup 
        direction={isMobile ? "vertical" : "horizontal"} 
        className="flex-1 overflow-hidden"
        id="circuit-editor-layout"
      >
        {!isMobile ? (
          <ResizablePanel defaultSize={20} minSize={15} maxSize={30} id="components-panel">
            <ErrorBoundary context="ComponentPanel">
              <div className="h-full flex flex-col overflow-hidden">
                <ComponentPanel {...componentPanelProps} />
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
                <ComponentPanel {...componentPanelProps} />
              </ErrorBoundary>
            </SheetContent>
          </Sheet>
        )}
        
        {!isMobile && <ResizableHandle withHandle />}
        
        <ResizablePanel defaultSize={60} id="canvas-panel">
          <div className="h-full flex flex-col">
            <div className="flex-1 relative">
              <ErrorBoundary 
                context="CircuitCanvas" 
                resetKey={errorState.errorTimestamp}
                onError={(error) => {
                  console.error("Circuit canvas error:", error);
                }}
              >
                <MemoizedCircuitCanvasWrapper {...canvasProps} />
              </ErrorBoundary>
            </div>
          </div>
        </ResizablePanel>
        
        {!isMobile && <ResizableHandle withHandle />}
        
        <ResizablePanel defaultSize={20} minSize={15} maxSize={40} id="editor-panel">
          <Tabs defaultValue="code" className="h-full flex flex-col" onValueChange={handleTabChange}>
            <TabsList className="w-full">
              <TabsTrigger value="code" className="flex-1">Code</TabsTrigger>
              <TabsTrigger value="properties" className="flex-1">Properties</TabsTrigger>
              <TabsTrigger value="serial" className="flex-1">Serial</TabsTrigger>
            </TabsList>
            
            {/* Using direct rendering based on active tab */}
            {activeTab === 'code' && (
              <div className="flex-1 overflow-hidden">
                {renderCodeEditor()}
              </div>
            )}
            
            {activeTab === 'properties' && (
              <div className="flex-1 overflow-auto p-4">
                {renderPropertiesPanel()}
              </div>
            )}
            
            {activeTab === 'serial' && (
              <div className="flex-1 overflow-hidden">
                {renderSerialMonitor()}
              </div>
            )}
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
