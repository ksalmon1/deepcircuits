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
import { isInteractingWithPin } from '@/utils/wireUtils';
import { useCanvasNavigation } from '@/hooks/useCanvasNavigation';
import { useWireSystem } from '@/hooks/useWireSystem';
import KonvaWireRenderer from './KonvaWireRenderer';
import { isCustomComponent, renderCustomComponent } from '@/integrations/custom/CustomComponents';
import { fetchComponentPins } from '@/utils/componentUtils';

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
  
  const {
    wires,
    setWires,
    activeWire,
    handlePinClick,
    handleCanvasClick,
    handleMouseMove,
    handleStageMouseUp,
    handleKonvaClick,
    cancelActiveWire,
    potentialTarget,
    potentialTargetRef,
    moveWirePoint
  } = useWireSystem(components);
  
  const [hoveredComponent, setHoveredComponent] = useState<string | null>(null);
  const [hoveredPins, setHoveredPins] = useState<WokwiPin[]>([]);
  const [visiblePins, setVisiblePins] = useState<{[componentId: string]: boolean}>({});
  const [hoveredPin, setHoveredPin] = useState<{componentId: string, pinIndex: number} | null>(null);
  const [renderedComponents, setRenderedComponents] = useState<Record<string, boolean>>({});
  
  const [draggingComponent, setDraggingComponent] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  const { 
    components: libraryComponents, 
    componentsDetailsMap, 
    isLoadingComponents, 
    isLoadingDetails 
  } = useComponentLibrary();

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

  const fetchComponentPins = (type: string): WokwiPin[] => {
    try {
      if (pinCache[type]) {
        console.log(`Using cached pins for ${type}:`, pinCache[type]);
        return pinCache[type];
      }
      
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
        
        pinCache[type] = pins;
        return pins;
      }
      
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
    console.log('[DragDrop] Component dropped on canvas');
    
    try {
      const componentData = e.dataTransfer.getData('component');
      if (!componentData) {
        console.error('[DragDrop] No component data in drop event');
        return;
      }
      
      console.log('[DragDrop] Component data received:', componentData);
      const componentInfo = JSON.parse(componentData);
      
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) {
        console.error('[DragDrop] Canvas rect not found');
        return;
      }
      
      const x = (e.clientX - rect.left - offset.x) / zoom;
      const y = (e.clientY - rect.top - offset.y) / zoom;
      
      const gridSize = 25;
      const left = Math.floor(x / gridSize) * gridSize;
      const top = Math.floor(y / gridSize) * gridSize;
      
      const libraryComponent = libraryComponents?.find(c => c.type === componentInfo.type);
      
      let pins;
      if (libraryComponent?.id && componentsDetailsMap && componentsDetailsMap[libraryComponent.id]) {
        const details = componentsDetailsMap[libraryComponent.id];
        if (details && details.pins && details.pins.length > 0) {
          console.log(`[DragDrop] Using pins from details for ${componentInfo.type}:`, details.pins);
          pins = details.pins.map((pin: any) => ({
            name: pin.name,
            x: Number(pin.x),
            y: Number(pin.y),
            signals: pin.signals || []
          }));
        }
      }
      
      if (!pins && libraryComponent?.pins) {
        console.log(`[DragDrop] Using pins from component for ${componentInfo.type}:`, libraryComponent.pins);
        pins = libraryComponent.pins.map(pin => ({
          name: pin.name,
          x: Number(pin.x),
          y: Number(pin.y),
          signals: pin.signals || []
        }));
      }
      
      if (!pins) {
        console.log(`[DragDrop] Falling back to default pins for ${componentInfo.type}`);
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
      
      console.log('[DragDrop] Component added:', newComponent);
      console.log('[DragDrop] Total components after add:', updatedComponents.length);
      
      toast.success(`Added ${componentInfo.name}`, {
        description: `Component placed at position (${left}, ${top})`,
        duration: 2000,
      });
    } catch (error) {
      console.error('[DragDrop] Error adding component:', error);
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
    if (draggingComponent) return;
    
    if (hoveredComponent) {
      const element = document.getElementById(`wokwi-element-${hoveredComponent}`);
      if (element && element.firstChild) {
        (element.firstChild as HTMLElement).style.outline = 'none';
      }
    }
    
    if (!activeWire) {
      setHoveredComponent(null);
      setHoveredPins([]);
    }
  }, [hoveredComponent, draggingComponent, activeWire]);

  const handleComponentMouseDown = (e: React.MouseEvent, componentId: string) => {
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
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
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
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
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
  };

  const handleCanvasMouseUp = (e: React.MouseEvent) => {
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
  };

  const handleCanvasMouseLeave = (e: React.MouseEvent) => {
    handleCanvasMouseUp(e);
  };

  useEffect(() => {
    if (!isReady) return;
    
    components.forEach(component => {
      const elementId = `wokwi-element-${component.id}`;
      const element = document.getElementById(elementId);
      
      if (element && !renderedComponents[component.id]) {
        console.log(`Rendering component ${component.type} with id ${component.id}`);
        
        if (isCustomComponent(component.type)) {
          renderCustomComponent(component.type, elementId, component.attributes);
        } else {
          renderWokwiElement(component.type, elementId, component.attributes);
        }
        
        setRenderedComponents(prev => ({
          ...prev,
          [component.id]: true
        }));
      }
    });
  }, [components, isReady, renderedComponents]);

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

  const renderComponent = (component: WokwiComponent) => {
    const { type, id, top, left, attributes } = component;
    
    const pins = component.pins || fetchComponentPins(type);
    
    const showPins = visiblePins[id] || 
                    hoveredComponent === id || 
                    (activeWire && (activeWire.sourceComponentId === id || 
                                  (potentialTargetRef && potentialTargetRef.current?.componentId === id)));
    
    return (
      <div 
        key={id}
        id={`wokwi-element-wrapper-${id}`}
        className="absolute"
        style={{ 
          top: `${top}px`, 
          left: `${left}px`,
          cursor: draggingComponent === id ? 'grabbing' : 'grab'
        }}
        onMouseDown={(e) => handleComponentMouseDown(e, id)}
        onMouseEnter={() => handleComponentHover(id, type)}
        onMouseLeave={handleComponentHoverExit}
        onDoubleClick={() => togglePinVisibility(id)}
      >
        <div id={`wokwi-element-${id}`}></div>
        
        {showPins && pins && pins.length > 0 && (
          <div className="absolute top-0 left-0 z-30 pointer-events-none">
            {pins.map((pin, index) => {
              const signalColor = pin.signals && pin.signals.length > 0 
                ? (() => {
                    const normalizedSignal = pin.signals[0].toLowerCase().trim();
                    const signalColors: Record<string, string> = {
                      'power': '#FF6384',
                      '+5v': '#FF6384',
                      '+3.3v': '#FF6384',
                      'vcc': '#FF6384',
                      'ground': '#36A2EB',
                      'gnd': '#36A2EB',
                      'digital': '#4BC0C0',
                      'analog': '#FFCE56',
                      'passive': '#9966FF',
                      'i2c': '#FF9F40',
                      'spi': '#C9CBCF',
                      'uart': '#7CFC00',
                      'rx': '#FF00FF',
                      'tx': '#00FFFF',
                    };
                    
                    for (const [key, color] of Object.entries(signalColors)) {
                      if (normalizedSignal.includes(key)) {
                        return color;
                      }
                    }
                    return '#4BC0C0';
                  })()
                : '#4BC0C0';
                
              const isPotentialTarget = activeWire && 
                activeWire.sourceComponentId !== id && 
                hoveredPin?.componentId === id && 
                hoveredPin?.pinIndex === index;
                
              return (
                <div 
                  key={`pin-${id}-${index}`}
                  className="absolute pin-marker pointer-events-auto"
                  style={{ 
                    left: `${pin.x}px`, 
                    top: `${pin.y}px`,
                    backgroundColor: signalColor,
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    transform: 'translate(-50%, -50%)',
                    border: isPotentialTarget ? '2px solid white' : '1px solid rgba(0,0,0,0.3)',
                    boxShadow: isPotentialTarget ? '0 0 0 2px rgba(0,0,0,0.3)' : 'none',
                    cursor: 'pointer',
                    zIndex: 20
                  }}
                  onMouseEnter={() => handlePinHover(id, index)}
                  onMouseLeave={handlePinHoverExit}
                  onClick={(e) => {
                    e.stopPropagation();
                    const pinPos = {
                      x: component.left + pin.x,
                      y: component.top + pin.y
                    };
                    handlePinClick(id, index, pinPos.x, pinPos.y);
                  }}
                />
              );
            })}
          </div>
        )}
        
        {hoveredPin && hoveredPin.componentId === id && pins && pins[hoveredPin.pinIndex] && (
          <div 
            className="absolute z-40 bg-black text-white text-xs px-1 py-0.5 rounded-sm opacity-80"
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
        <div 
          ref={canvasRef} 
          className="h-full w-full grid grid-cols-[repeat(40,25px)] grid-rows-[repeat(30,25px)] bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjUiIGhlaWdodD0iMjUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSIyNSIgaGVpZ2h0PSIyNSIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDAgTCAyNSAwIE0gMCAwIEwgMCAyNSIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZTJlOGYwIiBzdHJva2Utd2lkdGg9IjEiPjwvcGF0aD48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiPjwvcmVjdD48L3N2Zz4=')]"
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
          style={{
            transform: `scale(${zoom}) translate(${offset.x / zoom}px, ${offset.y / zoom}px)`,
            transformOrigin: '0 0',
            transition: isDraggingCanvas ? 'none' : 'transform 0.1s ease-out',
            cursor: panMode ? 'move' : activeWire ? 'crosshair' : 'default',
            position: 'relative'
          }}
        >
          {components.map(component => renderComponent(component))}
        </div>
        
        <KonvaWireRenderer
          wires={wires}
          activeWire={activeWire}
          stageWidth={canvasSize.width}
          stageHeight={canvasSize.height}
          onMouseMove={handleMouseMove}
          onMouseUp={handleStageMouseUp}
          onClick={handleKonvaClick}
          zoom={zoom}
          offset={offset}
          onPointMove={moveWirePoint}
        />
      </div>
    </div>
  );
};

export default CircuitCanvas;
