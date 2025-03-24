
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { 
  isWokwiLoaded, 
  forceLoadWokwiElements, 
  WokwiComponent, 
  renderWokwiElement,
  getComponentPinInfo,
  WokwiPin
} from '@/integrations/wokwi/WokwiIntegration';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { ZoomIn, ZoomOut, Move } from 'lucide-react';
import { useComponentLibrary } from '@/hooks/useComponentLibrary';

interface CircuitCanvasProps {
  components: WokwiComponent[];
  onComponentsChange: (components: WokwiComponent[]) => void;
}

// Helper for caching pin data outside of component rendering
const pinCache: Record<string, WokwiPin[]> = {};

const CircuitCanvas = ({ components, onComponentsChange }: CircuitCanvasProps) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isReady, setIsReady] = useState(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [loadingAttempts, setLoadingAttempts] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPanPoint, setStartPanPoint] = useState({ x: 0, y: 0 });
  const [panMode, setPanMode] = useState(false);
  const [hoveredComponent, setHoveredComponent] = useState<string | null>(null);
  const [hoveredPins, setHoveredPins] = useState<WokwiPin[]>([]);
  const [visiblePins, setVisiblePins] = useState<{[componentId: string]: boolean}>({});
  const [hoveredPin, setHoveredPin] = useState<{componentId: string, pinIndex: number} | null>(null);
  const [renderedComponents, setRenderedComponents] = useState<Record<string, boolean>>({});
  
  // Fetch all component details from the library
  const { 
    components: libraryComponents, 
    componentsDetailsMap, 
    isLoadingComponents, 
    isLoadingDetails 
  } = useComponentLibrary();
  
  // Pre-populate the pin cache with pin data from Supabase
  useEffect(() => {
    if (libraryComponents && componentsDetailsMap && Object.keys(componentsDetailsMap).length > 0) {
      console.log('Loading pin data from componentsDetailsMap:', Object.keys(componentsDetailsMap).length);
      
      libraryComponents.forEach(component => {
        if (component.id && componentsDetailsMap[component.id]) {
          const details = componentsDetailsMap[component.id];
          if (details && details.pins && details.pins.length > 0) {
            console.log(`Found pins for ${component.name} (${component.type}) from details:`, details.pins);
            pinCache[component.type] = details.pins.map((pin: any) => ({
              name: pin.name,
              x: Number(pin.x),
              y: Number(pin.y),
              signals: pin.signals || []
            }));
          }
        }
      });
      
      console.log('Pin cache after loading from details:', pinCache);
    } else if (libraryComponents && libraryComponents.length > 0) {
      console.log('Loading pin data from library components:', libraryComponents.length);
      
      libraryComponents.forEach(component => {
        if (component.pins && component.pins.length > 0) {
          console.log(`Found pins for ${component.name} (${component.type}):`, component.pins);
          pinCache[component.type] = component.pins.map(pin => ({
            name: pin.name,
            x: Number(pin.x),
            y: Number(pin.y),
            signals: pin.signals || []
          }));
        }
      });
      
      console.log('Pin cache after loading:', pinCache);
    }
  }, [libraryComponents, componentsDetailsMap]);

  const checkWokwiLoaded = useCallback(async () => {
    console.log('Checking if Wokwi is loaded, attempt:', loadingAttempts + 1);
    
    if (isWokwiLoaded()) {
      console.log('Wokwi components loaded successfully');
      setIsReady(true);
      return true;
    }
    
    if (loadingAttempts >= 2) {
      console.log('Attempting to manually load Wokwi components...');
      
      try {
        const success = await forceLoadWokwiElements();
        if (success) {
          console.log('Manual loading of Wokwi components succeeded');
          setIsReady(true);
          return true;
        } else {
          console.log('Manual loading of Wokwi components failed');
        }
      } catch (err) {
        console.error('Error during manual loading:', err);
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

  useEffect(() => {
    const attemptLoading = async () => {
      const success = await checkWokwiLoaded();
      
      if (!success) {
        const timer = setTimeout(attemptLoading, 1000);
        return () => clearTimeout(timer);
      }
    };
    
    attemptLoading();
  }, [checkWokwiLoaded]);

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

  // Get component pin information safely without using hooks
  const fetchComponentPins = (type: string): WokwiPin[] => {
    try {
      // First check our cache from Supabase data
      if (pinCache[type]) {
        console.log(`Using cached pins for ${type}:`, pinCache[type]);
        return pinCache[type];
      }
      
      // Check if we have this component in our library with pins
      const libraryComponent = libraryComponents?.find(c => c.type === type);
      if (libraryComponent?.id && componentsDetailsMap && componentsDetailsMap[libraryComponent.id]) {
        const details = componentsDetailsMap[libraryComponent.id];
        if (details && details.pins && details.pins.length > 0) {
          console.log(`Found pins for ${type} in component details:`, details.pins);
          const pins = details.pins.map((pin: any) => ({
            name: pin.name,
            x: Number(pin.x),
            y: Number(pin.y),
            signals: pin.signals || []
          }));
          
          // Cache the result
          pinCache[type] = pins;
          return pins;
        }
      }
      
      if (libraryComponent?.pins && libraryComponent.pins.length > 0) {
        console.log(`Found pins for ${type} in library:`, libraryComponent.pins);
        const pins = libraryComponent.pins.map(pin => ({
          name: pin.name,
          x: Number(pin.x),
          y: Number(pin.y),
          signals: pin.signals || []
        }));
        
        // Cache the result
        pinCache[type] = pins;
        return pins;
      }
      
      // Fallback to default pin info from WokwiIntegration
      console.log(`Using default pins for ${type}`);
      const defaultPins = getComponentPinInfo(type);
      pinCache[type] = defaultPins;
      return defaultPins;
    } catch (err) {
      console.error(`Error in fetchComponentPins for ${type}:`, err);
      return getComponentPinInfo(type);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    
    try {
      const componentData = e.dataTransfer.getData('component');
      if (!componentData) return;
      
      const componentInfo = JSON.parse(componentData);
      
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      
      const x = (e.clientX - rect.left - position.x) / zoom;
      const y = (e.clientY - rect.top - position.y) / zoom;
      
      const gridSize = 25;
      const left = Math.floor(x / gridSize) * gridSize;
      const top = Math.floor(y / gridSize) * gridSize;
      
      // Find the component in the library to get pins and details
      const libraryComponent = libraryComponents?.find(c => c.type === componentInfo.type);
      
      // Check if we have detailed pin information from Supabase
      let pins;
      if (libraryComponent?.id && componentsDetailsMap && componentsDetailsMap[libraryComponent.id]) {
        const details = componentsDetailsMap[libraryComponent.id];
        if (details && details.pins && details.pins.length > 0) {
          console.log(`Using pins from details for ${componentInfo.type}:`, details.pins);
          pins = details.pins.map((pin: any) => ({
            name: pin.name,
            x: Number(pin.x), 
            y: Number(pin.y),
            signals: pin.signals || []
          }));
        }
      }
      
      // Fallback to component.pins if details are not available
      if (!pins && libraryComponent?.pins) {
        console.log(`Using pins from component for ${componentInfo.type}:`, libraryComponent.pins);
        pins = libraryComponent.pins.map(pin => ({
          name: pin.name,
          x: Number(pin.x),
          y: Number(pin.y),
          signals: pin.signals || []
        }));
      }
      
      // Last fallback to default pins
      if (!pins) {
        console.log(`Falling back to default pins for ${componentInfo.type}`);
        pins = fetchComponentPins(componentInfo.type);
      }
      
      const newComponent: WokwiComponent = {
        type: componentInfo.type,
        id: `comp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        top,
        left,
        attributes: { color: 'red' },
        pins
      };
      
      const updatedComponents = [...components, newComponent];
      onComponentsChange(updatedComponents);
      
      console.log('Component added:', newComponent);
      console.log('Total components after add:', updatedComponents.length);
      
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
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const togglePinVisibility = useCallback((componentId: string) => {
    setVisiblePins(prev => ({
      ...prev,
      [componentId]: !prev[componentId]
    }));
  }, []);

  const handlePinHover = (componentId: string, pinIndex: number) => {
    setHoveredPin({ componentId, pinIndex });
  };

  const handlePinHoverExit = () => {
    setHoveredPin(null);
  };

  const handleComponentHover = useCallback((id: string, type: string) => {
    setHoveredComponent(id);
    
    const pins = fetchComponentPins(type);
    setHoveredPins(pins);
    
    const element = document.getElementById(`wokwi-element-${id}`);
    if (element && element.firstChild) {
      (element.firstChild as HTMLElement).style.outline = '2px solid #4C72F4';
      (element.firstChild as HTMLElement).style.outlineOffset = '2px';
    }
  }, []);

  const handleComponentHoverExit = useCallback(() => {
    if (hoveredComponent) {
      const element = document.getElementById(`wokwi-element-${hoveredComponent}`);
      if (element && element.firstChild) {
        (element.firstChild as HTMLElement).style.outline = 'none';
      }
    }
    setHoveredComponent(null);
    setHoveredPins([]);
  }, [hoveredComponent]);

  // Effect to render wokwi elements when they're loaded and available
  useEffect(() => {
    if (!isReady) return;
    
    components.forEach(component => {
      const elementId = `wokwi-element-${component.id}`;
      const element = document.getElementById(elementId);
      
      // Only render if element exists and we haven't rendered it yet
      if (element && !renderedComponents[component.id]) {
        console.log(`Rendering component ${component.type} with id ${component.id}`);
        renderWokwiElement(component.type, elementId, component.attributes);
        setRenderedComponents(prev => ({
          ...prev,
          [component.id]: true
        }));
      }
    });
  }, [components, isReady, renderedComponents]);

  // Clear rendered component tracking when component is removed
  useEffect(() => {
    const componentIds = components.map(c => c.id);
    setRenderedComponents(prev => {
      const newState = { ...prev };
      Object.keys(newState).forEach(id => {
        if (!componentIds.includes(id)) {
          delete newState[id];
        }
      });
      return newState;
    });
  }, [components]);

  const handleRetry = async () => {
    setLoadingError(null);
    setLoadingAttempts(0);
    await checkWokwiLoaded();
  };

  const handleZoomIn = () => {
    setZoom(prevZoom => Math.min(prevZoom + 0.1, 3));
  };

  const handleZoomOut = () => {
    setZoom(prevZoom => Math.max(prevZoom - 0.1, 0.5));
  };

  const togglePanMode = () => {
    setPanMode(!panMode);
    if (panMode) {
      document.body.style.cursor = 'default';
    } else {
      document.body.style.cursor = 'move';
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (panMode || e.button === 1) {
      setIsPanning(true);
      setStartPanPoint({ x: e.clientX - position.x, y: e.clientY - position.y });
      e.preventDefault();
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      const newX = e.clientX - startPanPoint.x;
      const newY = e.clientY - startPanPoint.y;
      setPosition({ x: newX, y: newY });
      e.preventDefault();
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleMouseLeave = () => {
    setIsPanning(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom(prevZoom => {
      const newZoom = Math.max(0.5, Math.min(3, prevZoom + delta));
      return newZoom;
    });
  };

  // Render a single component with its pin information
  const renderComponent = (component: WokwiComponent) => {
    const { type, id, top, left, attributes } = component;
    
    // Use component's pins if available, otherwise fetch them
    const pins = component.pins || fetchComponentPins(type);
    const showPins = visiblePins[id] || hoveredComponent === id;
    
    return (
      <div 
        key={id}
        className="absolute"
        style={{ top: `${top}px`, left: `${left}px` }}
        onMouseEnter={() => handleComponentHover(id, type)}
        onMouseLeave={handleComponentHoverExit}
        onDoubleClick={() => togglePinVisibility(id)}
      >
        <div id={`wokwi-element-${id}`}></div>
        
        {showPins && pins && pins.length > 0 && (
          <div className="absolute top-0 left-0 z-10 pointer-events-none">
            {pins.map((pin, index) => (
              <div 
                key={`pin-${id}-${index}`}
                className="absolute pin-marker pointer-events-auto"
                style={{ 
                  left: `${pin.x}px`, 
                  top: `${pin.y}px`,
                  backgroundColor: getSignalColor(pin.signals && pin.signals.length > 0 ? pin.signals[0] : 'digital')
                }}
                onMouseEnter={() => handlePinHover(id, index)}
                onMouseLeave={handlePinHoverExit}
              ></div>
            ))}
          </div>
        )}
        
        {hoveredPin && hoveredPin.componentId === id && pins && pins[hoveredPin.pinIndex] && (
          <div 
            className="absolute z-20 bg-black text-white text-xs px-1 py-0.5 rounded-sm opacity-80"
            style={{ 
              top: `${pins[hoveredPin.pinIndex].y}px`, 
              left: `${pins[hoveredPin.pinIndex].x}px`, 
              transform: 'translate(-50%, -100%)',
              marginTop: '-5px'
            }}
          >
            {pins[hoveredPin.pinIndex].name}
            {pins[hoveredPin.pinIndex].signals && pins[hoveredPin.pinIndex].signals.length > 0 && (
              <span className="text-xs opacity-70 ml-1">
                ({pins[hoveredPin.pinIndex].signals.join(', ')})
              </span>
            )}
          </div>
        )}
      </div>
    );
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const togglePinVisibility = useCallback((componentId: string) => {
    setVisiblePins(prev => ({
      ...prev,
      [componentId]: !prev[componentId]
    }));
  }, []);

  const handlePinHover = (componentId: string, pinIndex: number) => {
    setHoveredPin({ componentId, pinIndex });
  };

  const handlePinHoverExit = () => {
    setHoveredPin(null);
  };

  const handleComponentHover = useCallback((id: string, type: string) => {
    setHoveredComponent(id);
    
    const pins = fetchComponentPins(type);
    setHoveredPins(pins);
    
    const element = document.getElementById(`wokwi-element-${id}`);
    if (element && element.firstChild) {
      (element.firstChild as HTMLElement).style.outline = '2px solid #4C72F4';
      (element.firstChild as HTMLElement).style.outlineOffset = '2px';
    }
  }, []);

  const handleComponentHoverExit = useCallback(() => {
    if (hoveredComponent) {
      const element = document.getElementById(`wokwi-element-${hoveredComponent}`);
      if (element && element.firstChild) {
        (element.firstChild as HTMLElement).style.outline = 'none';
      }
    }
    setHoveredComponent(null);
    setHoveredPins([]);
  }, [hoveredComponent]);

  const handleRetry = async () => {
    setLoadingError(null);
    setLoadingAttempts(0);
    await checkWokwiLoaded();
  };

  const handleZoomIn = () => {
    setZoom(prevZoom => Math.min(prevZoom + 0.1, 3));
  };

  const handleZoomOut = () => {
    setZoom(prevZoom => Math.max(prevZoom - 0.1, 0.5));
  };

  const togglePanMode = () => {
    setPanMode(!panMode);
    if (panMode) {
      document.body.style.cursor = 'default';
    } else {
      document.body.style.cursor = 'move';
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (panMode || e.button === 1) {
      setIsPanning(true);
      setStartPanPoint({ x: e.clientX - position.x, y: e.clientY - position.y });
      e.preventDefault();
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      const newX = e.clientX - startPanPoint.x;
      const newY = e.clientY - startPanPoint.y;
      setPosition({ x: newX, y: newY });
      e.preventDefault();
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleMouseLeave = () => {
    setIsPanning(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom(prevZoom => {
      const newZoom = Math.max(0.5, Math.min(3, prevZoom + delta));
      return newZoom;
    });
  };

  return (
    <div className="h-full w-full bg-white relative flex flex-col">
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

      <div className="absolute top-2 right-2 bg-white rounded-md shadow-md p-1 z-20 flex gap-1">
        <button
          onClick={handleZoomIn}
          className="p-1 hover:bg-gray-100 rounded"
          title="Zoom In (or use Ctrl+Scroll)"
        >
          <ZoomIn size={18} />
        </button>
        <button
          onClick={handleZoomOut}
          className="p-1 hover:bg-gray-100 rounded"
          title="Zoom Out (or use Ctrl+Scroll)"
        >
          <ZoomOut size={18} />
        </button>
        <button
          onClick={togglePanMode}
          className={`p-1 hover:bg-gray-100 rounded ${panMode ? 'bg-gray-200' : ''}`}
          title="Pan Mode (or use middle mouse button)"
        >
          <Move size={18} />
        </button>
        <div className="px-2 flex items-center text-xs text-gray-600">
          {Math.round(zoom * 100)}%
        </div>
      </div>
      
      <div 
        ref={containerRef}
        className="h-full w-full overflow-hidden"
        onWheel={handleWheel}
      >
        <div 
          ref={canvasRef} 
          className="h-full w-full grid grid-cols-[repeat(40,25px)] grid-rows-[repeat(30,25px)] bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjUiIGhlaWdodD0iMjUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSIyNSIgaGVpZ2h0PSIyNSIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDAgTCAyNSAwIE0gMCAwIEwgMCAyNSIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZTJlOGYwIiBzdHJva2Utd2lkdGg9IjEiPjwvcGF0aD48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiPjwvcmVjdD48L3N2Zz4=')]"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          style={{
            transform: `scale(${zoom}) translate(${position.x / zoom}px, ${position.y / zoom}px)`,
            transformOrigin: '0 0',
            transition: isPanning ? 'none' : 'transform 0.1s ease-out'
          }}
        >
          {components.map(component => renderComponent(component))}
        </div>
      </div>
    </div>
  );
};

function getSignalColor(signal: string): string {
  const colors: Record<string, string> = {
    'power': '#FF6384',    // Red
    'ground': '#36A2EB',   // Blue
    'digital': '#4BC0C0',  // Teal
    'analog': '#FFCE56',   // Yellow
    'passive': '#9966FF',  // Purple
    'i2c': '#FF9F40',      // Orange
    'spi': '#C9CBCF',      // Gray
    'uart': '#7CFC00',     // Lime
    'rx': '#FF00FF',       // Magenta
    'tx': '#00FFFF',       // Cyan
  };
  
  return colors[signal] || '#4BC0C0';
}

export default CircuitCanvas;
