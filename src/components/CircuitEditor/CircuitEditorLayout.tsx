
import React, { useState, useEffect } from 'react';
import CircuitCanvas from './CircuitCanvas';
import ComponentPanel from './ComponentPanel';
import CodeEditor from './CodeEditor';
import SerialMonitor from './SerialMonitor';
import { Button } from '@/components/ui/button';
import { 
  Play, Save, Undo, Redo, Trash2, ArrowLeft, 
  Code, MonitorUp, SplitSquareVertical, SplitSquareHorizontal 
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate, useLocation } from 'react-router-dom';

export const CircuitEditorLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const projectId = searchParams.get('id');
  
  const [circuitName, setCircuitName] = useState<string>('Untitled Circuit');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isModified, setIsModified] = useState<boolean>(false);
  const [showCodeEditor, setShowCodeEditor] = useState<boolean>(false);
  const [showSerialMonitor, setShowSerialMonitor] = useState<boolean>(false);
  const [verticalSplit, setVerticalSplit] = useState<boolean>(true);
  // Add a key for CircuitCanvas to prevent re-mounting
  const [canvasKey] = useState<string>(`canvas-${Date.now()}`);

  // Load project data based on ID (mock implementation)
  useEffect(() => {
    if (projectId) {
      // In a real app, this would fetch project data from the backend
      // For now, we'll use mock data
      const mockProjectNames: Record<string, string> = {
        "1": "LED Blink Circuit",
        "2": "Temperature Sensor",
      };
      
      if (projectId in mockProjectNames) {
        setCircuitName(mockProjectNames[projectId]);
      }
    }
  }, [projectId]);

  // Set the document title
  useEffect(() => {
    document.title = `${circuitName} - CircuitSim Editor`;
    return () => {
      document.title = 'CircuitSim - Interactive Circuit Simulator';
    };
  }, [circuitName]);

  const handleSaveCircuit = () => {
    setIsSaving(true);
    // Simulate a save operation
    setTimeout(() => {
      setIsSaving(false);
      setIsModified(false);
      toast.success('Circuit saved successfully', {
        description: `${circuitName} has been saved`,
      });
    }, 800);
  };

  const handleSimulate = () => {
    setShowSerialMonitor(true);
    toast.info('Starting simulation...', {
      description: 'Simulation started. Check the serial monitor for output.',
    });
  };

  const handleClearCircuit = () => {
    toast.warning('Clear circuit?', {
      description: 'This will remove all components from the canvas',
      action: {
        label: 'Clear',
        onClick: () => {
          // We'll implement this in a future step
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

  const handleCompileCode = async (code: string) => {
    console.log('Compiling code:', code);
    // In a real app, this would send the code to a backend API
    // For now, we'll just show a toast message
    await new Promise(resolve => setTimeout(resolve, 1000));
    toast.success('Code compiled and uploaded to simulated microcontroller');
  };

  // Mock function to simulate circuit changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsModified(true);
    }, 5000);
    
    return () => clearTimeout(timer);
  }, []);

  // Toggle layout orientation
  const toggleOrientation = () => {
    setVerticalSplit(!verticalSplit);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Top toolbar */}
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
          <Button variant="outline" size="sm" onClick={handleClearCircuit}>
            <Trash2 className="mr-1 h-4 w-4" />
            Clear
          </Button>
          <Button variant="outline" size="sm">
            <Undo className="mr-1 h-4 w-4" />
            Undo
          </Button>
          <Button variant="outline" size="sm">
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

      {/* Main content area */}
      <div className="flex-1 flex">
        {/* Left panel - Component palette */}
        <div className="w-64 border-r bg-gray-50 p-4 overflow-y-auto">
          <ComponentPanel />
        </div>

        {/* Main area with circuit canvas and optional editors */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Main content with dynamic layout based on which editors are open */}
          {(showCodeEditor || showSerialMonitor) ? (
            <div className={`flex-1 flex ${verticalSplit ? 'flex-row' : 'flex-col'} overflow-hidden`}>
              {/* Circuit canvas - always shown but with dynamic size */}
              <div className={`${verticalSplit ? 
                (showCodeEditor && showSerialMonitor ? 'w-1/2' : 'w-2/3') : 
                (showCodeEditor && showSerialMonitor ? 'h-1/2' : 'h-2/3')
              } overflow-hidden`}>
                <CircuitCanvas key={canvasKey} />
              </div>
              
              {/* Right/bottom panel with code editor and/or serial monitor */}
              <div className={`${verticalSplit ? 
                (showCodeEditor && showSerialMonitor ? 'w-1/2' : 'w-1/3') : 
                (showCodeEditor && showSerialMonitor ? 'h-1/2' : 'h-1/3')
              } border-l overflow-hidden flex ${verticalSplit ? 'flex-col' : 'flex-row'}`}>
                {showCodeEditor && showSerialMonitor ? (
                  <>
                    <div className={`${verticalSplit ? 'h-1/2' : 'w-1/2'} overflow-hidden`}>
                      <CodeEditor projectId={projectId || undefined} onCompile={handleCompileCode} />
                    </div>
                    <div className={`${verticalSplit ? 'h-1/2 border-t' : 'w-1/2 border-l'} overflow-hidden`}>
                      <SerialMonitor projectId={projectId || undefined} />
                    </div>
                  </>
                ) : (
                  <>
                    {showCodeEditor && (
                      <div className="flex-1 overflow-hidden">
                        <CodeEditor projectId={projectId || undefined} onCompile={handleCompileCode} />
                      </div>
                    )}
                    {showSerialMonitor && (
                      <div className="flex-1 overflow-hidden">
                        <SerialMonitor projectId={projectId || undefined} />
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ) : (
            // If no editors are open, show only the circuit canvas
            <div className="flex-1 overflow-hidden">
              <CircuitCanvas key={canvasKey} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CircuitEditorLayout;
