
import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { WokwiComponent } from '@/integrations/wokwi/WokwiIntegration';

interface PropertyEditorProps {
  component: WokwiComponent;
  onUpdateAttributes: (attributes: Record<string, any>) => void;
}

const DynamicPropertyEditor: React.FC<PropertyEditorProps> = ({ 
  component, 
  onUpdateAttributes 
}) => {
  const [localAttributes, setLocalAttributes] = useState<Record<string, any>>({});
  
  useEffect(() => {
    if (component && component.attributes) {
      setLocalAttributes({ ...component.attributes });
    } else {
      setLocalAttributes({});
    }
  }, [component]);
  
  const handlePropertyChange = (key: string, value: any) => {
    setLocalAttributes(prev => ({
      ...prev,
      [key]: value
    }));
  };
  
  const handleApplyChanges = () => {
    onUpdateAttributes(localAttributes);
  };
  
  // Get the appropriate input type based on the attribute type
  const getInputForProperty = (key: string, value: any) => {
    // Boolean values use a switch
    if (typeof value === 'boolean') {
      return (
        <div className="flex items-center space-x-2" key={key}>
          <Switch
            id={`property-${key}`}
            checked={localAttributes[key] || false}
            onCheckedChange={(checked) => handlePropertyChange(key, checked)}
          />
          <Label htmlFor={`property-${key}`}>{key}</Label>
        </div>
      );
    }
    
    // Number values use a number input
    if (typeof value === 'number') {
      return (
        <div className="space-y-1" key={key}>
          <Label htmlFor={`property-${key}`}>{key}</Label>
          <Input
            id={`property-${key}`}
            type="number"
            value={localAttributes[key] || 0}
            onChange={(e) => handlePropertyChange(key, parseFloat(e.target.value))}
          />
        </div>
      );
    }
    
    // Everything else uses a text input
    return (
      <div className="space-y-1" key={key}>
        <Label htmlFor={`property-${key}`}>{key}</Label>
        <Input
          id={`property-${key}`}
          value={localAttributes[key] || ''}
          onChange={(e) => handlePropertyChange(key, e.target.value)}
        />
      </div>
    );
  };
  
  if (!component) {
    return (
      <div className="text-center text-gray-500 mt-8">
        No component selected
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <div className="p-2 bg-gray-100 rounded">
        <p className="font-medium">{component.type}</p>
        <p className="text-xs text-gray-500">ID: {component.id}</p>
      </div>
      
      <div className="space-y-4">
        <h3 className="text-sm font-medium">Properties</h3>
        {Object.keys(localAttributes).length === 0 ? (
          <p className="text-sm text-gray-500">No editable properties</p>
        ) : (
          Object.entries(localAttributes).map(([key, value]) => 
            getInputForProperty(key, value)
          )
        )}
      </div>
      
      <Button 
        onClick={handleApplyChanges}
        disabled={Object.keys(localAttributes).length === 0}
      >
        Apply Changes
      </Button>
    </div>
  );
};

export default DynamicPropertyEditor;
