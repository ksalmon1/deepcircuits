
import React, { useState } from 'react';
import { Trash2, Plus, Save } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PropertyEditorProps {
  properties: Record<string, any>;
  componentType: string;
  onChange: (properties: Record<string, any>) => void;
}

// Fixed structure - each component type has properties, each property has type and options
const COMMON_PROPERTIES: Record<string, Record<string, { type: string, options?: string[] }>> = {
  'wokwi-led': {
    color: { type: 'select', options: ['red', 'green', 'blue', 'yellow', 'orange', 'white'] },
    brightness: { type: 'number' },
    label: { type: 'text' }
  },
  'wokwi-resistor': {
    resistance: { type: 'text' },
    tolerance: { type: 'text' },
    bands: { type: 'number' }
  },
  'wokwi-capacitor': {
    capacitance: { type: 'text' }
  },
  'wokwi-pushbutton': {
    color: { type: 'select', options: ['red', 'green', 'blue', 'yellow', 'black'] },
    label: { type: 'text' }
  },
  'wokwi-servo': {
    horn: { type: 'select', options: ['single', 'double', 'cross', 'none'] },
    angle: { type: 'number' }
  }
};

const DynamicPropertyEditor: React.FC<PropertyEditorProps> = ({ 
  properties, 
  componentType, 
  onChange 
}) => {
  const [newPropName, setNewPropName] = useState('');
  const [newPropValue, setNewPropValue] = useState('');
  
  const getPropertyType = (key: string): string => {
    const commonProps = COMMON_PROPERTIES[componentType] || {};
    return commonProps[key]?.type || 
           (typeof properties[key] === 'number' ? 'number' : 'text');
  };
  
  const getPropertyOptions = (key: string): string[] | undefined => {
    const commonProps = COMMON_PROPERTIES[componentType] || {};
    return commonProps[key]?.options;
  };
  
  const handlePropertyChange = (key: string, value: any) => {
    const updatedProps = { ...properties };
    
    // Convert to number if the field type is number
    if (getPropertyType(key) === 'number') {
      updatedProps[key] = isNaN(Number(value)) ? 0 : Number(value);
    } else {
      updatedProps[key] = value;
    }
    
    onChange(updatedProps);
  };
  
  const handleRemoveProperty = (key: string) => {
    const updatedProps = { ...properties };
    delete updatedProps[key];
    onChange(updatedProps);
  };
  
  const handleAddProperty = () => {
    if (!newPropName.trim()) return;
    
    // Avoid duplicate property names
    if (properties[newPropName]) {
      return;
    }
    
    const updatedProps = { 
      ...properties,
      [newPropName]: newPropValue
    };
    
    onChange(updatedProps);
    setNewPropName('');
    setNewPropValue('');
  };
  
  const renderPropertyInput = (key: string, value: any) => {
    const type = getPropertyType(key);
    const options = getPropertyOptions(key);
    
    if (type === 'select' && options) {
      return (
        <Select
          value={String(value)}
          onValueChange={(val) => handlePropertyChange(key, val)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select value" />
          </SelectTrigger>
          <SelectContent>
            {options.map(option => (
              <SelectItem key={option} value={option}>
                {option.charAt(0).toUpperCase() + option.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }
    
    return (
      <Input
        type={type}
        value={value}
        onChange={(e) => handlePropertyChange(key, e.target.value)}
      />
    );
  };
  
  // Suggest properties based on component type
  const suggestedProperties = () => {
    const commonProps = COMMON_PROPERTIES[componentType] || {};
    const existingKeys = Object.keys(properties);
    
    return Object.keys(commonProps)
      .filter(key => !existingKeys.includes(key))
      .map(key => (
        <Button 
          key={key}
          variant="outline"
          size="sm"
          className="text-xs"
          onClick={() => {
            setNewPropName(key);
            setNewPropValue('');
          }}
        >
          {key}
        </Button>
      ));
  };
  
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Component Properties</h3>
      
      <div className="space-y-3">
        {Object.entries(properties).map(([key, value]) => (
          <div key={key} className="flex items-center gap-3">
            <div className="w-1/3">
              <span className="font-medium text-sm">{key}:</span>
            </div>
            <div className="flex-1">
              {renderPropertyInput(key, value)}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleRemoveProperty(key)}
              className="text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
      
      <div className="border-t pt-3">
        <div className="text-sm font-medium mb-2">Add New Property</div>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Property name"
            value={newPropName}
            onChange={(e) => setNewPropName(e.target.value)}
            className="flex-1"
          />
          <Input
            placeholder="Default value"
            value={newPropValue}
            onChange={(e) => setNewPropValue(e.target.value)}
            className="flex-1"
          />
          <Button
            onClick={handleAddProperty}
            disabled={!newPropName.trim()}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        
        {suggestedProperties().length > 0 && (
          <div className="mt-2">
            <div className="text-xs text-muted-foreground mb-1">Suggested properties:</div>
            <div className="flex flex-wrap gap-2">
              {suggestedProperties()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DynamicPropertyEditor;
