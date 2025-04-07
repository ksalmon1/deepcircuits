import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import {
  Panel,
  PanelGroup,
  PanelResizeHandle,
  PanelGroupOnLayout,
  ImperativePanelGroupHandle
} from "react-resizable-panels";
import CircuitCanvas from './CircuitCanvas';
import ComponentPanel from './ComponentPanel';
import CodeEditor from './CodeEditor';
import SerialMonitor from './SerialMonitor';
import { Button } from '@/components/ui/button';
import { 
  Play, Save, Undo, Redo, Trash2, ArrowLeft, 
  Code, MonitorUp, SplitSquareVertical, SplitSquareHorizontal,
  RotateCw
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { CircuitComponent } from '@/types/component';
import { WireConnection } from '@/types/circuit';
import { CircuitEditorProvider, useCircuitEditor } from '@/context/CircuitEditorContext';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { getProjectById } from '@/integrations/supabase/projectsApi';

// Define styles for the resize handle
const resizeHandleStyle = "w-[1px] bg-border hover:bg-primary transition-colors duration-200 ease-in-out";
const verticalResizeHandleStyle = "h-[1px] bg-border hover:bg-primary transition-colors duration-200 ease-in-out";

/**
 * Circuit Editor Layout Content - uses the CircuitEditorContext
 */
const CircuitEditorLayoutContent = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const projectId = params.id || null;
  
  const {
    components, 
    wires, 
    code, 
    handleWiresChange, 
    handleComponentsChange,
    updateCode,
    undoLastAction,
    redoLastAction,
    selectComponent,
    toggleSimulation,
    saveProject,
    canUndo,
    canRedo,
    isSimulationRunning,
    serialOutput,
    selectedComponent,
    rotateComponent,
    clearCircuitState,
    initializeProjectState,
  } = useCircuitEditor();
  
  const [circuitName, setCircuitName] = useState<string>('Loading Project...');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isModified, setIsModified] = useState<boolean>(false);
  const [showCodeEditor, setShowCodeEditor] = useState<boolean>(false);
  const [showSerialMonitor, setShowSerialMonitor] = useState<boolean>(false);
  const [verticalSplit, setVerticalSplit] = useState<boolean>(true);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState<boolean>(false);
  const [isLoadingProject, setIsLoadingProject] = useState<boolean>(true);
  const loadedProjectIdRef = useRef<string | null>(null); // Ref to track loaded ID
  
  // State to store panel sizes - Adjust mainLayout default
  const [mainLayout, setMainLayout] = useState<number[]>([73, 27]); // Canvas 73%, Editor/Monitor 27%
  const [editorMonitorLayout, setEditorMonitorLayout] = useState<number[]>([50, 50]);

  // Add refs for PanelGroups
  const mainPanelGroupRef = useRef<ImperativePanelGroupHandle>(null);
  const innerPanelGroupRef = useRef<ImperativePanelGroupHandle>(null);

  // Handlers to update layout state
  const handleMainLayout: PanelGroupOnLayout = (sizes) => {
    // Only save layout if the second panel is visible and has size
    if (sizes.length === 2 && sizes[1] > 0) {
      setMainLayout(sizes);
    }
  };

  const handleEditorMonitorLayout: PanelGroupOnLayout = (sizes) => {
    // Only save layout if both inner panels are visible and have size
    if (showCodeEditor && showSerialMonitor && sizes.length === 2 && sizes[0] > 0 && sizes[1] > 0) {
      setEditorMonitorLayout(sizes);
    }
    // Handle cases where only one panel is visible (layout will be [100])
    // No need to save this layout as it's implicit when only one is shown
  };

  useEffect(() => {
    // Prevent re-fetch/re-init if the current projectId is already loaded
    if (projectId && loadedProjectIdRef.current === projectId) {
        console.log(`Project ${projectId} is already loaded. Skipping fetch.`);
        // If we are skipping because it's loaded, ensure loading is false.
        if (isLoadingProject) setIsLoadingProject(false);
        return; 
    }

    // If we reach here, we intend to load this projectId.
    // Set the ref *immediately* to prevent StrictMode double-run race condition.
    if (projectId) {
        loadedProjectIdRef.current = projectId; // Set ref BEFORE async fetch
        setIsLoadingProject(true);
        console.log(`Attempting to load project with ID: ${projectId}`);
        getProjectById(projectId)
          .then(projectData => {
              // Check if the component is still mounted and processing the *correct* ID
              // This check might be redundant now but adds safety
              if (loadedProjectIdRef.current !== projectId) {
                  console.log("Stale fetch result ignored for", projectId);
                  return; 
              }
              if (projectData) {
                console.log("Project data fetched:", projectData);
                initializeProjectState({
                  components: projectData.components ?? [],
                  wires: projectData.wires ?? [],
                  code: projectData.code ?? '',
                });
                setCircuitName(projectData.name || 'Untitled Circuit');
                setIsModified(false);
                // No need to set ref here, already set
              } else {
                console.warn(`Project with ID ${projectId} not found in database.`);
                toast.error("Project not found");
                setCircuitName('Project Not Found');
                // Clear the state if project not found?
                clearCircuitState(); 
                // No need to set ref here, already set
              }
          })
          .catch(error => {
               if (loadedProjectIdRef.current !== projectId) {
                  console.log("Stale fetch error ignored for", projectId);
                  return; 
              }
              console.error("Error loading project:", error);
              toast.error(`Failed to load project: ${error.message}`);
              setCircuitName('Error Loading Project');
              // No need to set ref here, already set
          })
          .finally(() => {
              // Only set loading false if we are still concerned with this projectId
              if (loadedProjectIdRef.current === projectId) {
                 setIsLoadingProject(false);
              }
          });
    } else {
      // Handle case where there is no projectId
      console.warn("No projectId provided in URL for loading.");
      setCircuitName('New Circuit');
      setIsLoadingProject(false);
      clearCircuitState(); 
      loadedProjectIdRef.current = null; // Reset ref if no project ID
    }
    // Dependency array should only include external values that trigger a re-fetch/re-init
  }, [projectId, initializeProjectState, clearCircuitState]); // Removed isLoadingProject

  useEffect(() => {
    document.title = `${circuitName} - DeepCircuits Editor`;
    return () => {
      document.title = 'DeepCircuits - Interactive Circuit Simulator';
    };
  }, [circuitName]);

  const handleSaveCircuit = async () => {
    if (!projectId) {
        toast.error('Cannot save: Project ID is missing.');
        console.error("Save attempt failed: No Project ID found in URL params.");
        return;
    }
    if (!circuitName) {
        toast.error('Cannot save: Project Name is missing.');
        console.error("Save attempt failed: circuitName state is empty.");
        return;
    }
    
    setIsSaving(true);
    try {
      await saveProject(projectId, circuitName);
      setIsModified(false);
    } catch (error) {
      console.error("Save operation failed in layout:", error); 
    } finally {
      setIsSaving(false);
    }
  };

  const handleSimulate = () => {
    setShowSerialMonitor(true);
    toggleSimulation();
  };

  const handleClearCircuit = () => {
    setIsClearConfirmOpen(true);
  };

  const handleBackToDashboard = () => {
    if (isModified) {
      toast.warning('Unsaved changes', {
        description: 'You have unsaved changes. Save before leaving?',
        duration: Infinity,
        action: {
          label: 'Save & Exit',
          onClick: () => {
            handleSaveCircuit();
            navigate('/dashboard');
          },
        },
        cancel: {
          label: 'Exit Anyway',
          onClick: () => navigate('/dashboard'),
        },
      });
    } else {
      navigate('/dashboard');
    }
  };

  const handleCompileCode = async (codeToCompile: string) => {
    console.log('Compiling code:', codeToCompile);
    toast.success('Code compiled and uploaded to simulated microcontroller');
  };

  const handleCodeChange = (newCode: string) => {
    updateCode(newCode);
  };

  useEffect(() => {
    if (components.length > 0) {
      setIsModified(true);
    }
  }, [components]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsModified(true);
    }, 5000);
    
    return () => clearTimeout(timer);
  }, []);

  const toggleOrientation = () => {
    setVerticalSplit(!verticalSplit);
  };

  const handleComponentSelect = (component: CircuitComponent) => {
    console.log('Component selected:', component);
    selectComponent(component);
  };

  const handleRotateSelectedComponent = useCallback(() => {
    if (selectedComponent) {
      rotateComponent(selectedComponent.id);
    }
  }, [selectedComponent, rotateComponent]);

  // useEffect to manually trigger layout update when visibility/orientation changes
  useEffect(() => {
    const mainGroup = mainPanelGroupRef.current;
    const innerGroup = innerPanelGroupRef.current;

    requestAnimationFrame(() => {
      if (mainGroup) {
        // Determine the correct layout based on current visibility
        const expectedMainLayout = (showCodeEditor || showSerialMonitor)
          ? mainLayout  // Use stored layout [73, 27] if second panel is visible
          : [100];     // Use layout [100] if only canvas is visible
        
        // Check if expected layout is valid before setting
        if (expectedMainLayout && expectedMainLayout.reduce((sum, size) => sum + size, 0) > 99) { // Basic check for ~100%
            try {
                mainGroup.setLayout(expectedMainLayout);
            } catch (error) {
                // Catch potential errors during layout setting, though validation should prevent most
                console.error("Error setting main layout:", error, "Layout:", expectedMainLayout);
            }
        } else {
            console.warn("Skipping main setLayout due to potentially invalid sizes:", expectedMainLayout);
        }
      }

      // Only set inner layout if the inner group exists AND both panels are visible
      if (innerGroup && showCodeEditor && showSerialMonitor) {
         // Check if expected layout is valid before setting
         if (editorMonitorLayout && editorMonitorLayout.reduce((sum, size) => sum + size, 0) > 99) {
            try {
                innerGroup.setLayout(editorMonitorLayout);
            } catch (error) {
                console.error("Error setting inner layout:", error, "Layout:", editorMonitorLayout);
            }
         } else {
             console.warn("Skipping inner setLayout due to potentially invalid sizes:", editorMonitorLayout);
         }
      }
    });
  }, [showCodeEditor, showSerialMonitor, verticalSplit, mainLayout, editorMonitorLayout]);

  // Function to actually perform the clearing - use new context action
  const performClear = () => {
    console.log("--- performClear called ---");
    // Call the context action which handles state update and history reset
    clearCircuitState(); 
    // Remove individual calls and toast (toast is now handled in context action)
    // console.log("Clearing components...");
    // handleComponentsChange([...[]]);
    // console.log("Clearing wires...");
    // handleWiresChange([...[]]);
    // console.log("--- performClear finished ---");
    // toast.success('Circuit cleared');
  };

  if (isLoadingProject) {
    return (
        <div className="flex h-screen items-center justify-center">
          <p>Loading project...</p>
        </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="bg-white border-b p-2 flex items-center justify-between">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleBackToDashboard}
            className="mr-2"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Dashboard
          </Button>
          <div className="text-lg font-semibold text-primary mr-4">Circuit Editor</div>
          <input
            type="text"
            value={circuitName}
            onChange={(e) => {
              setCircuitName(e.target.value);
              setIsModified(true);
            }}
            className="border rounded px-2 py-1 text-sm w-64"
          />
          {isModified && <span className="ml-2 text-xs text-amber-600">●</span>}
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowCodeEditor(!showCodeEditor)}
            className={showCodeEditor ? "bg-secondary" : ""}
          >
            <Code className="mr-1 h-4 w-4" />
            Code
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowSerialMonitor(!showSerialMonitor)}
            className={showSerialMonitor ? "bg-secondary" : ""}
          >
            <MonitorUp className="mr-1 h-4 w-4" />
            Serial
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={toggleOrientation}
            title={verticalSplit ? "Switch to horizontal layout" : "Switch to vertical layout"}
          >
            {verticalSplit ? 
              <SplitSquareHorizontal className="h-4 w-4" /> : 
              <SplitSquareVertical className="h-4 w-4" />
            }
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleClearCircuit}
          >
            <Trash2 className="mr-1 h-4 w-4" />
            Clear
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleRotateSelectedComponent}
            disabled={!selectedComponent}
            title={selectedComponent ? "Rotate Selected Component (R)" : "Select a component to rotate"}
          >
            <RotateCw className="mr-1 h-4 w-4" />
            Rotate
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={undoLastAction} 
            disabled={!canUndo}
          >
            <Undo className="mr-1 h-4 w-4" />
            Undo
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={redoLastAction} 
            disabled={!canRedo}
          >
            <Redo className="mr-1 h-4 w-4" />
            Redo
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleSaveCircuit}
            disabled={isSaving || !isModified}
          >
            <Save className="mr-1 h-4 w-4" />
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
          <Button 
            size="sm"
            onClick={handleSimulate}
          >
            <Play className="mr-1 h-4 w-4" />
            Simulate
          </Button>
        </div>
      </div>

      <ReactFlowProvider>
        <div className="flex-1 flex">
          <div className="w-64 border-r bg-gray-50 p-4 overflow-y-auto flex-shrink-0">
            <ComponentPanel onComponentSelect={handleComponentSelect} />
          </div>

          <div className="flex-1 flex flex-col overflow-hidden">
            <PanelGroup
              ref={mainPanelGroupRef}
              direction={verticalSplit ? "horizontal" : "vertical"}
              className="flex-1"
              onLayout={handleMainLayout}
            >
              <Panel 
                id="canvas" 
                order={1} 
                defaultSize={(showCodeEditor || showSerialMonitor) ? mainLayout[0] : 100} 
                minSize={30}
              >
                <div className="h-full w-full overflow-hidden">
                  <CircuitCanvas 
                    circuitComponents={components} 
                    wireConnections={wires}
                    onComponentsChange={handleComponentsChange}
                    onWiresChange={handleWiresChange}
                  />
                </div>
              </Panel>

              {(showCodeEditor || showSerialMonitor) && (
                <PanelResizeHandle className={verticalSplit ? resizeHandleStyle : verticalResizeHandleStyle} />
              )}

              {(showCodeEditor || showSerialMonitor) && (
                <Panel
                  id="editor-monitor-section"
                  order={2}
                  defaultSize={mainLayout[1]}
                  minSize={20}
                  collapsible={false}
                  collapsedSize={0}
                >
                  <PanelGroup
                    ref={innerPanelGroupRef}
                    direction={verticalSplit ? "vertical" : "horizontal"}
                    className="h-full w-full"
                    onLayout={handleEditorMonitorLayout}
                  >
                    {showCodeEditor && (
                      <Panel
                        id="code-editor"
                        order={1}
                        defaultSize={showSerialMonitor ? editorMonitorLayout[0] : 100}
                        minSize={20}
                      >
                        <div className="h-full w-full overflow-hidden">
                          <CodeEditor 
                            code={code} 
                            onChange={handleCodeChange} 
                            onCompile={handleCompileCode} 
                          />
                        </div>
                      </Panel>
                    )}

                    {showCodeEditor && showSerialMonitor && (
                      <PanelResizeHandle className={verticalSplit ? verticalResizeHandleStyle : resizeHandleStyle} />
                    )}

                    {showSerialMonitor && (
                      <Panel
                        id="serial-monitor"
                        order={2}
                        defaultSize={showCodeEditor ? editorMonitorLayout[1] : 100}
                        minSize={20}
                      >
                        <div className="h-full w-full overflow-hidden">
                          <SerialMonitor 
                            isSimulationRunning={isSimulationRunning} 
                            serialOutput={serialOutput} 
                          />
                        </div>
                      </Panel>
                    )}
                  </PanelGroup>
                </Panel>
              )}
            </PanelGroup>
          </div>
        </div>
      </ReactFlowProvider>

      <AlertDialog open={isClearConfirmOpen} onOpenChange={setIsClearConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently remove all 
              components and wires from your current circuit design.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={performClear}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
};

/**
 * Main Circuit Editor Layout component that provides the context
 */
export const CircuitEditorLayout = () => {
  return (
    <CircuitEditorProvider>
      <CircuitEditorLayoutContent />
    </CircuitEditorProvider>
  );
};

export default CircuitEditorLayout;
