
import React from 'react';
import DynamicPropertyEditor from './DynamicPropertyEditor';

interface PropertiesPanelProps {
  selectedComponent: any | null;
  handleUpdateComponentAttributes: (componentId: string, attributes: Record<string, any>) => void;
}

const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  selectedComponent,
  handleUpdateComponentAttributes
}) => {
  if (!selectedComponent) {
    return (
      <div className="text-center text-gray-500 mt-8">
        Select a component to edit its properties
      </div>
    );
  }

  return (
    <DynamicPropertyEditor
      properties={selectedComponent.attributes || {}}
      onChange={(attributes) => 
        handleUpdateComponentAttributes(selectedComponent.id, attributes)
      }
      componentType={selectedComponent.type}
    />
  );
};

export default PropertiesPanel;
