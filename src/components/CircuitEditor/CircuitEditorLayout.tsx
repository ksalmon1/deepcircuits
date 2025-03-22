
import React, { useState, useEffect } from 'react';
import CircuitCanvas from './CircuitCanvas';
import ComponentPanel from './ComponentPanel';
import { Button } from '@/components/ui/button';
import { Play, Save, Undo, Redo, Trash2, ArrowLeft } from 'lucide-react';
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
    toast.info('Starting simulation...', {
      description: 'Simulation feature will be available in the next update',
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

  // Mock function to simulate circuit changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsModified(true);
    }, 5000);
    
    return () => clearTimeout(timer);
  }, []);

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

        {/* Main canvas area */}
        <div className="flex-1 overflow-hidden">
          <CircuitCanvas />
        </div>
      </div>
    </div>
  );
};

export default CircuitEditorLayout;
