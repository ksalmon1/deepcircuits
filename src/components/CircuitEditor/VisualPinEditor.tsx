import React, { useState, useRef, useEffect, WheelEvent } from 'react';
import { Move, Plus, X, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface PinConfig {
  name: string;
  x: number;
  y: number;
  signals: string[];
}

interface VisualPinEditorProps {
  pins: PinConfig[];
  componentType: string;
  onChange: (pins: PinConfig[]) => void;
  readonly?: boolean;
}

/**
 * Component for visually editing pin positions on circuit components
 * Provides a visual interface for positioning and configuring pins
 */
const VisualPinEditor: React.FC<VisualPinEditorProps> = ({ 
  pins, 
  componentType, 
  onChange,
  readonly = false
}) => {
  const [draggedPin, setDraggedPin] = useState<number | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const componentContainerRef = useRef<HTMLDivElement>(null);
  const [editorSize, setEditorSize] = useState({ width: 0, height: 0 });
  const [showGrid, setShowGrid] = useState(true);
  const [hoveredPin, setHoveredPin] = useState<number | null>(null);
  const [componentElement, setComponentElement] = useState<HTMLElement | null>(null);
  const [componentBounds, setComponentBounds] = useState({ width: 0, height: 0 });
  const [componentOrigin, setComponentOrigin] = useState({ left: 0, top: 0 });
  const [currentDragPosition, setCurrentDragPosition] = useState({ x: 0, y: 0 });
  const [zoomLevel, setZoomLevel] = useState(1);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [showReferenceLines, setShowReferenceLines] = useState(false);

  // Effect to update editor size on mount and window resize
  useEffect(() => {
    const updateEditorSize = () => {
      if (editorRef.current) {
        const { width, height } = editorRef.current.getBoundingClientRect();
        setEditorSize({ width, height });
      }
    };

    updateEditorSize();
    window.addEventListener('resize', updateEditorSize);
    return () => window.removeEventListener('resize', updateEditorSize);
  }, []);

  // Create and render the component preview
  useEffect(() => {
    if (!componentType || !editorRef.current) return;

    try {
      const previewContainer = document.getElementById('pinEditor-component-preview');
      if (!previewContainer) return;

      // Clear previous content
      previewContainer.innerHTML = '';

      // Create the component element
      const element = document.createElement(componentType);
      previewContainer.appendChild(element);
      setComponentElement(element);
      
      // Get the component's dimensions for accurate border
      setTimeout(() => {
        if (element) {
          const rect = element.getBoundingClientRect();
          setComponentBounds({ 
            width: Math.ceil(rect.width), 
            height: Math.ceil(rect.height) 
          });
          
          // Store the component's position for relative pin positioning
          if (componentContainerRef.current) {
            const containerRect = componentContainerRef.current.getBoundingClientRect();
            const editorRect = editorRef.current?.getBoundingClientRect() || { left: 0, top: 0 };
            
            setComponentOrigin({
              left: containerRect.left - editorRect.left,
              top: containerRect.top - editorRect.top
            });
          }
        }
      }, 100);
    } catch (error) {
      console.error('Error rendering component preview:', error);
    }
  }, [componentType]);

  // Update component origin when zoom changes
  useEffect(() => {
    if (componentContainerRef.current && editorRef.current) {
      const containerRect = componentContainerRef.current.getBoundingClientRect();
      const editorRect = editorRef.current.getBoundingClientRect();
      
      setComponentOrigin({
        left: containerRect.left - editorRect.left,
        top: containerRect.top - editorRect.top
      });
    }
  }, [zoomLevel]);

  // Convert editor-relative coordinates to component-relative coordinates
  const toComponentCoordinates = (x: number, y: number) => {
    // Calculate the component's center position
    const componentCenterX = componentOrigin.left + (componentBounds.width * zoomLevel / 2);
    const componentCenterY = componentOrigin.top + (componentBounds.height * zoomLevel / 2);
    
    // Calculate the component's top-left corner
    const componentTopLeftX = componentCenterX - (componentBounds.width * zoomLevel / 2);
    const componentTopLeftY = componentCenterY - (componentBounds.height * zoomLevel / 2);
    
    // Convert to component-relative coordinates
    const relativeX = (x - componentTopLeftX) / zoomLevel;
    const relativeY = (y - componentTopLeftY) / zoomLevel;
    
    return { x: relativeX, y: relativeY };
  };

  // Convert component-relative coordinates to editor-relative coordinates
  const toEditorCoordinates = (x: number, y: number) => {
    // Calculate the component's center position
    const componentCenterX = componentOrigin.left + (componentBounds.width * zoomLevel / 2);
    const componentCenterY = componentOrigin.top + (componentBounds.height * zoomLevel / 2);
    
    // Calculate the component's top-left corner
    const componentTopLeftX = componentCenterX - (componentBounds.width * zoomLevel / 2);
    const componentTopLeftY = componentCenterY - (componentBounds.height * zoomLevel / 2);
    
    // Convert to editor-relative coordinates
    const editorX = componentTopLeftX + (x * zoomLevel);
    const editorY = componentTopLeftY + (y * zoomLevel);
    
    return { x: editorX, y: editorY };
  };

  const handlePinDragStart = (index: number) => {
    if (readonly) return;
    setDraggedPin(index);
  };

  const handleEditorClick = (e: React.MouseEvent) => {
    if (draggedPin === null) return;
    
    const rect = editorRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Calculate position in the editor
    const editorX = e.clientX - rect.left;
    const editorY = e.clientY - rect.top;
    
    // Convert to component-relative coordinates
    const { x: relativeX, y: relativeY } = toComponentCoordinates(editorX, editorY);

    // Update pin position
    const updatedPins = [...pins];
    updatedPins[draggedPin] = {
      ...updatedPins[draggedPin],
      x: Math.round(relativeX),
      y: Math.round(relativeY)
    };

    onChange(updatedPins);
    setDraggedPin(null);
  };
  
  const handlePinDrag = (e: React.MouseEvent) => {
    if (draggedPin === null) return;
    
    const rect = editorRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Calculate position in the editor
    const editorX = e.clientX - rect.left;
    const editorY = e.clientY - rect.top;
    
    // Convert to component-relative coordinates
    const { x: relativeX, y: relativeY } = toComponentCoordinates(editorX, editorY);
    
    // Store cursor position for visual feedback
    setCurrentDragPosition({ x: editorX, y: editorY });
    
    // Update pin position during drag
    const updatedPins = [...pins];
    updatedPins[draggedPin] = {
      ...updatedPins[draggedPin],
      x: Math.round(relativeX),
      y: Math.round(relativeY)
    };
    
    onChange(updatedPins);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = editorRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Calculate position in the editor
    const editorX = e.clientX - rect.left;
    const editorY = e.clientY - rect.top;
    
    // Convert to component-relative coordinates
    const { x: relativeX, y: relativeY } = toComponentCoordinates(editorX, editorY);
    
    // Update mouse position for coordinate display
    setMousePosition({ 
      x: Math.round(relativeX), 
      y: Math.round(relativeY) 
    });
    
    // Handle pin dragging
    if (draggedPin !== null) {
      handlePinDrag(e);
    }
  };

  const handlePinDragEnd = () => {
    setDraggedPin(null);
  };

  const handleZoom = (e: WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    const newZoom = Math.max(0.5, Math.min(3, zoomLevel + delta));
    setZoomLevel(newZoom);
  };

  const zoomIn = () => {
    setZoomLevel(prev => Math.min(3, prev + 0.2));
  };

  const zoomOut = () => {
    setZoomLevel(prev => Math.max(0.5, prev - 0.2));
  };

  const addNewPin = () => {
    if (readonly) return;
    
    const newPin = {
      name: `Pin ${pins.length + 1}`,
      x: Math.round(componentBounds.width / 2),
      y: Math.round(componentBounds.height / 2),
      signals: ['digital']
    };
    onChange([...pins, newPin]);
  };

  const removePin = (index: number) => {
    if (readonly) return;
    
    const updatedPins = pins.filter((_, i) => i !== index);
    onChange(updatedPins);
  };

  const updatePinSignal = (index: number, signal: string) => {
    if (readonly) return;
    
    const updatedPins = [...pins];
    updatedPins[index] = {
      ...updatedPins[index],
      signals: [signal]
    };
    onChange(updatedPins);
  };

  const updatePinName = (index: number, name: string) => {
    if (readonly) return;
    
    const updatedPins = [...pins];
    updatedPins[index] = {
      ...updatedPins[index],
      name
    };
    onChange(updatedPins);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Visual Pin Configuration</h3>
        <div className="space-x-2 flex items-center">
          <Button onClick={zoomOut} size="sm" variant="outline" className="px-2">
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium">{Math.round(zoomLevel * 100)}%</span>
          <Button onClick={zoomIn} size="sm" variant="outline" className="px-2">
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button 
            onClick={() => setShowGrid(!showGrid)} 
            size="sm" 
            variant="outline"
          >
            {showGrid ? "Hide Grid" : "Show Grid"}
          </Button>
          <Button 
            onClick={() => setShowReferenceLines(!showReferenceLines)} 
            size="sm" 
            variant="outline"
          >
            {showReferenceLines ? "Hide Lines" : "Show Lines"}
          </Button>
          {!readonly && (
            <Button onClick={addNewPin} size="sm">Add Pin</Button>
          )}
        </div>
      </div>

      <ScrollArea className="border rounded-md h-[300px] relative">
        <div 
          ref={editorRef}
          className="relative cursor-crosshair"
          style={{ 
            height: '300px', 
            width: '100%',
            overflow: 'hidden'
          }}
          onClick={handleEditorClick}
          onMouseMove={handleMouseMove}
          onMouseUp={handlePinDragEnd}
          onMouseLeave={handlePinDragEnd}
          onWheel={handleZoom}
        >
          {showGrid && (
            <div className="component-grid absolute inset-0"></div>
          )}

          {/* Component visual representation */}
          <div 
            ref={componentContainerRef}
            className="absolute top-1/2 left-1/2"
            style={{ 
              transform: `translate(-50%, -50%) scale(${zoomLevel})`,
              transformOrigin: 'center',
            }}
          >
            <div 
              className="component-pin-container"
              style={{ 
                width: `${componentBounds.width}px`, 
                height: `${componentBounds.height}px`,
                minWidth: '80px',
                minHeight: '80px',
                position: 'relative',
                transformOrigin: 'center',
                padding: '0',
                margin: '0'
              }}
            >
              <div id="pinEditor-component-preview" className="flex items-center justify-center"></div>
            </div>
          </div>

          {/* Pin markers */}
          {pins.map((pin, index) => {
            // Convert component-relative coordinates to editor-relative coordinates
            const editorCoords = toEditorCoordinates(pin.x, pin.y);
            
            return (
              <div
                key={`pin-${index}`}
                className={`pin-marker ${draggedPin === index ? 'dragging' : ''}`}
                style={{ 
                  left: `${editorCoords.x}px`, 
                  top: `${editorCoords.y}px`,
                  backgroundColor: getSignalColor(pin.signals && pin.signals.length > 0 ? pin.signals[0] : 'digital'),
                  cursor: readonly ? 'default' : 'move',
                }}
                data-pin-name={pin.name}
                onMouseEnter={() => setHoveredPin(index)}
                onMouseLeave={() => setHoveredPin(null)}
                onMouseDown={() => handlePinDragStart(index)}
              >
                {!readonly && (
                  <button 
                    className="absolute -top-5 -right-5 bg-red-500 text-white rounded-full flex items-center justify-center"
                    style={{
                      width: '16px',
                      height: '16px'
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      removePin(index);
                    }}
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}

          {/* Reference lines for pins */}
          {showReferenceLines && hoveredPin !== null && (
            <>
              <div 
                className="pin-reference-line"
                style={{
                  left: `${toEditorCoordinates(pins[hoveredPin].x, 0).x}px`,
                  top: `${componentOrigin.top}px`,
                  width: '1px',
                  height: `${componentBounds.height * zoomLevel}px`
                }}
              />
              <div 
                className="pin-reference-line"
                style={{
                  left: `${componentOrigin.left}px`,
                  top: `${toEditorCoordinates(0, pins[hoveredPin].y).y}px`,
                  height: '1px',
                  width: `${componentBounds.width * zoomLevel}px`
                }}
              />
            </>
          )}

          {/* Pin tooltip */}
          {hoveredPin !== null && (
            <div 
              className="pin-tooltip"
              style={{ 
                top: `${toEditorCoordinates(pins[hoveredPin].x, pins[hoveredPin].y).y - 16}px`, 
                left: `${toEditorCoordinates(pins[hoveredPin].x, pins[hoveredPin].y).x}px`,
              }}
            >
              {pins[hoveredPin].name}
              {pins[hoveredPin].signals && (
                <span className="text-xs opacity-70 ml-1">
                  ({pins[hoveredPin].signals.join(', ')})
                </span>
              )}
            </div>
          )}

          {/* Drag instruction */}
          {draggedPin !== null && (
            <div className="absolute top-4 left-4 bg-black bg-opacity-70 text-white p-2 rounded text-sm">
              Drag to position pin
            </div>
          )}

          {/* Coordinate display */}
          <div className="coordinate-display">
            Position: ({mousePosition.x}, {mousePosition.y})
          </div>
        </div>
      </ScrollArea>

      <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4">
        {pins.map((pin, index) => (
          <div key={`pin-details-${index}`} className="border p-3 rounded-md">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: getSignalColor(pin.signals && pin.signals.length > 0 ? pin.signals[0] : 'digital') }}
                ></div>
                <input
                  className="font-medium text-sm border-none focus:ring-0 p-0 w-full bg-transparent"
                  value={pin.name}
                  onChange={(e) => updatePinName(index, e.target.value)}
                  readOnly={readonly}
                />
              </div>
              {!readonly && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => handlePinDragStart(index)}
                >
                  <Move className="h-3 w-3" />
                </Button>
              )}
            </div>
            <div className="text-xs space-y-1">
              <div>Position: <span className="font-mono">({pin.x}, {pin.y})</span></div>
              <div>
                Signal: 
                <select 
                  className="font-mono ml-2 text-xs p-0 h-6 border rounded"
                  value={pin.signals && pin.signals.length > 0 ? pin.signals[0] : 'digital'}
                  onChange={(e) => updatePinSignal(index, e.target.value)}
                  disabled={readonly}
                >
                  <option value="power">Power</option>
                  <option value="ground">Ground</option>
                  <option value="digital">Digital</option>
                  <option value="analog">Analog</option>
                  <option value="passive">Passive</option>
                  <option value="i2c">I2C</option>
                  <option value="spi">SPI</option>
                  <option value="uart">UART</option>
                  <option value="rx">RX</option>
                  <option value="tx">TX</option>
                </select>
              </div>
            </div>
          </div>
        ))}
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

export default VisualPinEditor;
