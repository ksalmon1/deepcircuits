
import React, { useRef, useEffect } from 'react';
import { ComponentPin } from '@/types/pin';
import { usePinEditor } from '@/hooks/usePinEditor';
import { useCanvasNavigation } from '@/hooks/useCanvasNavigation';
import { isWokwiLoaded, forceLoadWokwiElements } from '@/integrations/wokwi/WokwiIntegration';
import { renderWokwiComponentPreview } from '@/utils/componentPreviewUtils';
import { isPointNearPin } from '@/utils/pinManagement';
import CanvasToolbar from './CanvasToolbar';
import PinVisualizer from './PinVisualizer';
import PinList from './PinList';
import ReferenceGrid from './ReferenceGrid';
import { CoordinateSystemInfo, ControlsInfo } from './InfoPanels';

interface PinEditorProps {
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
 */
const PinEditor: React.FC<PinEditorProps> = ({
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
  const [componentElement, setComponentElement] = useState<HTMLElement | null>(null);

  // Ensure we have an array of pins
  const pinData = Array.isArray(pins) ? pins : [];
  
  // Handle pin changes, supporting both onPinsChange and onChange for backwards compatibility
  const handlePinChanges = useCallback((updatedPins: ComponentPin[]) => {
    if (onPinsChange) {
      onPinsChange(updatedPins);
    } else if (onChange) {
      onChange(updatedPins);
    }
  }, [onPinsChange, onChange]);
  
  // Initialize canvas navigation
  const {
    zoom,
    setZoom,
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
  
  // Initialize pin editor state and operations
  const {
    draggingPin,
    hoveredPinIndex,
    debugInfo,
    setDebugInfo,
    handleAddPin,
    handleStartDrag,
    handleDragPin,
    handleEndDrag,
    handleDeletePin,
    handleUpdatePinSignal,
    handleUpdatePinName,
    handlePinHover,
    handleStartEditName,
    handleSubmitNameEdit,
    handleKeyPress,
    editingPinName,
    editingPinNameValue,
    setEditingPinNameValue
  } = usePinEditor(pinData, handlePinChanges, readonly);

  // Load Wokwi component
  useEffect(() => {
    const loadWokwi = async () => {
      try {
        if (!isWokwiLoaded()) {
          await forceLoadWokwiElements();
        }
        
        if (componentType && previewRef.current) {
          console.log("Rendering component preview for:", componentType);
          
          previewRef.current.innerHTML = '';
          
          const wrapper = document.createElement('div');
          wrapper.style.position = 'relative';
          wrapper.style.width = '100%';
          wrapper.style.height = '100%';
          previewRef.current.appendChild(wrapper);
          
          await renderWokwiComponentPreview(componentType, wrapper);
          setComponentLoaded(true);
          
          setTimeout(() => {
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
  
  // Canvas interaction handlers
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (readonly) return;
    
    if (panMode || e.button === 1 || e.ctrlKey) {
      startPan(e.clientX, e.clientY);
      return;
    }
    
    if (!componentElement) return;
    
    const componentRect = componentElement.getBoundingClientRect();
    const containerRect = containerRef.current?.getBoundingClientRect();
    
    if (!containerRect) return;
    
    const originX = componentRect.left;
    const originY = componentRect.top;
    
    const canvasX = (e.clientX - originX) / zoom;
    const canvasY = (e.clientY - originY) / zoom;
    
    const debugMessage = `Click at client coordinates: (${e.clientX}, ${e.clientY})
Component origin at: left=${originX}, top=${originY}
Calculated pin position relative to component origin: (${canvasX}, ${canvasY})`;
    
    console.log(debugMessage);
    setDebugInfo(debugMessage);
    
    for (let i = 0; i < pinData.length; i++) {
      const pin = pinData[i];
      const pinX = pin.x;
      const pinY = pin.y;
      
      if (isPointNearPin(canvasX, canvasY, pinX, pinY)) {
        handleStartDrag(i);
        return;
      }
    }
    
    if (!readonly && e.button === 0 && !e.ctrlKey) {
      handleAddPin(canvasX, canvasY);
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
      
      const canvasX = (e.clientX - componentRect.left) / zoom;
      const canvasY = (e.clientY - componentRect.top) / zoom;
      
      handleDragPin(draggingPin, canvasX, canvasY);
    }
  };
  
  // Set up wheel event handler
  useEffect(() => {
    const handleWheelEvent = (e: WheelEvent) => {
      if (containerRef.current && containerRef.current.contains(e.target as Node)) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        setZoom(prevZoom => Math.max(0.5, Math.min(3, prevZoom + delta)));
      }
    };
    
    containerRef.current?.addEventListener('wheel', handleWheelEvent, { passive: false });
    
    return () => {
      containerRef.current?.removeEventListener('wheel', handleWheelEvent);
    };
  }, [setZoom]);
  
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
          onMouseUp={handleEndDrag}
          onMouseLeave={handleEndDrag}
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
              onEditPin={(index) => {}}
              hoveredPinIndex={hoveredPinIndex}
            />
            
            <ReferenceGrid 
              size={100}
              divisions={10}
              showCoordinates={true}
              componentElement={componentElement}
            />
          </div>

          {process.env.NODE_ENV === 'development' && (
            <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs p-2 font-mono overflow-auto max-h-20 z-50">
              {debugInfo}
            </div>
          )}
        </div>
        
        {!readonly && (
          <div className="w-72 border rounded p-3 overflow-y-auto text-sm">
            <h3 className="font-medium mb-2">Pin Details</h3>
            
            <PinList 
              pins={pinData}
              readonly={readonly}
              onDeletePin={handleDeletePin}
              onEditPin={(index) => {}}
              onHoverPin={handlePinHover}
              onUpdatePinSignal={handleUpdatePinSignal}
              onUpdatePinName={handleUpdatePinName}
              editingPinName={editingPinName}
              editingPinNameValue={editingPinNameValue}
              setEditingPinNameValue={setEditingPinNameValue}
              onStartEditName={handleStartEditName}
              onSubmitNameEdit={handleSubmitNameEdit}
              onKeyPress={handleKeyPress}
            />
            
            <CoordinateSystemInfo />
            <ControlsInfo />
          </div>
        )}
      </div>
    </div>
  );
};

export default PinEditor;
