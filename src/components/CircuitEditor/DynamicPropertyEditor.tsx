import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { PlusCircle, Trash2 } from 'lucide-react';

export interface PropertyEditorProps {
  properties: Record<string, unknown>;
  onChange: (properties: Record<string, unknown>) => void;
  componentType: string;
}

const DynamicPropertyEditor: React.FC<PropertyEditorProps> = ({ 
  properties, 
  onChange, 
  componentType 
}) => {
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleRemoveProperty = (key: string) => {
    const newProperties = { ...properties };
    delete newProperties[key];
    onChange(newProperties);
  };

  const handlePropertyValueChange = (key: string, value: unknown) => {
    onChange({
      ...properties,
      [key]: value
    });
  };

  const handleAddProperty = () => {
    if (!newKey.trim()) {
      setErrorMessage('Property key cannot be empty');
      return;
    }

    if (properties[newKey] !== undefined) {
      setErrorMessage(`Property "${newKey}" already exists`);
      return;
    }

    onChange({
      ...properties,
      [newKey]: newValue || ''
    });

    setNewKey('');
    setNewValue('');
    setErrorMessage(null);
  };

  const getPropertyEditor = (key: string, value: unknown) => {
    // Special handling for boolean values - show as switch
    if (typeof value === 'boolean') {
      return (
        <Switch 
          checked={value} 
          onCheckedChange={(checked) => handlePropertyValueChange(key, checked)}
        />
      );
    }

    // For LED color property, show a color selector
    if ((key === 'color' || key.includes('color')) && typeof value === 'string') {
      return (
        <div className="flex gap-2 items-center">
          <Input 
            type="text" 
            value={value} 
            onChange={(e) => handlePropertyValueChange(key, e.target.value)}
            className="grow"
          />
          <Input 
            type="color" 
            value={value.startsWith('#') ? value : '#ff0000'} 
            onChange={(e) => handlePropertyValueChange(key, e.target.value)}
            className="w-12 h-8 p-1 cursor-pointer"
          />
        </div>
      );
    }

    // For numeric values
    if (!isNaN(Number(value))) {
      return (
        <Input 
          type="number" 
          value={Number(value)} 
          onChange={(e) => handlePropertyValueChange(key, Number(e.target.value))}
        />
      );
    }

    // Default text input for other types
    return (
      <Input 
        type="text" 
        value={String(value ?? '')} 
        onChange={(e) => handlePropertyValueChange(key, e.target.value)}
      />
    );
  };

  // Get regular properties (excluding animation properties)
  const regularProperties = Object.entries(properties || {})
    .filter(([key]) => key !== 'animatableElements' && key !== 'stateRules');

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Component Properties</h3>
      
      {regularProperties.length === 0 && (
        <div className="text-gray-500 text-sm p-4 border border-dashed border-gray-200 rounded-md bg-gray-50">
          No properties defined. Add properties below.
        </div>
      )}
      
      <div className="space-y-2">
        {regularProperties.map(([key, value]) => (
          <div key={key} className="flex items-center gap-2 p-2 border border-gray-100 rounded bg-gray-50">
            <div className="w-1/3 font-medium">{key}:</div>
            <div className="flex-grow">
              {getPropertyEditor(key, value)}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleRemoveProperty(key)}
              title="Remove property"
            >
              <Trash2 className="h-4 w-4 text-gray-500" />
            </Button>
          </div>
        ))}
      </div>
      
      <Separator className="my-4" />
      
      <div className="space-y-2">
        <h4 className="font-medium">Add New Property</h4>
        <div className="flex gap-2 items-end">
          <div className="space-y-1 flex-1">
            <label className="text-sm text-gray-600">Property Key</label>
            <Input 
              placeholder="e.g. color, value, label" 
              value={newKey}
              onChange={(e) => {
                setNewKey(e.target.value);
                setErrorMessage(null);
              }}
            />
          </div>
          <div className="space-y-1 flex-1">
            <label className="text-sm text-gray-600">Property Value</label>
            <Input 
              placeholder="e.g. red, 100, My Label" 
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
            />
          </div>
          <Button 
            onClick={handleAddProperty}
            className="mb-0.5"
          >
            <PlusCircle className="mr-1 h-4 w-4" /> Add
          </Button>
        </div>
        {errorMessage && (
          <p className="text-sm text-red-500">{errorMessage}</p>
        )}
      </div>
      
      {componentType && (
        <div className="p-3 bg-blue-50 text-blue-800 rounded-md text-sm mt-4">
          <p className="font-medium">Component Type: {componentType}</p>
          <p className="mt-1">Properties will be applied to this component type when rendering.</p>
        </div>
      )}
    </div>
  );
};

export default DynamicPropertyEditor;
