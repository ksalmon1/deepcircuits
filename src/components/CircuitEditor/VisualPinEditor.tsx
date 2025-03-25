import React, { useState, useRef, useEffect } from 'react';
import { ComponentPin } from '@/types/database';
import { isWokwiLoaded, forceLoadWokwiElements } from '@/integrations/wokwi/WokwiIntegration';
import { renderWokwiComponentPreview } from '@/utils/componentPreviewUtils';
import { isPointNearPin, createNewPin, updatePinPosition, updatePinProperties, deletePin } from '@/utils/pinUtils';
import { useCanvasNavigation } from '@/hooks/useCanvasNavigation';
import CanvasToolbar from './PinEditor/CanvasToolbar';
import PinVisualizer from './PinEditor/PinVisualizer';
import PinList from './PinEditor/PinList';
import PinEditForm from './PinEditor/PinEditForm';
import ReferenceGrid from './PinEditor/ReferenceGrid';
import { CoordinateSystemInfo, ControlsInfo } from './PinEditor/InfoPanels';

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
  const previewRef = useRef<HTMLDivElement>(null);
  const [componentLoaded, setComponentLoaded] = useState(false);
  const [draggingPin, setDraggingPin] = useState<number | null>(null);
  const [editingPin, setEditingPin] = useState<number | null>(null);
  const [newPinName, setNewPinName] = useState<string>('');
  const [newPinSignals, setNewPinSignals] = useState<string>('');
  const [componentElement, setComponentElement] = useState<HTMLElement | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>('No interactions yet');
  
  // Use the canvas navigation hook
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
    handleWheel
  } = useCanvasNavigation(1);
  
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
      startPan(e.clientX, e.clientY);
      return;
    }
    
    // Get component element bounds - crucial for accurate pin positioning
    if (!componentElement) return;
    
    const componentRect = componentElement.getBoundingClientRect();
    const containerRect = containerRef.current?.getBoundingClientRect();
    
    if (!containerRect) return;
    
    // Calculate the position of the red dot (component's origin)
    const originX = componentRect.left;
    const originY = componentRect.top;
    
    // Calculate coordinates relative to component's origin (0,0)
    // This is the key fix: we're using the component element's position as the origin
    const canvasX = (e.clientX - originX) / zoom;
    const canvasY = (e.clientY - originY) / zoom;
    
    const debugMessage = `Click at client coordinates: (${e.clientX}, ${e.clientY})
Component origin at: left=${originX}, top=${originY}
Calculated pin position relative to component origin: (${canvasX}, ${canvasY})`;
    
    console.log(debugMessage);
    setDebugInfo(debugMessage);
    
    // Check if clicking on an existing pin
    for (let i = 0; i < pinData.length; i++) {
      const pin = pinData[i];
      const pinX = Number(pin.x);
      const pinY = Number(pin.y);
      
      if (isPointNearPin(canvasX, canvasY, pinX, pinY)) {
        setDraggingPin(i);
        setDebugInfo(`Started dragging pin ${i+1} (${pin.name}) at (${pinX}, ${pinY})`);
        return;
      }
    }
    
    // If clicked outside pins and not in pan mode, add a new pin
    if (!readonly && e.button === 0 && !e.ctrlKey) {
      const newPin = createNewPin(canvasX, canvasY, pinData);
      
      console.log(`Adding new pin at coordinates (${canvasX}, ${canvasY}) relative to component's origin`);
      handlePinsChange([...pinData, newPin]);
      setDebugInfo(`Added new pin at (${newPin.x}, ${newPin.y})`);
    }
  };
  
  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (readonly) return;
    
    if (isDraggingCanvas) {
      pan(e.clientX, e.clientY);
      return;
    }
    
    if (draggingPin !== null && componentElement) {
      const componentRect = componentElement.getBoundingClientRect();
      
      // Calculate coordinates relative to component's origin (0,0)
      const canvasX = (e.clientX - componentRect.left) / zoom;
      const canvasY = (e.clientY - componentRect.top) / zoom;
      
      // Update the pin position
      const updatedPins = updatePinPosition(pinData, draggingPin, canvasX, canvasY);
      handlePinsChange(updatedPins);
      
      setDebugInfo(`Dragging pin ${draggingPin+1} to (${Math.round(canvasX)}, ${Math.round(canvasY)})`);
    }
  };
  
  const handleCanvasMouseUp = () => {
    if (draggingPin !== null) {
      setDebugInfo(`Finished dragging pin ${draggingPin+1}`);
    }
    setDraggingPin(null);
    endPan();
  };
  
  const handleCanvasMouseLeave = () => {
    setDraggingPin(null);
    endPan();
  };
  
  const handleEditPin = (index: number) => {
    if (readonly) return;
    setEditingPin(index);
    setNewPinName(pinData[index].name);
    setNewPinSignals(pinData[index].signals ? pinData[index].signals.join(',') : '');
  };
  
  const handleSavePin = () => {
    if (editingPin === null || readonly) return;
    
    const updatedPins = updatePinProperties(pinData, editingPin, newPinName, newPinSignals);
    handlePinsChange(updatedPins);
    
    setEditingPin(null);
    setNewPinName('');
    setNewPinSignals('');
  };
  
  const handleDeletePin = (index: number) => {
    if (readonly) return;
    
    const updatedPins = deletePin(pinData, index);
    handlePinsChange(updatedPins);
  };
  
  useEffect(() => {
    const handleWheelEvent = (e: WheelEvent) => {
      if (containerRef.current && containerRef.current.contains(e.target as Node)) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        setZoom(prevZoom => Math.max(0.5, Math.min(3, prevZoom + delta)));
      }
    };
    
    // Add the wheel event listener with the passive option set to false
    containerRef.current?.addEventListener('wheel', handleWheelEvent, { passive: false });
    
    // Clean up the event listener when the component unmounts
    return () => {
      containerRef.current?.removeEventListener('wheel', handleWheelEvent);
    };
  }, []);
  
  return (
    <div className={`flex flex-col h-full ${className}`} style={{ minHeight: '400px' }}>
      <CanvasToolbar 
        zoom={zoom}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onTogglePanMode={togglePanMode}
        panMode={panMode}
      />
      
      <div className="flex-1 flex gap-4" style={{ minHeight: '350px' }}>
        <div 
          ref={containerRef} 
          className="flex-1 border rounded overflow-hidden relative bg-gray-50"
          style={{ width, height: '100%', cursor: panMode ? 'move' : 'default', minHeight: '300px' }}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={handleCanvasMouseLeave}
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
                left: '0', 
                top: '0', 
                zIndex: 5,
                border: '1px dashed rgba(0, 0, 0, 0.2)'
              }}
            ></div>
            
            <PinVisualizer 
              pins={pinData}
              componentElement={componentElement}
              readonly={readonly}
              onEditPin={handleEditPin}
            />
            
            <ReferenceGrid 
              size={100}
              divisions={10}
              showCoordinates={true}
              componentElement={componentElement}
            />
          </div>

          {/* Debug overlay (only visible during development) */}
          {process.env.NODE_ENV === 'development' && (
            <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs p-2 font-mono overflow-auto max-h-20 z-50">
              {debugInfo}
            </div>
          )}
        </div>
        
        {/* Pin details panel */}
        {!readonly && (
          <div className="w-72 border rounded p-3 overflow-y-auto text-sm">
            <h3 className="font-medium mb-2">Pin Details</h3>
            
            {editingPin !== null ? (
              <PinEditForm 
                pinName={newPinName}
                pinSignals={newPinSignals}
                onPinNameChange={setNewPinName}
                onPinSignalsChange={setNewPinSignals}
                onSave={handleSavePin}
                onCancel={() => setEditingPin(null)}
              />
            ) : (
              <PinList 
                pins={pinData}
                readonly={readonly}
                onDeletePin={handleDeletePin}
                onEditPin={handleEditPin}
              />
            )}
            
            <CoordinateSystemInfo />
            <ControlsInfo />
          </div>
        )}
      </div>
    </div>
  );
};

export default VisualPinEditor;
