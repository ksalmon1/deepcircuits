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
  RotateCw, Square
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate, useLocation, useBlocker } from '@/lib/router';
import { CircuitComponent } from '@/types/component';
//import { WireConnection } from '@/types/circuit';
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
import { getProjectById } from '@/services/projectsApi';
import { SimulationResults } from '@/simulation/spiceService';
import { Node, Edge } from '@xyflow/react';
import { useProject } from '@/context/ProjectContext';
import { useComponentLibrary } from '@/hooks/useComponentLibrary';
import { useSimulation } from '@/context/SimulationContext';

// Define styles for the resize handle
const resizeHandleStyle = "w-[1px] bg-border hover:bg-primary transition-colors duration-200 ease-in-out";
const verticalResizeHandleStyle = "h-[1px] bg-border hover:bg-primary transition-colors duration-200 ease-in-out";

// Define props for the content component
interface CircuitEditorLayoutContentProps {
  projectId: string | null;
  isModified: boolean;
  setIsModified: React.Dispatch<React.SetStateAction<boolean>>;
  circuitName: string;
  setCircuitName: React.Dispatch<React.SetStateAction<string>>;
  saveHandlerRef: React.MutableRefObject<(() => Promise<boolean>) | null>;
  isSaving: boolean;
  setIsSaving: React.Dispatch<React.SetStateAction<boolean>>;
}

/**
 * Circuit Editor Layout Content - Now receives state/setters as props + ref
 */
const CircuitEditorLayoutContent = ({ 
  projectId,
  isModified,
  setIsModified,
  circuitName,
  setCircuitName,
  saveHandlerRef,
  isSaving,
  setIsSaving
}: CircuitEditorLayoutContentProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  
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
  
  const { components: projectComponents, wires: projectWires } = useProject();
  const { componentsDetailsMap } = useComponentLibrary();
  
  // Get the addSerialOutput function from the simulation context
  const { addSerialOutput, clearSerialOutput } = useSimulation();
  
  // Internal state for the content layout and UI toggles
  const [showCodeEditor, setShowCodeEditor] = useState<boolean>(false);
  const [showSerialMonitor, setShowSerialMonitor] = useState<boolean>(false);
  const [verticalSplit, setVerticalSplit] = useState<boolean>(true);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState<boolean>(false);
  const [isLoadingProject, setIsLoadingProject] = useState<boolean>(true);
  // State for panel sizes - Keep this internal to the content component
  const [mainLayout, setMainLayout] = useState<number[]>([73, 27]); 
  const [editorMonitorLayout, setEditorMonitorLayout] = useState<number[]>([50, 50]);

  const loadedProjectIdRef = useRef<string | null>(null); 
  const isInitializingRef = useRef<boolean>(false); 
  const isInitialLoadCompleteRef = useRef<boolean>(false);
  const isModifiedRef = useRef<boolean>(isModified);
  const mainPanelGroupRef = useRef<ImperativePanelGroupHandle>(null);
  const innerPanelGroupRef = useRef<ImperativePanelGroupHandle>(null);

  // Define layout handlers here, where they manage local state
  const handleMainLayout: PanelGroupOnLayout = (sizes) => {
    if (sizes.length === 2 && sizes[1] > 0) {
      setMainLayout(sizes);
    }
  };

  const handleEditorMonitorLayout: PanelGroupOnLayout = (sizes) => {
    if (showCodeEditor && showSerialMonitor && sizes.length === 2 && sizes[0] > 0 && sizes[1] > 0) {
      setEditorMonitorLayout(sizes);
    }
  };

  useEffect(() => {
    isModifiedRef.current = isModified;
  }, [isModified]);
  
  useEffect(() => {
    const effectId = Date.now();
    //console.log(`[${effectId}] Load Effect: Running. ProjectId: ${projectId}, LoadedRef: ${loadedProjectIdRef.current}`);

    if (projectId && loadedProjectIdRef.current === projectId) {
      //console.log(`[${effectId}] Load Effect: Skipping fetch, already loaded.`);
      if (isLoadingProject) setIsLoadingProject(false);
      return;
    }

    if (projectId) {
      loadedProjectIdRef.current = projectId;
      setIsLoadingProject(true);
      isInitializingRef.current = true;
      isInitialLoadCompleteRef.current = false;
      //console.log(`[${effectId}] Load Effect: Attempting fetch.`);
      getProjectById(projectId)
        .then(projectData => {
          //console.log(`[${effectId}] Load Effect: Fetch resolved.`);
          if (loadedProjectIdRef.current !== projectId) {
            //console.log(`[${effectId}] Load Effect: Stale fetch result ignored.`);
            return;
          }
          if (projectData) {
            //console.log(`[${effectId}] Load Effect: Project data found.`);
            initializeProjectState({
              components: projectData.components ?? [],
              wires: projectData.wires ?? [],
              code: projectData.code ?? '',
            });
            setCircuitName(projectData.name || 'Untitled Circuit');
            setIsModified(false);
          } else {
            console.warn(`[${effectId}] Load Effect: Project not found.`);
            clearCircuitState();
            setCircuitName('Project Not Found');
          }
        })
        .catch(error => {
          //console.log(`[${effectId}] Load Effect: Fetch errored.`);
           if (loadedProjectIdRef.current !== projectId) {
              //console.log(`[${effectId}] Load Effect: Stale error ignored.`);
              return; 
          }
          console.error(`[${effectId}] Error loading project:`, error);
          toast.error(`Failed to load project: ${error.message}`);
          setCircuitName('Error Loading Project');
        })
        .finally(() => {
          //console.log(`[${effectId}] Load Effect: Finally block.`);
          if (loadedProjectIdRef.current === projectId) {
             //console.log(`[${effectId}] Load Effect: Updating refs.`);
             isInitializingRef.current = false;
             setIsLoadingProject(false);
             isInitialLoadCompleteRef.current = true;
          } else {
              //console.log(`[${effectId}] Load Effect: Finally skip.`);
          }
        });
    } else {
       //console.log(`[${effectId}] Load Effect: No projectId.`);
      clearCircuitState(); 
      loadedProjectIdRef.current = null;
      isInitializingRef.current = false;
      isInitialLoadCompleteRef.current = false;
      setCircuitName('New Circuit');
      setIsModified(false);
      setIsLoadingProject(false);
    }
   }, [projectId, initializeProjectState, clearCircuitState, setCircuitName, setIsModified]);

  useEffect(() => {
    document.title = `${circuitName} - DeepCircuits Editor`;
    return () => {
      document.title = 'DeepCircuits - Interactive Circuit Simulator';
    };
  }, [circuitName]);

  const handleSimulate = () => {
    toggleSimulation();
  };

  const handleClearCircuit = () => {
    setIsClearConfirmOpen(true);
  };

  const handleBackToDashboard = () => {
    //console.log('[handleBackToDashboard] triggered. Attempting navigation...');
    navigate('/dashboard'); 
  };

  const handleCompileCode = async (codeToCompile: string) => {
    console.log('Compiling code:', codeToCompile);
    toast.success('Code compiled and uploaded to simulated microcontroller');
  };

  const handleCodeChange = (newCode: string) => {
    updateCode(newCode);
    setIsModified(true);
  };

  const toggleOrientation = () => {
    setVerticalSplit(!verticalSplit);
  };

  const handleComponentSelect = (component: CircuitComponent) => {
    //console.log('Component selected:', component);
    selectComponent(component);
  };

  const handleRotateSelectedComponent = useCallback(() => {
    if (selectedComponent) {
      rotateComponent(selectedComponent.id);
      setIsModified(true);
    }
  }, [selectedComponent, rotateComponent]);

  useEffect(() => {
    const mainGroup = mainPanelGroupRef.current;
    const innerGroup = innerPanelGroupRef.current;

    requestAnimationFrame(() => {
      if (mainGroup) {
        const expectedMainLayout = (showCodeEditor || showSerialMonitor)
          ? mainLayout 
          : [100];
        
        if (expectedMainLayout && expectedMainLayout.reduce((sum, size) => sum + size, 0) > 99) {
            try {
                mainGroup.setLayout(expectedMainLayout);
            } catch (error) {
                console.error("Error setting main layout:", error, "Layout:", expectedMainLayout);
            }
        } else {
            console.warn("Skipping main setLayout due to potentially invalid sizes:", expectedMainLayout);
        }
      }

      if (innerGroup && showCodeEditor && showSerialMonitor) {
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

  const performClear = () => {
    //console.log("--- performClear called ---");
    clearCircuitState(); 
    setIsModified(true);
  };

  const handleSaveCircuitInternal = useCallback(async (): Promise<boolean> => {
    const currentProjectId = projectId;
    if (!currentProjectId) {
      toast.error('Cannot save: Project ID is missing.');
      return false; 
    }
    if (!circuitName) {
      toast.error('Cannot save: Project Name is missing.');
      return false; 
    }
    
    setIsSaving(true);
    let success = false;
    try {
      success = await saveProject(currentProjectId, circuitName);
      if (success) {
        setIsModified(false);
      }
    } catch (error) {
      console.error("Error calling saveProject from content:", error); 
      success = false;
    } finally {
      setIsSaving(false);
    }
    return success; 
  }, [projectId, circuitName, saveProject, setIsSaving, setIsModified]);

  useEffect(() => {
    if (saveHandlerRef) {
      saveHandlerRef.current = handleSaveCircuitInternal;
    }
    return () => {
      if (saveHandlerRef) {
        saveHandlerRef.current = null;
      }
    };
  }, [saveHandlerRef, handleSaveCircuitInternal]);

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
            onClick={handleSaveCircuitInternal}
            disabled={isSaving || !isModified}
          >
            <Save className="mr-1 h-4 w-4" />
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
          <Button 
            size="sm"
            onClick={handleSimulate}
          >
            {isSimulationRunning ? (
              <Square className="mr-1 h-4 w-4" />
            ) : (
              <Play className="mr-1 h-4 w-4" />
            )}
            {isSimulationRunning ? 'Stop' : 'Start'}
          </Button>
        </div>
      </div>

      <ReactFlowProvider>
        <div className="flex-1 flex">
          <div className="w-64 border-r bg-gray-50 p-4 overflow-y-auto flex-shrink-0">
            <ComponentPanel />
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
                    circuitComponents={projectComponents} 
                    wireConnections={projectWires}
                    onComponentsChange={handleComponentsChange}
                    onWiresChange={handleWiresChange}
                    onModified={() => setIsModified(true)}
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
                            clearSerialOutput={clearSerialOutput}
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
 * Main Circuit Editor Layout component that provides the context AND handles blocking
 */
export const CircuitEditorLayout = ({ projectId = null }: { projectId?: string | null }) => {
  const [isModified, setIsModified] = useState<boolean>(false);
  const [circuitName, setCircuitName] = useState<string>('Loading Project...');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const saveHandlerRef = useRef<(() => Promise<boolean>) | null>(null);

  const [showNavigationBlockerDialog, setShowNavigationBlockerDialog] = useState(false);
  const blocker = useBlocker(() => isModified); 
  const isModifiedRef = useRef<boolean>(isModified);
  useEffect(() => { isModifiedRef.current = isModified; }, [isModified]);
  useEffect(() => {
    if (blocker.state === "blocked") { setShowNavigationBlockerDialog(true); }
    else { setShowNavigationBlockerDialog(false); }
  }, [blocker.state]);

  return (
    <CircuitEditorProvider>
      <CircuitEditorLayoutContent 
        projectId={projectId}
        isModified={isModified}
        setIsModified={setIsModified}
        circuitName={circuitName}
        setCircuitName={setCircuitName}
        saveHandlerRef={saveHandlerRef}
        isSaving={isSaving}
        setIsSaving={setIsSaving}
      />
      <AlertDialog open={showNavigationBlockerDialog} onOpenChange={setShowNavigationBlockerDialog}>
         <AlertDialogContent>
           <AlertDialogHeader>
             <AlertDialogTitle>Leave Page?</AlertDialogTitle>
             <AlertDialogDescription>
               You have unsaved changes. Are you sure you want to leave?
             </AlertDialogDescription>
           </AlertDialogHeader>
           <AlertDialogFooter>
             <AlertDialogCancel onClick={() => blocker.reset?.()}>Cancel</AlertDialogCancel>
             <AlertDialogAction 
               onClick={async () => {
                 if (saveHandlerRef.current) {
                   const saveSuccess = await saveHandlerRef.current(); 
                   if (saveSuccess) {
                     blocker.proceed?.(); 
                   } else {
                     blocker.reset?.(); 
                   }
                 } else {
                    console.error("Save handler ref not set!");
                    toast.error("Cannot save, save handler not available.");
                    blocker.reset?.();
                 }
               }}
               disabled={isSaving}
             >
               {isSaving ? 'Saving...' : 'Save & Leave'}
             </AlertDialogAction>
             <AlertDialogAction 
               className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
               onClick={() => blocker.proceed?.()}
             >
               Leave Anyway
             </AlertDialogAction>
           </AlertDialogFooter>
         </AlertDialogContent>
      </AlertDialog>
    </CircuitEditorProvider>
  );
};

export default CircuitEditorLayout;
