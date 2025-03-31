
import React from 'react';
import { CircuitComponent } from '@/types/component';
import DynamicPropertyEditor from './DynamicPropertyEditor';
import VisualPinEditor from './VisualPinEditor';
import { useCircuitEditor } from '@/context/CircuitEditorContext';

interface PropertiesPanelProps {
  selectedComponent: CircuitComponent | null;
  handleUpdateComponentAttributes: (componentId: string, attributes: Record<string, any>) => void;
}

/**
 * Panel for editing selected component properties
 * This is a transitional component that will eventually use context directly
 */
const PropertiesPanel: React.FC<PropertiesPanelProps> = ({ 
  selectedComponent, 
  handleUpdateComponentAttributes 
}) => {
  // When we fully refactor, we'll get these from context directly
  
  const updateComponentPins = (componentId: string, pins: any[]) => {
    // Create a new component with updated pins
    const updatedComponent = {
      ...selectedComponent,
      pins: pins
    };
    
    // Update the component in the parent
    if (handleUpdateComponentAttributes && componentId) {
      handleUpdateComponentAttributes(componentId, { pins });
    }
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
              if (handleUpdateComponentAttributes && selectedComponent.id) {
                handleUpdateComponentAttributes(selectedComponent.id, updatedProps);
              }
            }} 
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
            if (selectedComponent.id) {
              updateComponentPins(selectedComponent.id, updatedPins);
            }
          }}
          className="border rounded"
        />
      </div>
    </div>
  );
};

/**
 * Context-aware version of PropertiesPanel
 * This will eventually replace the prop-based version
 */
export const ContextPropertiesPanel = () => {
  const { selectedComponent, handleUpdateComponentAttributes } = useCircuitEditor();
  
  return (
    <PropertiesPanel 
      selectedComponent={selectedComponent} 
      handleUpdateComponentAttributes={handleUpdateComponentAttributes} 
    />
  );
};

export default PropertiesPanel;
