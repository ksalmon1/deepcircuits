
import React, { useState, useRef, useEffect, WheelEvent } from 'react';
import { Move, Plus, X, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { isWokwiLoaded, forceLoadWokwiElements } from '@/integrations/wokwi/WokwiIntegration';
import { ComponentPin } from '@/types/database';
import { renderWokwiComponentPreview } from '@/utils/componentPreviewUtils';

interface VisualPinEditorProps {
  pins: ComponentPin[];
  componentType: string;
  onPinsChange?: (pins: ComponentPin[]) => void;
  onChange?: (pins: ComponentPin[]) => void; // Alias for backwards compatibility
  width?: number;
  height?: number;
  className?: string;
  readonly?: boolean;
}

/**
 * Component for visually editing pin positions on circuit components
 * Provides a visual interface for positioning and configuring pins
 * 
 * IMPORTANT: The coordinate system for pins is relative to the component's top-left corner (0,0)
 * This ensures consistency with the CircuitCanvas component
 */
const VisualPinEditor: React.FC<VisualPinEditorProps> = ({ 
  pins, 
  componentType, 
  onPinsChange,
  onChange, // Alias for backwards compatibility
  width = 300, 
  height = 300,
  className = '',
  readonly = false
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const componentRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const [componentLoaded, setComponentLoaded] = useState(false);
  const [draggingPin, setDraggingPin] = useState<number | null>(null);
  const [editingPin, setEditingPin] = useState<number | null>(null);
  const [newPinName, setNewPinName] = useState<string>('');
  const [newPinSignals, setNewPinSignals] = useState<string>('');
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const [panMode, setPanMode] = useState(false);
  const [componentCenter, setComponentCenter] = useState({ x: 0, y: 0 });
  const [componentElement, setComponentElement] = useState<HTMLElement | null>(null);
  
  // Ensure pins is an array
  const pinData = Array.isArray(pins) ? pins : [];
  
  // Handle backward compatibility for onChange vs onPinsChange
  const handlePinsChange = (updatedPins: ComponentPin[]) => {
    if (onPinsChange) {
      onPinsChange(updatedPins);
    } else if (onChange) {
      onChange(updatedPins);
    }
  };
  
  // Try to load Wokwi elements
  useEffect(() => {
    const loadWokwi = async () => {
      try {
        if (!isWokwiLoaded()) {
          await forceLoadWokwiElements();
        }
        
        if (componentType && previewRef.current) {
          console.log("Rendering component preview for:", componentType);
          
          // Clear previous content
          previewRef.current.innerHTML = '';
          
          // Create a wrapper to position the component at a fixed location
          const wrapper = document.createElement('div');
          wrapper.style.position = 'relative';
          wrapper.style.width = '100%';
          wrapper.style.height = '100%';
          previewRef.current.appendChild(wrapper);
          
          await renderWokwiComponentPreview(componentType, wrapper);
          setComponentLoaded(true);
          
          // After component is loaded, get its element reference
          setTimeout(() => {
            // The component is the first element child of the wrapper
            const element = wrapper.firstElementChild?.firstElementChild;
            if (element instanceof HTMLElement) {
              setComponentElement(element);
              console.log("Component element found and positioned at top-left (0,0)");
            }
          }, 200);
        }
      } catch (error) {
        console.error('Error loading component preview:', error);
      }
    };
    
    loadWokwi();
  }, [componentType]);
  
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (readonly) return;
    
    if (panMode || e.button === 1 || e.ctrlKey) {
      setIsDraggingCanvas(true);
      setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
      return;
    }
    
    // Get component element - crucial for accurate pin positioning
    if (!componentElement) return;
    
    const componentRect = componentElement.getBoundingClientRect();
    
    // Calculate coordinates relative to component's top-left (0,0)
    // This is the key fix: we need to get coordinates relative to the component element
    const canvasX = (e.clientX - componentRect.left) / zoom;
    const canvasY = (e.clientY - componentRect.top) / zoom;
    
    console.log(`Click at client coordinates: (${e.clientX}, ${e.clientY})`);
    console.log(`Component bounding rect: left=${componentRect.left}, top=${componentRect.top}`);
    console.log(`Calculated pin position relative to component: (${canvasX}, ${canvasY})`);
    
    // Check if clicking on an existing pin
    for (let i = 0; i < pinData.length; i++) {
      const pin = pinData[i];
      const pinX = Number(pin.x);
      const pinY = Number(pin.y);
      
      const dx = canvasX - pinX;
      const dy = canvasY - pinY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < 10) {
        setDraggingPin(i);
        return;
      }
    }
    
    // If clicked outside pins and not in pan mode, add a new pin
    if (!readonly && e.button === 0 && !e.ctrlKey) {
      const newPin: ComponentPin = {
        name: `pin${pinData.length + 1}`,
        x: canvasX,
        y: canvasY,
        signals: []
      };
      
      console.log(`Adding new pin at coordinates (${canvasX}, ${canvasY}) relative to component's top-left`);
      handlePinsChange([...pinData, newPin]);
    }
  };
  
  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (readonly) return;
    
    if (isDraggingCanvas) {
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      setOffset({ x: newX, y: newY });
      return;
    }
    
    if (draggingPin !== null && componentElement) {
      const componentRect = componentElement.getBoundingClientRect();
      
      // Calculate coordinates relative to component's top-left (0,0)
      const canvasX = (e.clientX - componentRect.left) / zoom;
      const canvasY = (e.clientY - componentRect.top) / zoom;
      
      // Update the pin position
      const updatedPins = [...pinData];
      updatedPins[draggingPin] = {
        ...updatedPins[draggingPin],
        x: canvasX,
        y: canvasY
      };
      
      handlePinsChange(updatedPins);
    }
  };
  
  const handleCanvasMouseUp = () => {
    setDraggingPin(null);
    setIsDraggingCanvas(false);
  };
  
  const handleCanvasMouseLeave = () => {
    setDraggingPin(null);
    setIsDraggingCanvas(false);
  };
  
  const handleWheelZoom = (e: WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom(prevZoom => Math.max(0.5, Math.min(3, prevZoom + delta)));
  };
  
  const handleEditPin = (index: number) => {
    if (readonly) return;
    setEditingPin(index);
    setNewPinName(pinData[index].name);
    setNewPinSignals(pinData[index].signals ? pinData[index].signals.join(',') : '');
  };
  
  const handleSavePin = () => {
    if (editingPin === null || readonly) return;
    
    const updatedPins = [...pinData];
    updatedPins[editingPin] = {
      ...updatedPins[editingPin],
      name: newPinName,
      signals: newPinSignals.split(',').map(s => s.trim()).filter(s => s)
    };
    
    handlePinsChange(updatedPins);
    
    setEditingPin(null);
    setNewPinName('');
    setNewPinSignals('');
  };
  
  const handleDeletePin = (index: number) => {
    if (readonly) return;
    
    const updatedPins = [...pinData];
    updatedPins.splice(index, 1);
    
    handlePinsChange(updatedPins);
  };
  
  const togglePanMode = () => {
    setPanMode(!panMode);
  };
  
  const handleZoomIn = () => {
    setZoom(prevZoom => Math.min(prevZoom + 0.1, 3));
  };
  
  const handleZoomOut = () => {
    setZoom(prevZoom => Math.max(prevZoom - 0.1, 0.5));
  };
  
  const resetView = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };
  
  return (
    <div className={`flex flex-col h-full ${className}`} style={{ minHeight: '400px' }}>
      <div className="flex justify-between items-center mb-2">
        <div className="text-sm font-medium">Visual Pin Configuration</div>
        <div className="flex items-center gap-1">
          <Button 
            variant="outline" 
            size="icon" 
            className="h-7 w-7" 
            onClick={handleZoomIn} 
            title="Zoom In"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button 
            variant="outline" 
            size="icon" 
            className="h-7 w-7" 
            onClick={handleZoomOut}
            title="Zoom Out"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button 
            variant="outline" 
            size="icon" 
            className={`h-7 w-7 ${panMode ? 'bg-muted' : ''}`} 
            onClick={togglePanMode}
            title="Pan Mode"
          >
            <Move className="h-4 w-4" />
          </Button>
          <span className="text-xs ml-1">
            {Math.round(zoom * 100)}%
          </span>
        </div>
      </div>
      
      <div className="flex-1 flex gap-4" style={{ minHeight: '350px' }}>
        <div 
          ref={containerRef} 
          className="flex-1 border rounded overflow-hidden relative bg-gray-50"
          style={{ width, height: '100%', cursor: panMode ? 'move' : 'default', minHeight: '300px' }}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={handleCanvasMouseLeave}
          onWheel={handleWheelZoom}
        >
          <div
            className="absolute"
            style={{ 
              transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
              transformOrigin: '0 0',
              transition: isDraggingCanvas ? 'none' : 'transform 0.1s',
              width: '100%',
              height: '100%'
            }}
          >
            <div 
              ref={previewRef} 
              className="absolute" 
              style={{ 
                left: '50%', 
                top: '50%', 
                transform: 'translate(-50%, -50%)', 
                zIndex: 5,
                border: '1px dashed rgba(0, 0, 0, 0.2)'
              }}
            ></div>
            
            {/* Render pins - positions are relative to component's top-left (0,0) */}
            {componentElement && pinData.map((pin, i) => {
              return (
                <div 
                  key={i} 
                  className="absolute" 
                  style={{
                    left: `${Number(pin.x)}px`,
                    top: `${Number(pin.y)}px`,
                    transform: 'translate(-50%, -50%)',
                    cursor: readonly ? 'default' : 'move',
                    zIndex: 10
                  }}
                >
                  <div 
                    className={`rounded-full w-5 h-5 flex items-center justify-center ${readonly ? 'bg-blue-200' : 'bg-blue-500 hover:bg-blue-600'} transition-colors`}
                    onClick={() => handleEditPin(i)}
                  >
                    <span className="text-white text-xs font-bold">{i+1}</span>
                  </div>
                  <div className="absolute whitespace-nowrap text-xs -mt-5 left-1/2 transform -translate-x-1/2 bg-white/90 px-1 py-0.5 rounded shadow-sm">
                    {pin.name}
                  </div>
                </div>
              );
            })}
            
            {/* Reference grid */}
            <div className="absolute left-0 top-0 w-full h-full grid grid-cols-12 grid-rows-12 pointer-events-none">
              {Array.from({ length: 13 }).map((_, i) => (
                <div key={`h-${i}`} className="absolute left-0 right-0 border-t border-gray-200" style={{ top: `${(i / 12) * 100}%` }}></div>
              ))}
              {Array.from({ length: 13 }).map((_, i) => (
                <div key={`v-${i}`} className="absolute top-0 bottom-0 border-l border-gray-200" style={{ left: `${(i / 12) * 100}%` }}></div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Pin details panel */}
        {!readonly && (
          <div className="w-72 border rounded p-3 overflow-y-auto text-sm">
            <h3 className="font-medium mb-2">Pin Details</h3>
            
            {editingPin !== null ? (
              <div className="mb-3 space-y-2">
                <div>
                  <label className="text-xs font-medium">Name:</label>
                  <Input 
                    value={newPinName} 
                    onChange={(e) => setNewPinName(e.target.value)} 
                    className="h-7 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium">Signals (comma-separated):</label>
                  <Input 
                    value={newPinSignals} 
                    onChange={(e) => setNewPinSignals(e.target.value)} 
                    className="h-7 text-sm"
                  />
                </div>
                <div className="flex justify-end gap-1">
                  <Button size="sm" onClick={handleSavePin}>Save</Button>
                  <Button size="sm" variant="outline" onClick={() => setEditingPin(null)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <div className="space-y-1 max-h-[250px] overflow-y-auto pr-1">
                {pinData.length > 0 ? (
                  pinData.map((pin, i) => (
                    <div key={i} className="flex items-center justify-between p-2 border rounded hover:bg-gray-50">
                      <div className="overflow-hidden">
                        <div className="font-medium truncate flex items-center gap-1">
                          <span className="bg-blue-500 text-white w-4 h-4 rounded-full flex items-center justify-center text-xs">{i+1}</span>
                          {pin.name}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          x: {Math.round(Number(pin.x))}, y: {Math.round(Number(pin.y))}
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {pin.signals && pin.signals.length > 0 ? (
                            pin.signals.map((signal, j) => (
                              <Badge key={j} variant="outline" className="text-xs">{signal}</Badge>
                            ))
                          ) : (
                            <span className="text-xs text-muted-foreground">No signals</span>
                          )}
                        </div>
                      </div>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-6 w-6" 
                        onClick={() => handleDeletePin(i)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-center text-muted-foreground p-2">
                    {readonly ? "No pins defined" : "Click on the diagram to add pins"}
                  </div>
                )}
              </div>
            )}
            
            {/* Pin position legend */}
            <div className="mt-4 p-3 bg-blue-50 rounded text-xs space-y-2">
              <p className="font-medium">Coordinate System:</p>
              <ul className="list-disc pl-4 space-y-1 text-gray-700">
                <li>The <span className="font-semibold">red dot</span> marks the origin (0,0) at the top-left of the component</li>
                <li>All coordinates are <span className="font-semibold">relative to this origin point</span></li>
                <li>These exact coordinates will be used in the circuit editor</li>
                <li>Pin positions should align with the visible component terminals</li>
              </ul>
            </div>

            <div className="mt-3 p-3 bg-gray-50 rounded text-xs space-y-2">
              <p className="font-medium">Controls:</p>
              <ul className="list-disc pl-4 space-y-1 text-gray-700">
                <li>Click to add new pins</li>
                <li>Drag existing pins to reposition</li>
                <li>Click a pin to edit its properties</li>
                <li>Use mouse wheel or buttons to zoom</li>
                <li>Hold middle mouse button or use Pan Mode to move the view</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VisualPinEditor;
