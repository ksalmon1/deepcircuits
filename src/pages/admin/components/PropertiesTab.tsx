import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  FormLabel,
  FormDescription 
} from "@/components/ui/form";
import { ComponentLibraryItem } from '@/services/componentLibraryService';
import { Plus, Trash2 } from 'lucide-react';

interface PropertiesTabProps {
  component: ComponentLibraryItem;
  updateComponentProperties: (properties: Record<string, any>) => void;
}

export const PropertiesTab: React.FC<PropertiesTabProps> = ({ 
  component, 
  updateComponentProperties 
}) => {
  const [newPropertyKey, setNewPropertyKey] = useState('');
  const [newPropertyValue, setNewPropertyValue] = useState('');
  
  // Convert component properties to an array for easier rendering
  const propertiesArray = component.properties 
    ? Object.entries(component.properties).map(([key, value]) => ({ key, value }))
    : [];
  
  const handleAddProperty = () => {
    if (!newPropertyKey.trim()) return;
    
    const updatedProperties = { 
      ...(component.properties || {}),
      [newPropertyKey]: newPropertyValue 
    };
    
    updateComponentProperties(updatedProperties);
    setNewPropertyKey('');
    setNewPropertyValue('');
  };
  
  const handleRemoveProperty = (keyToRemove: string) => {
    const updatedProperties = { ...(component.properties || {}) };
    delete updatedProperties[keyToRemove];
    
    updateComponentProperties(updatedProperties);
  };
  
  const handlePropertyValueChange = (key: string, value: string) => {
    const updatedProperties = { 
      ...(component.properties || {}),
      [key]: value 
    };
    
    updateComponentProperties(updatedProperties);
  };
  
  return (
    <div className="space-y-6">
      <div className="text-sm text-muted-foreground">
        Define custom properties for this component. These will be available in the circuit editor.
      </div>
      
      {/* Existing properties */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium">Current Properties</h3>
        
        {propertiesArray.length === 0 ? (
          <p className="text-sm text-muted-foreground">No properties defined yet.</p>
        ) : (
          <div className="space-y-3">
            {propertiesArray.map(({ key, value }) => (
              <div key={key} className="flex items-center gap-2">
                <div className="w-1/3">
                  <Input 
                    value={key} 
                    disabled 
                    className="bg-muted/50"
                  />
                </div>
                <div className="flex-1">
                  <Input 
                    value={value} 
                    onChange={(e) => handlePropertyValueChange(key, e.target.value)}
                    placeholder="Value"
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveProperty(key)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Add new property */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium">Add Property</h3>
        <div className="flex items-end gap-2">
          <div className="space-y-1 w-1/3">
            <FormLabel htmlFor="property-key" className="text-xs">Property Key</FormLabel>
            <Input 
              id="property-key"
              value={newPropertyKey} 
              onChange={(e) => setNewPropertyKey(e.target.value)}
              placeholder="e.g., color, voltage"
            />
          </div>
          <div className="space-y-1 flex-1">
            <FormLabel htmlFor="property-value" className="text-xs">Default Value</FormLabel>
            <Input 
              id="property-value"
              value={newPropertyValue} 
              onChange={(e) => setNewPropertyValue(e.target.value)}
              placeholder="e.g., red, 5"
            />
          </div>
          <Button
            type="button"
            onClick={handleAddProperty}
            disabled={!newPropertyKey.trim()}
            className="flex-shrink-0"
          >
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        </div>
        <FormDescription>
          Property keys should be unique and descriptive
        </FormDescription>
      </div>
    </div>
  );
};
