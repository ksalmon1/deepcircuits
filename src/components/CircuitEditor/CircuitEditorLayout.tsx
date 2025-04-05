import React, { useState, useEffect, useCallback } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
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
  } = useCircuitEditor();
  
  const [circuitName, setCircuitName] = useState<string>('Untitled Circuit');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isModified, setIsModified] = useState<boolean>(false);
  const [showCodeEditor, setShowCodeEditor] = useState<boolean>(false);
  const [showSerialMonitor, setShowSerialMonitor] = useState<boolean>(false);
  const [verticalSplit, setVerticalSplit] = useState<boolean>(true);
  
  useEffect(() => {
    if (projectId) {
      const mockProjectNames: Record<string, string> = {
        "1": "LED Blink Circuit",
        "2": "Temperature Sensor",
      };
      
      if (projectId in mockProjectNames) {
        setCircuitName(mockProjectNames[projectId]);
      }
    }
  }, [projectId]);

  useEffect(() => {
    document.title = `${circuitName} - CircuitSim Editor`;
    return () => {
      document.title = 'CircuitSim - Interactive Circuit Simulator';
    };
  }, [circuitName]);

  const handleSaveCircuit = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      setIsModified(false);
      saveProject();
    }, 800);
  };

  const handleSimulate = () => {
    setShowSerialMonitor(true);
    toggleSimulation();
  };

  const handleClearCircuit = () => {
    toast.warning('Clear circuit?', {
      description: 'This will remove all components and wires from the canvas',
      action: {
        label: 'Clear',
        onClick: () => {
          handleComponentsChange([]);
          handleWiresChange([]);
          toast.success('Circuit cleared');
        },
      },
    });
  };

  const handleBackToDashboard = () => {
    if (isModified) {
      toast.warning('Unsaved changes', {
        description: 'You have unsaved changes. Save before leaving?',
        action: {
          label: 'Save & Exit',
          onClick: () => {
            setIsSaving(true);
            setTimeout(() => {
              setIsSaving(false);
              navigate('/dashboard');
            }, 800);
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
    handleComponentsChange([...components, component]);
    selectComponent(component);
  };

  const handleRotateSelectedComponent = useCallback(() => {
    if (selectedComponent) {
      rotateComponent(selectedComponent.id);
    }
  }, [selectedComponent, rotateComponent]);

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
          <div className="w-64 border-r bg-gray-50 p-4 overflow-y-auto">
            <ComponentPanel onComponentSelect={handleComponentSelect} />
          </div>

          <div className="flex-1 flex flex-col overflow-hidden">
            {(showCodeEditor || showSerialMonitor) ? (
              <div className={`flex-1 flex ${verticalSplit ? 'flex-row' : 'flex-col'} overflow-hidden`}>
                <div className={`${verticalSplit ? 
                  (showCodeEditor && showSerialMonitor ? 'w-1/2' : 'w-2/3') : 
                  (showCodeEditor && showSerialMonitor ? 'h-1/2' : 'h-2/3')
                } overflow-hidden`}>
                  <CircuitCanvas 
                    circuitComponents={components} 
                    wireConnections={wires}
                    onComponentsChange={handleComponentsChange}
                    onWiresChange={handleWiresChange}
                  />
                </div>
                
                <div className={`${verticalSplit ? 
                  (showCodeEditor && showSerialMonitor ? 'w-1/2' : 'w-1/3') : 
                  (showCodeEditor && showSerialMonitor ? 'h-1/2' : 'h-1/3')
                } border-l overflow-hidden flex ${verticalSplit ? 'flex-col' : 'flex-row'}`}>
                  {showCodeEditor && showSerialMonitor ? (
                    <>
                      <div className={`${verticalSplit ? 'h-1/2' : 'w-1/2'} overflow-hidden`}>
                        <CodeEditor 
                          code={code} 
                          onCodeChange={handleCodeChange} 
                          onCompile={handleCompileCode} 
                        />
                      </div>
                      <div className={`${verticalSplit ? 'h-1/2 border-t' : 'w-1/2 border-l'} overflow-hidden`}>
                        <SerialMonitor 
                          isSimulationRunning={isSimulationRunning} 
                          serialOutput={serialOutput} 
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      {showCodeEditor && (
                        <div className="flex-1 overflow-hidden">
                          <CodeEditor 
                            code={code} 
                            onCodeChange={handleCodeChange} 
                            onCompile={handleCompileCode} 
                          />
                        </div>
                      )}
                      {showSerialMonitor && (
                        <div className="flex-1 overflow-hidden">
                          <SerialMonitor 
                            isSimulationRunning={isSimulationRunning} 
                            serialOutput={serialOutput} 
                          />
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-hidden">
                <CircuitCanvas 
                  circuitComponents={components} 
                  wireConnections={wires}
                  onComponentsChange={handleComponentsChange}
                  onWiresChange={handleWiresChange}
                />
              </div>
            )}
          </div>
        </div>
      </ReactFlowProvider>
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
