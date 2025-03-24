
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { 
  isWokwiLoaded, 
  forceLoadWokwiElements, 
  WokwiComponent, 
  renderWokwiElement 
} from '@/integrations/wokwi/WokwiIntegration';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Trash2, Edit, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import DynamicPropertyEditor from './DynamicPropertyEditor';

const CircuitCanvas = () => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isReady, setIsReady] = useState(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [loadingAttempts, setLoadingAttempts] = useState(0);
  const [components, setComponents] = useState<WokwiComponent[]>([]);
  const [selectedComponent, setSelectedComponent] = useState<WokwiComponent | null>(null);
  const [isEditingComponent, setIsEditingComponent] = useState(false);
  const [editedProperties, setEditedProperties] = useState<Record<string, any>>({});

  // Function to check if Wokwi is loaded
  const checkWokwiLoaded = useCallback(async () => {
    console.log('Checking if Wokwi is loaded, attempt:', loadingAttempts + 1);
    
    if (isWokwiLoaded()) {
      console.log('Wokwi components loaded successfully');
      setIsReady(true);
      return true;
    }
    
    // After a few attempts, try to force load
    if (loadingAttempts >= 2) {
      console.log('Attempting to check Wokwi components again...');
      
      try {
        const success = await forceLoadWokwiElements();
        if (success) {
          console.log('Wokwi components are now available');
          setIsReady(true);
          return true;
        } else {
          console.log('Wokwi components still not available');
        }
      } catch (err) {
        console.error('Error during loading check:', err);
      }
    }
    
    if (loadingAttempts > 5) {
      console.error('Failed to load Wokwi components after multiple attempts');
      setLoadingError('Failed to load circuit components. Please refresh the page or check your internet connection.');
      toast.error('Circuit components failed to load', {
        description: 'Please refresh the page or check your internet connection.',
        duration: 5000,
      });
      return false;
    }
    
    setLoadingAttempts(prev => prev + 1);
    return false;
  }, [loadingAttempts]);

  // Initial load checking
  useEffect(() => {
    const attemptLoading = async () => {
      const success = await checkWokwiLoaded();
      
      if (!success) {
        // Schedule the next check
        const timer = setTimeout(attemptLoading, 1000);
        return () => clearTimeout(timer);
      }
    };
    
    attemptLoading();
  }, [checkWokwiLoaded]);

  // Fallback timeout to show UI even if components aren't fully loaded
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isReady && !loadingError) {
        console.log('Fallback: Forcing canvas to load after timeout');
        toast.warning('Loading components in fallback mode', {
          description: 'Some features may be limited.',
        });
        setIsReady(true);
      }
    }, 6000);

    return () => clearTimeout(timer);
  }, [isReady, loadingError]);

  // Handle drop event for components
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    
    try {
      // Get the component data from the drag event
      const componentData = e.dataTransfer.getData('component');
      if (!componentData) return;
      
      const componentInfo = JSON.parse(componentData);
      
      // Calculate position relative to the grid
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      
      // Get the drop position
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      // Snap to grid (25px grid size)
      const gridSize = 25;
      const left = Math.floor(x / gridSize) * gridSize;
      const top = Math.floor(y / gridSize) * gridSize;
      
      // Create a new component with proper positioning
      const newComponent: WokwiComponent = {
        type: componentInfo.type,
        id: `comp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        top,
        left,
        attributes: componentInfo.defaultAttributes || { color: 'red' }, // Use default attributes if provided
      };
      
      // Add the new component to the canvas
      setComponents(prevComponents => [...prevComponents, newComponent]);
      
      toast.success(`Added ${componentInfo.name}`, {
        description: `Component placed at position (${left}, ${top})`,
        duration: 2000,
      });
    } catch (error) {
      console.error('Error adding component:', error);
      toast.error('Failed to add component');
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); // Allow drop
    e.dataTransfer.dropEffect = 'copy';
  };

  // Handle component selection
  const handleComponentClick = (e: React.MouseEvent, component: WokwiComponent) => {
    e.stopPropagation(); // Prevent canvas click
    setSelectedComponent(component);
    setEditedProperties(component.attributes || {});
  };

  // Handle canvas click (deselect components)
  const handleCanvasClick = () => {
    setSelectedComponent(null);
  };

  // Handle component edit
  const handleEditComponent = () => {
    if (selectedComponent) {
      setIsEditingComponent(true);
    }
  };

  // Handle component property change
  const handlePropertyChange = (properties: Record<string, any>) => {
    setEditedProperties(properties);
  };

  // Save edited properties
  const handleSaveProperties = () => {
    if (selectedComponent) {
      // Update the component with new properties
      const updatedComponents = components.map(comp => 
        comp.id === selectedComponent.id 
          ? { ...comp, attributes: editedProperties }
          : comp
      );
      
      setComponents(updatedComponents);
      
      // Update the selected component reference
      setSelectedComponent({ ...selectedComponent, attributes: editedProperties });
      
      // Close the edit dialog
      setIsEditingComponent(false);
      
      // Re-render the updated component
      const componentElement = document.getElementById(`wokwi-element-${selectedComponent.id}`);
      if (componentElement && componentElement.parentElement) {
        componentElement.innerHTML = '';
        renderWokwiElement(selectedComponent.type, `wokwi-element-${selectedComponent.id}`, editedProperties);
      }
      
      toast.success('Component updated', {
        description: 'Component properties have been updated',
        duration: 2000,
      });
    }
  };

  // Handle component deletion
  const handleDeleteComponent = () => {
    if (selectedComponent) {
      setComponents(components.filter(comp => comp.id !== selectedComponent.id));
      setSelectedComponent(null);
      
      toast.success('Component removed', {
        description: 'Component has been removed from the circuit',
        duration: 2000,
      });
    }
  };

  // Render a component on the canvas
  const renderComponent = useCallback((component: WokwiComponent) => {
    const { type, id, top, left, attributes } = component;
    const isSelected = selectedComponent?.id === id;
    
    return (
      <div 
        key={id}
        className={`absolute transition-all duration-200 ${isSelected ? 'ring-2 ring-primary ring-offset-2' : ''}`}
        style={{ 
          top: `${top}px`, 
          left: `${left}px`,
          cursor: 'pointer',
          padding: '2px',
          borderRadius: '4px',
          backgroundColor: isSelected ? 'rgba(236, 239, 244, 0.3)' : 'transparent'
        }}
        onClick={(e) => handleComponentClick(e, component)}
      >
        <div id={`wokwi-element-${id}`}></div>
      </div>
    );
  }, [selectedComponent]);

  // Effect to render Wokwi elements after components state changes
  useEffect(() => {
    if (!isReady) return;
    
    // Render each component
    components.forEach(component => {
      const elementId = `wokwi-element-${component.id}`;
      renderWokwiElement(component.type, elementId, component.attributes);
    });
  }, [components, isReady]);

  const handleRetry = async () => {
    setLoadingError(null);
    setLoadingAttempts(0);
    await checkWokwiLoaded();
  };

  return (
    <div className="h-full w-full bg-white relative">
      {!isReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 bg-opacity-80 z-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-gray-600">Loading circuit components...</p>
            {loadingError && (
              <div className="mt-4 text-red-500 max-w-md">
                {loadingError}
                <button 
                  onClick={handleRetry}
                  className="ml-2 text-blue-500 underline"
                >
                  Retry
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      
      <div 
        ref={canvasRef} 
        className="h-full w-full grid grid-cols-[repeat(40,25px)] grid-rows-[repeat(30,25px)] bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjUiIGhlaWdodD0iMjUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSIyNSIgaGVpZ2h0PSIyNSIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDAgTCAyNSAwIE0gMCAwIEwgMCAyNSIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZTJlOGYwIiBzdHJva2Utd2lkdGg9IjEiPjwvcGF0aD48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiPjwvcmVjdD48L3N2Zz4=')]"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={handleCanvasClick}
      >
        {/* Render all placed components */}
        {components.map(renderComponent)}
        
        {/* Component actions toolbar - appears when a component is selected */}
        {selectedComponent && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white shadow-md rounded-md p-2 flex gap-2 z-10">
            <Button
              variant="outline"
              size="sm"
              onClick={handleEditComponent}
              className="flex items-center gap-1"
            >
              <Edit className="h-4 w-4" />
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDeleteComponent}
              className="flex items-center gap-1 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </div>
        )}
      </div>
      
      {/* Component Edit Dialog */}
      <Dialog open={isEditingComponent} onOpenChange={setIsEditingComponent}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Component</DialogTitle>
            <DialogDescription>
              {selectedComponent ? `Customize the ${selectedComponent.type} properties` : 'Edit component properties'}
            </DialogDescription>
          </DialogHeader>
          
          {selectedComponent && (
            <DynamicPropertyEditor
              properties={editedProperties}
              componentType={selectedComponent.type}
              onChange={handlePropertyChange}
            />
          )}
          
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsEditingComponent(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveProperties} className="ml-2">
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CircuitCanvas;
