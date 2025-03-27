
import React, { useState, useEffect } from 'react';
import { WokwiComponent } from '@/integrations/wokwi/WokwiIntegration';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

export interface PropertyEditorProps {
  component: WokwiComponent;
  onUpdateAttributes: (attributes: Record<string, any>) => void;
}

// Define known property configurations for different component types
const componentPropertyConfig: Record<string, any> = {
  'wokwi-led': {
    color: { type: 'color', label: 'Color', defaultValue: 'red' },
    label: { type: 'text', label: 'Label', defaultValue: '' },
    value: { type: 'range', label: 'Brightness', min: 0, max: 1, step: 0.1, defaultValue: 1 }
  },
  'wokwi-resistor': {
    value: { type: 'text', label: 'Resistance', defaultValue: '1000' },
    bands: { type: 'select', label: 'Bands', options: [4, 5, 6], defaultValue: 4 }
  },
  'wokwi-pushbutton': {
    color: { type: 'color', label: 'Color', defaultValue: 'red' },
    label: { type: 'text', label: 'Label', defaultValue: '' }
  },
  'wokwi-arduino-uno': {
    // Arduino-specific properties
  },
  // Add more component configurations as needed
};

// Default properties for any component without specific config
const defaultProperties = {
  label: { type: 'text', label: 'Label', defaultValue: '' }
};

const DynamicPropertyEditor: React.FC<PropertyEditorProps> = ({ 
  component,
  onUpdateAttributes 
}) => {
  const [attributes, setAttributes] = useState<Record<string, any>>(component.attributes || {});
  
  // Get appropriate property configuration based on component type
  const getPropertyConfig = () => {
    if (componentPropertyConfig[component.type]) {
      return componentPropertyConfig[component.type];
    }
    return defaultProperties;
  };
  
  // Update local attributes state when component changes
  useEffect(() => {
    setAttributes(component.attributes || {});
  }, [component]);
  
  const handleChange = (key: string, value: any) => {
    setAttributes(prev => ({
      ...prev,
      [key]: value
    }));
  };
  
  const handleSave = () => {
    onUpdateAttributes(attributes);
    toast.success('Component properties updated');
  };
  
  const renderPropertyEditor = (key: string, config: any) => {
    const value = attributes[key] !== undefined ? attributes[key] : config.defaultValue;
    
    switch (config.type) {
      case 'text':
        return (
          <Input
            id={`prop-${key}`}
            value={value || ''}
            onChange={(e) => handleChange(key, e.target.value)}
          />
        );
        
      case 'number':
        return (
          <Input
            id={`prop-${key}`}
            type="number"
            value={value || config.defaultValue}
            min={config.min}
            max={config.max}
            step={config.step}
            onChange={(e) => handleChange(key, parseFloat(e.target.value))}
          />
        );
        
      case 'range':
        return (
          <Input
            id={`prop-${key}`}
            type="range"
            value={value || config.defaultValue}
            min={config.min}
            max={config.max}
            step={config.step}
            onChange={(e) => handleChange(key, parseFloat(e.target.value))}
          />
        );
        
      case 'color':
        return (
          <div className="flex items-center gap-2">
            <Input
              id={`prop-${key}`}
              type="color"
              className="w-12 h-8"
              value={value || config.defaultValue}
              onChange={(e) => handleChange(key, e.target.value)}
            />
            <Input
              value={value || config.defaultValue}
              onChange={(e) => handleChange(key, e.target.value)}
            />
          </div>
        );
        
      case 'select':
        return (
          <Select
            value={String(value || config.defaultValue)}
            onValueChange={(val) => handleChange(key, val)}
          >
            <SelectTrigger id={`prop-${key}`}>
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              {config.options.map((option: any) => (
                <SelectItem key={option} value={String(option)}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
        
      default:
        return (
          <Input
            id={`prop-${key}`}
            value={value || ''}
            onChange={(e) => handleChange(key, e.target.value)}
          />
        );
    }
  };
  
  const propertyConfig = getPropertyConfig();
  
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Component Properties</h3>
        <p className="text-sm text-gray-500">{component.type}</p>
      </div>
      
      <Separator />
      
      {Object.keys(propertyConfig).length > 0 ? (
        <div className="space-y-4">
          {Object.entries(propertyConfig).map(([key, config]: [string, any]) => (
            <div key={key} className="grid gap-2">
              <Label htmlFor={`prop-${key}`}>{config.label}</Label>
              {renderPropertyEditor(key, config)}
            </div>
          ))}
          
          <Button onClick={handleSave} className="w-full">
            Apply Changes
          </Button>
        </div>
      ) : (
        <div className="py-4 text-center text-gray-500">
          No editable properties available for this component.
        </div>
      )}
      
      <Separator />
      
      <div>
        <h4 className="text-sm font-medium mb-2">Component ID</h4>
        <code className="text-xs bg-gray-100 p-1 rounded">{component.id}</code>
      </div>
    </div>
  );
};

export default DynamicPropertyEditor;
