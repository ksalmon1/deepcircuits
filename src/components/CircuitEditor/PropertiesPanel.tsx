
import React from 'react';
import { CircuitComponent } from '@/types/component';
import DynamicPropertyEditor from './DynamicPropertyEditor';
import VisualPinEditor from './VisualPinEditor';
import { useCircuitEditor } from '@/context/CircuitEditorContext';
import ErrorBoundary from './ErrorBoundary';

/**
 * Panel for editing selected component properties
 * Uses the circuit editor context directly
 */
const PropertiesPanel: React.FC = () => {
  const { 
    selectedComponent, 
    handleUpdateComponentAttributes 
  } = useCircuitEditor();
  
  const updateComponentPins = (componentId: string, pins: any[]) => {
    // Update the component in the context
    handleUpdateComponentAttributes(componentId, { pins });
  };
  
  if (!selectedComponent) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        <div className="text-center p-4">
          <p>No component selected</p>
          <p className="text-sm mt-2">Select a component on the canvas to view and edit its properties</p>
        </div>
      </div>
    );
  }
  
  return (
    <ErrorBoundary>
      <div className="h-full flex flex-col overflow-auto">
        <h2 className="text-lg font-medium mb-4">Component Properties</h2>
        
        <div className="mb-4">
          <h3 className="text-sm font-medium mb-2">Component ID</h3>
          <div className="text-sm bg-gray-100 p-2 rounded font-mono break-all">
            {selectedComponent.id}
          </div>
        </div>
        
        <div className="mb-4">
          <h3 className="text-sm font-medium mb-2">Component Type</h3>
          <div className="text-sm bg-gray-100 p-2 rounded">
            {selectedComponent.type}
          </div>
        </div>
        
        <div className="mb-6">
          <h3 className="text-sm font-medium mb-2">Attributes</h3>
          {selectedComponent.attributes && Object.keys(selectedComponent.attributes).length > 0 ? (
            <DynamicPropertyEditor 
              properties={selectedComponent.attributes} 
              onChange={(updatedProps) => {
                handleUpdateComponentAttributes(selectedComponent.id, updatedProps);
              }}
              componentType={selectedComponent.type}
            />
          ) : (
            <div className="text-sm text-gray-500 italic">No attributes available</div>
          )}
        </div>
        
        <div className="mb-4">
          <h3 className="text-sm font-medium mb-2">Pin Editor</h3>
          
          <VisualPinEditor 
            pins={selectedComponent.pins || []} 
            componentType={selectedComponent.type}
            onChange={(updatedPins) => {
              updateComponentPins(selectedComponent.id, updatedPins);
            }}
            className="border rounded"
          />
        </div>
      </div>
    </ErrorBoundary>
  );
};

/**
 * Legacy wrapper for backward compatibility during refactoring
 * @deprecated Use PropertiesPanel directly
 */
export const ContextPropertiesPanel = PropertiesPanel;

export default PropertiesPanel;
