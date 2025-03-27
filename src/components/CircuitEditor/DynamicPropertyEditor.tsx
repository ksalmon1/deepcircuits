
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash } from 'lucide-react';

export interface PropertyEditorProps {
  properties?: Record<string, any>;
  componentType?: string;
  onChange?: (properties: Record<string, any>) => void;
}

const DynamicPropertyEditor: React.FC<PropertyEditorProps> = ({ 
  properties = {}, 
  onChange,
  componentType 
}) => {
  const [editedProperties, setEditedProperties] = useState<Record<string, any>>(properties);
  const [newPropertyName, setNewPropertyName] = useState<string>('');
  const [newPropertyValue, setNewPropertyValue] = useState<string>('');

  const handlePropertyChange = (key: string, value: string) => {
    const updatedProperties = {
      ...editedProperties,
      [key]: value
    };
    
    setEditedProperties(updatedProperties);
    onChange?.(updatedProperties);
  };

  const handleDeleteProperty = (key: string) => {
    const updatedProperties = { ...editedProperties };
    delete updatedProperties[key];
    
    setEditedProperties(updatedProperties);
    onChange?.(updatedProperties);
  };

  const handleAddProperty = () => {
    if (!newPropertyName.trim()) return;
    
    const updatedProperties = {
      ...editedProperties,
      [newPropertyName]: newPropertyValue
    };
    
    setEditedProperties(updatedProperties);
    onChange?.(updatedProperties);
    setNewPropertyName('');
    setNewPropertyValue('');
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium">Component Properties</h3>
      
      {componentType && (
        <div className="text-xs text-gray-500 mb-4">
          Type: {componentType}
        </div>
      )}
      
      <div className="space-y-3">
        {Object.entries(editedProperties).map(([key, value]) => (
          <div key={key} className="flex items-center gap-2">
            <div className="flex-1">
              <Label className="text-xs">{key}</Label>
              <Input
                value={value}
                onChange={(e) => handlePropertyChange(key, e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleDeleteProperty(key)}
              className="h-8 w-8 mt-4"
            >
              <Trash className="h-4 w-4 text-gray-500" />
            </Button>
          </div>
        ))}
      </div>
      
      <div className="pt-2 border-t">
        <h4 className="text-xs font-medium mb-2">Add New Property</h4>
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <Label className="text-xs">Name</Label>
            <Input
              value={newPropertyName}
              onChange={(e) => setNewPropertyName(e.target.value)}
              placeholder="property"
              className="h-8 text-sm"
            />
          </div>
          <div className="flex-1">
            <Label className="text-xs">Value</Label>
            <Input
              value={newPropertyValue}
              onChange={(e) => setNewPropertyValue(e.target.value)}
              placeholder="value"
              className="h-8 text-sm"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleAddProperty}
            className="h-8"
          >
            <Plus className="h-3 w-3 mr-1" />
            Add
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DynamicPropertyEditor;
