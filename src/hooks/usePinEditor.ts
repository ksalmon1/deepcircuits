
import { useState, useCallback } from 'react';
import { ComponentPin } from '@/types/pin';
import { createNewPin, updatePinPosition, updatePinProperties, deletePin } from '@/utils/pinManagement';

/**
 * Custom hook to manage pin editor state and operations
 */
export function usePinEditor(
  pins: ComponentPin[],
  onPinsChange?: (pins: ComponentPin[]) => void,
  readonly: boolean = false
) {
  const [draggingPin, setDraggingPin] = useState<number | null>(null);
  const [hoveredPinIndex, setHoveredPinIndex] = useState<number | null>(null);
  const [editingPinName, setEditingPinName] = useState<number | null>(null);
  const [editingPinNameValue, setEditingPinNameValue] = useState<string>('');
  const [debugInfo, setDebugInfo] = useState<string>('No interactions yet');
  
  // Handle changes to pins
  const handlePinsChange = useCallback((updatedPins: ComponentPin[]) => {
    if (readonly) return;
    
    if (onPinsChange) {
      onPinsChange(updatedPins);
    }
  }, [onPinsChange, readonly]);
  
  // Handle adding a new pin
  const handleAddPin = useCallback((x: number, y: number) => {
    if (readonly) return;
    
    const newPin = createNewPin(x, y, pins);
    handlePinsChange([...pins, newPin]);
    setDebugInfo(`Added new pin at (${newPin.x}, ${newPin.y})`);
  }, [pins, handlePinsChange, readonly]);
  
  // Handle starting pin drag
  const handleStartDrag = useCallback((index: number) => {
    if (readonly) return;
    
    setDraggingPin(index);
    const pin = pins[index];
    setDebugInfo(`Started dragging pin ${index+1} (${pin.name}) at (${pin.x}, ${pin.y})`);
  }, [pins, readonly]);
  
  // Handle pin dragging
  const handleDragPin = useCallback((index: number, x: number, y: number) => {
    if (readonly || draggingPin === null) return;
    
    const updatedPins = updatePinPosition(pins, index, x, y);
    handlePinsChange(updatedPins);
    setDebugInfo(`Dragging pin ${index+1} to (${Math.round(x)}, ${Math.round(y)})`);
  }, [pins, draggingPin, handlePinsChange, readonly]);
  
  // Handle end of pin drag
  const handleEndDrag = useCallback(() => {
    if (draggingPin !== null) {
      setDebugInfo(`Finished dragging pin ${draggingPin+1}`);
    }
    setDraggingPin(null);
  }, [draggingPin]);
  
  // Handle deleting a pin
  const handleDeletePin = useCallback((index: number) => {
    if (readonly) return;
    
    const updatedPins = deletePin(pins, index);
    handlePinsChange(updatedPins);
    setDebugInfo(`Deleted pin ${index+1}`);
  }, [pins, handlePinsChange, readonly]);
  
  // Handle updating pin properties
  const handleUpdatePinSignal = useCallback((index: number, signal: string) => {
    if (readonly) return;
    
    const updatedPins = updatePinProperties(pins, index, { 
      signals: [signal] 
    });
    
    handlePinsChange(updatedPins);
    setDebugInfo(`Updated pin ${index+1} signal to ${signal}`);
  }, [pins, handlePinsChange, readonly]);
  
  // Handle updating pin name
  const handleUpdatePinName = useCallback((index: number, name: string) => {
    if (readonly) return;
    
    const updatedPins = updatePinProperties(pins, index, { name });
    
    handlePinsChange(updatedPins);
    setDebugInfo(`Updated pin ${index+1} name to "${name}"`);
  }, [pins, handlePinsChange, readonly]);
  
  // Handle pin hover
  const handlePinHover = useCallback((index: number | null) => {
    setHoveredPinIndex(index);
  }, []);
  
  // Handle editing pin name
  const handleStartEditName = useCallback((index: number) => {
    if (readonly) return;
    
    setEditingPinName(index);
    setEditingPinNameValue(pins[index].name);
  }, [pins, readonly]);
  
  // Handle submitting name edit
  const handleSubmitNameEdit = useCallback(() => {
    if (editingPinName !== null && editingPinNameValue.trim()) {
      handleUpdatePinName(editingPinName, editingPinNameValue.trim());
      setEditingPinName(null);
    }
  }, [editingPinName, editingPinNameValue, handleUpdatePinName]);
  
  // Handle key press during name edit
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmitNameEdit();
    } else if (e.key === 'Escape') {
      setEditingPinName(null);
    }
  }, [handleSubmitNameEdit]);
  
  return {
    draggingPin,
    hoveredPinIndex,
    editingPinName,
    editingPinNameValue,
    debugInfo,
    setDraggingPin,
    setHoveredPinIndex,
    setEditingPinName,
    setEditingPinNameValue,
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
  };
}
