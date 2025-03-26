
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { 
  isWokwiLoaded, 
  forceLoadWokwiElements, 
  WokwiComponent, 
  getComponentPinInfo,
  WokwiPin
} from '@/integrations/wokwi/WokwiIntegration';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { ZoomIn, ZoomOut, Move } from 'lucide-react';
import { useComponentLibrary } from '@/hooks/useComponentLibrary';
import { useCanvasNavigation } from '@/hooks/useCanvasNavigation';
import { useWireSystem } from '@/hooks/useWireSystem';
import ModularWireRenderer from './WireComponents/ModularWireRenderer';
import { isInteractingWithPin } from '@/utils/wireUtils';
import CircuitGrid from './CircuitGrid';
import ComponentLayer from './ComponentLayer';

interface CircuitCanvasProps {
  components: WokwiComponent[];
  onComponentsChange: (components: WokwiComponent[]) => void;
}

const pinCache: Record<string, WokwiPin[]> = {};

const CircuitCanvas = ({ components, onComponentsChange }: CircuitCanvasProps) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [isReady, setIsReady] = useState(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [loadingAttempts, setLoadingAttempts] = useState(0);
  
  // Navigation and Zoom hooks
  const {
    zoom,
    offset,
    panMode,
    isDraggingCanvas,
    handleZoomIn,
    handleZoomOut,
    togglePanMode,
    startPan,
    pan,
    endPan,
    handleWheel,
    updateCanvasDimensions,
    screenToCanvasCoordinates
  } = useCanvasNavigation(1);
  
  // Wire system hook
  const {
    wires,
    activeWire,
    handlePinClick,
    handleCanvasClick,
    handleMouseMove,
    handleStageMouseUp,
    handleKonvaClick,
    cancelActiveWire,
    potentialTarget,
    potentialTargetRef
  } = useWireSystem(components);
  
  // Component state
  const [hoveredComponent, setHoveredComponent] = useState<string | null>(null);
  const [hoveredPins, setHoveredPins] = useState<WokwiPin[]>([]);
  const [visiblePins, setVisiblePins] = useState<{[componentId: string]: boolean}>({});
  const [hoveredPin, setHoveredPin] = useState<{componentId: string, pinIndex: number} | null>(null);
  const [renderedComponents, setRenderedComponents] = useState<Record<string, boolean>>({});
  
  const [draggingComponent, setDraggingComponent] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  // Component library
  const { 
    components: libraryComponents, 
    componentsDetailsMap, 
    isLoadingComponents, 
    isLoadingDetails 
  } = useComponentLibrary();

  // Update canvas size on window resize
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setCanvasSize({ width, height });
        updateCanvasDimensions(width, height);
      }
    };
    
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [updateCanvasDimensions]);
  
  // Load pin data
  useEffect(() => {
    populatePinCache();
  }, [libraryComponents, componentsDetailsMap]);

  const populatePinCache = useCallback(() => {
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
    }
  }, [libraryComponents, componentsDetailsMap]);

  // Check if Wokwi is loaded
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

  // Fallback loading mechanism
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

  // Cancel active wire on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activeWire) {
        cancelActiveWire();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeWire, cancelActiveWire]);

  // Fetch component pins
  const fetchComponentPins = useCallback((type: string): WokwiPin[] => {
    try {
      if (pinCache[type]) {
        return pinCache[type];
      }
      
      const libraryComponent = libraryComponents?.find(c => c.type === type);
      if (libraryComponent?.id && componentsDetailsMap && componentsDetailsMap[libraryComponent.id]) {
        const details = componentsDetailsMap[libraryComponent.id];
        if (details && details.pins && details.pins.length > 0) {
          const pins = details.pins.map((pin: any) => ({
            name: pin.name,
            x: Number(pin.x),
            y: Number(pin.y),
            signals: pin.signals || []
          }));
          
          pinCache[type] = pins;
          return pins;
        }
      }
      
      if (libraryComponent?.pins && libraryComponent.pins.length > 0) {
        const pins = libraryComponent.pins.map(pin => ({
          name: pin.name,
          x: Number(pin.x),
          y: Number(pin.y),
          signals: pin.signals || []
        }));
        
        pinCache[type] = pins;
        return pins;
      }
      
      const defaultPins = getComponentPinInfo(type);
      pinCache[type] = defaultPins;
      return defaultPins;
    } catch (err) {
      console.error(`Error in fetchComponentPins for ${type}:`, err);
      return getComponentPinInfo(type);
    }
  }, [libraryComponents, componentsDetailsMap]);

  // Handle component drop
  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    
    try {
      const componentData = e.dataTransfer.getData('component');
      if (!componentData) return;
      
      const componentInfo = JSON.parse(componentData);
      
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      
      const x = (e.clientX - rect.left - offset.x) / zoom;
      const y = (e.clientY - rect.top - offset.y) / zoom;
      
      const gridSize = 25;
      const left = Math.floor(x / gridSize) * gridSize;
      const top = Math.floor(y / gridSize) * gridSize;
      
      const pins = fetchComponentPins(componentInfo.type);
      
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
      
      toast.success(`Added ${componentInfo.name}`, {
        description: `Component placed at position (${left}, ${top})`,
        duration: 2000,
      });
    } catch (error) {
      console.error('Error adding component:', error);
      toast.error('Failed to add component');
    }
  }, [components, onComponentsChange, zoom, offset, fetchComponentPins]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  // Pin visibility and interaction
  const togglePinVisibility = useCallback((componentId: string) => {
    setVisiblePins(prev => ({
      ...prev,
      [componentId]: !prev[componentId]
    }));
  }, []);

  const handlePinHover = useCallback((componentId: string, pinIndex: number) => {
    setHoveredPin({ componentId, pinIndex });
  }, []);

  const handlePinHoverExit = useCallback(() => {
    setHoveredPin(null);
  }, []);

  // Component mouse events
  const handleComponentMouseDown = useCallback((e: React.MouseEvent, componentId: string) => {
    if (panMode || e.button !== 0) {
      return;
    }
    
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (!canvasRect) return;
    
    const component = components.find(c => c.id === componentId);
    if (!component) return;
    
    const mouseX = (e.clientX - canvasRect.left - offset.x) / zoom;
    const mouseY = (e.clientY - canvasRect.top - offset.y) / zoom;
    
    const { isPin, pinIndex } = isInteractingWithPin(mouseX, mouseY, component);
    
    if (isPin) {
      e.stopPropagation();
      const pin = component.pins?.[pinIndex];
      if (pin) {
        const pinPos = {
          x: component.left + pin.x,
          y: component.top + pin.y
        };
        handlePinClick(componentId, pinIndex, pinPos.x, pinPos.y);
      }
      return;
    }
    
    e.stopPropagation();
    
    const componentElement = document.getElementById(`wokwi-element-wrapper-${componentId}`);
    if (!componentElement) return;
    
    const rect = componentElement.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    
    setDraggingComponent(componentId);
    setDragOffset({ x: offsetX, y: offsetY });
    
    componentElement.style.cursor = 'grabbing';
    componentElement.style.zIndex = '100';
    componentElement.style.opacity = '0.8';
  }, [components, offset, zoom, panMode, handlePinClick]);

  // Canvas mouse events
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    if (panMode || e.button !== 0 || isDraggingCanvas || draggingComponent) {
      return;
    }
    
    if (activeWire && e.target === canvasRef.current) {
      e.stopPropagation();
      
      const canvasRect = canvasRef.current?.getBoundingClientRect();
      if (!canvasRect) return;
      
      const canvasX = (e.clientX - canvasRect.left - offset.x) / zoom;
      const canvasY = (e.clientY - canvasRect.top - offset.y) / zoom;
      
      handleCanvasClick(canvasX, canvasY);
    }
  }, [panMode, isDraggingCanvas, draggingComponent, activeWire, offset, zoom, handleCanvasClick]);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDraggingCanvas) {
      pan(e.clientX, e.clientY);
      e.preventDefault();
      return;
    }
    
    if (draggingComponent) {
      const canvasRect = canvasRef.current?.getBoundingClientRect();
      if (!canvasRect) return;
      
      const coords = screenToCanvasCoordinates(e.clientX - canvasRect.left, e.clientY - canvasRect.top);
      
      const updatedComponents = components.map(component => {
        if (component.id === draggingComponent) {
          return {
            ...component,
            left: coords.x - dragOffset.x / zoom,
            top: coords.y - dragOffset.y / zoom
          };
        }
        return component;
      });
      
      onComponentsChange(updatedComponents);
    }
  }, [isDraggingCanvas, draggingComponent, pan, screenToCanvasCoordinates, components, onComponentsChange, dragOffset, zoom]);

  const handleCanvasMouseUp = useCallback((e: React.MouseEvent) => {
    if (draggingComponent) {
      const componentElement = document.getElementById(`wokwi-element-wrapper-${draggingComponent}`);
      if (componentElement) {
        componentElement.style.cursor = '';
        componentElement.style.zIndex = '';
        componentElement.style.opacity = '1';
      }
      
      setDraggingComponent(null);
      
      toast.success("Component repositioned", {
        description: "You can continue to reposition components by dragging them.",
        duration: 2000,
      });
    }
    
    endPan();
  }, [draggingComponent, endPan]);

  const handleCanvasMouseLeave = useCallback((e: React.MouseEvent) => {
    handleCanvasMouseUp(e);
  }, [handleCanvasMouseUp]);

  // Update component tracking
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

  const handleRetry = useCallback(async () => {
    setLoadingError(null);
    setLoadingAttempts(0);
    await checkWokwiLoaded();
  }, [checkWokwiLoaded]);

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
      
      {activeWire && (
        <div className="absolute top-12 right-2 bg-yellow-100 text-sm p-2 rounded-md shadow-md z-20">
          {activeWire.points.length > 1 ? 
            "Creating wire: Click canvas to add points, click a pin to complete, or press Esc to cancel." :
            "Creating wire: Click another pin to complete the connection, or press Esc to cancel."}
        </div>
      )}
      
      <div 
        ref={containerRef}
        className="h-full w-full overflow-hidden"
        onWheel={handleWheel}
      >
        <CircuitGrid
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onMouseDown={(e) => {
            if (panMode || e.button === 1 || e.ctrlKey) {
              startPan(e.clientX, e.clientY);
            } else {
              handleCanvasMouseDown(e);
            }
          }}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={handleCanvasMouseLeave}
          zoom={zoom}
          offset={offset}
          isDraggingCanvas={isDraggingCanvas}
          panMode={panMode}
          activeWire={Boolean(activeWire)}
        >
          <ComponentLayer
            components={components}
            hoveredComponent={hoveredComponent}
            setHoveredComponent={setHoveredComponent}
            visiblePins={visiblePins}
            togglePinVisibility={togglePinVisibility}
            hoveredPin={hoveredPin}
            handlePinHover={handlePinHover}
            handlePinHoverExit={handlePinHoverExit}
            handlePinClick={handlePinClick}
            handleComponentMouseDown={handleComponentMouseDown}
            activeWire={activeWire}
            potentialTargetRef={potentialTargetRef}
            renderedComponents={renderedComponents}
            setRenderedComponents={setRenderedComponents}
            fetchComponentPins={fetchComponentPins}
          />
        </CircuitGrid>
        
        <ModularWireRenderer
          wires={wires}
          activeWire={activeWire}
          stageWidth={canvasSize.width}
          stageHeight={canvasSize.height}
          onMouseMove={handleMouseMove}
          onMouseUp={handleStageMouseUp}
          onClick={handleKonvaClick}
          zoom={zoom}
          offset={offset}
        />
      </div>
    </div>
  );
};

export default CircuitCanvas;
