
import React from 'react';
import { CircuitComponent } from '@/types/component';

export interface PropertiesPanelProps {
  selectedComponent: CircuitComponent | null;
  handleUpdateComponentAttributes: (componentId: string, attributes: Record<string, any>) => void;
}

const PropertiesPanel: React.FC<PropertiesPanelProps> = ({ 
  selectedComponent, 
  handleUpdateComponentAttributes 
}) => {
  if (!selectedComponent) {
    return (
      <div className="p-4 text-center text-gray-500">
        Select a component to view its properties
      </div>
    );
  }

  const handleInputChange = (key: string, value: any) => {
    if (selectedComponent.id) {
      handleUpdateComponentAttributes(selectedComponent.id, { [key]: value });
    }
  };

  return (
    <div className="p-4">
      <h3 className="text-lg font-semibold mb-4">Properties</h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Type
          </label>
          <div className="px-3 py-2 bg-gray-100 rounded">
            {selectedComponent.type}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            ID
          </label>
          <div className="px-3 py-2 bg-gray-100 rounded">
            {selectedComponent.id}
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Position
          </label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-500">X</label>
              <input 
                type="number" 
                value={selectedComponent.left}
                onChange={(e) => handleInputChange('left', parseInt(e.target.value))}
                className="w-full px-3 py-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500">Y</label>
              <input 
                type="number" 
                value={selectedComponent.top}
                onChange={(e) => handleInputChange('top', parseInt(e.target.value))}
                className="w-full px-3 py-2 border rounded"
              />
            </div>
          </div>
        </div>

        {/* Component-specific attributes */}
        {selectedComponent.attributes && Object.entries(selectedComponent.attributes).map(([key, value]) => (
          <div key={key}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {key.charAt(0).toUpperCase() + key.slice(1)}
            </label>
            {typeof value === 'boolean' ? (
              <input
                type="checkbox"
                checked={value}
                onChange={(e) => handleInputChange(key, e.target.checked)}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded"
              />
            ) : typeof value === 'number' ? (
              <input
                type="number"
                value={value}
                onChange={(e) => handleInputChange(key, parseFloat(e.target.value))}
                className="w-full px-3 py-2 border rounded"
              />
            ) : (
              <input
                type="text"
                value={value as string}
                onChange={(e) => handleInputChange(key, e.target.value)}
                className="w-full px-3 py-2 border rounded"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default PropertiesPanel;
