
import React, { useState } from 'react';
import { WokwiComponent } from '@/integrations/wokwi/WokwiIntegration';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export interface PropertyEditorProps {
  component: WokwiComponent;
  onUpdateAttributes: (attributes: Record<string, any>) => void;
}

const DynamicPropertyEditor: React.FC<PropertyEditorProps> = ({ component, onUpdateAttributes }) => {
  const [activeTab, setActiveTab] = useState('properties');
  const { attributes = {}, type } = component;

  const handlePropertyChange = (key: string, value: any) => {
    onUpdateAttributes({ ...attributes, [key]: value });
  };

  const renderPropertyEditor = (key: string, value: any) => {
    const propertyType = typeof value;

    switch (propertyType) {
      case 'boolean':
        return (
          <div className="flex items-center space-x-2" key={key}>
            <Switch
              id={`property-${key}`}
              checked={value}
              onCheckedChange={(checked) => handlePropertyChange(key, checked)}
            />
            <Label htmlFor={`property-${key}`}>{key}</Label>
          </div>
        );

      case 'number':
        return (
          <div className="space-y-2" key={key}>
            <div className="flex justify-between">
              <Label htmlFor={`property-${key}`}>{key}</Label>
              <span className="text-xs text-gray-500">{value}</span>
            </div>
            <div className="flex gap-2">
              <Slider
                id={`property-${key}`}
                defaultValue={[value]}
                min={0}
                max={value > 100 ? value * 2 : 100}
                step={1}
                onValueChange={([val]) => handlePropertyChange(key, val)}
              />
              <Input
                type="number"
                value={value}
                onChange={(e) => handlePropertyChange(key, Number(e.target.value))}
                className="w-20"
              />
            </div>
          </div>
        );

      case 'string':
        if (key === 'color' || key.includes('color')) {
          const presetColors = ['red', 'green', 'blue', 'yellow', 'white', 'orange', 'purple'];
          
          return (
            <div className="space-y-2" key={key}>
              <Label htmlFor={`property-${key}`}>{key}</Label>
              <div className="flex flex-wrap gap-2">
                {presetColors.map((color) => (
                  <button
                    key={color}
                    className={`w-6 h-6 rounded-full border ${
                      value === color ? 'ring-2 ring-offset-2 ring-blue-500' : ''
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => handlePropertyChange(key, color)}
                    title={color}
                  />
                ))}
                <input
                  type="color"
                  value={value.startsWith('#') ? value : '#ff0000'}
                  onChange={(e) => handlePropertyChange(key, e.target.value)}
                  className="w-6 h-6"
                />
              </div>
            </div>
          );
        }
        
        return (
          <div className="space-y-2" key={key}>
            <Label htmlFor={`property-${key}`}>{key}</Label>
            <Input
              id={`property-${key}`}
              value={value}
              onChange={(e) => handlePropertyChange(key, e.target.value)}
            />
          </div>
        );

      default:
        return (
          <div className="space-y-2" key={key}>
            <Label htmlFor={`property-${key}`}>{key}</Label>
            <Input
              id={`property-${key}`}
              value={JSON.stringify(value)}
              onChange={(e) => {
                try {
                  handlePropertyChange(key, JSON.parse(e.target.value));
                } catch {
                  handlePropertyChange(key, e.target.value);
                }
              }}
            />
          </div>
        );
    }
  };

  const getComponentProperties = () => {
    if (!attributes || Object.keys(attributes).length === 0) {
      // Return default properties based on component type
      switch (type) {
        case 'wokwi-led':
          return { color: 'red', value: 0, label: '' };
        case 'wokwi-resistor':
          return { value: '1000', tolerance: '5' };
        case 'wokwi-pushbutton':
          return { color: 'green', label: '' };
        case 'wokwi-lcd1602':
          return { text: '', background: '#00FF00' };
        default:
          return {};
      }
    }
    return attributes;
  };

  const properties = getComponentProperties();

  return (
    <div className="space-y-6">
      <div className="p-2 bg-blue-50 border border-blue-100 rounded-md">
        <h3 className="text-sm font-medium text-blue-800">
          {type}
        </h3>
        <p className="text-xs text-blue-600 mt-1">
          Component ID: {component.id}
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="properties">Properties</TabsTrigger>
          <TabsTrigger value="pins">Pins</TabsTrigger>
        </TabsList>

        <TabsContent value="properties" className="space-y-4 pt-4">
          {Object.entries(properties).map(([key, value]) => renderPropertyEditor(key, value))}
        </TabsContent>

        <TabsContent value="pins" className="space-y-4 pt-4">
          {component.pins?.length ? (
            <div className="border rounded-md divide-y">
              {component.pins.map((pin, index) => (
                <div key={index} className="p-2 hover:bg-gray-50">
                  <p className="font-medium text-sm">{pin.name}</p>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Position: ({pin.x}, {pin.y})</span>
                    <span>Signal: {pin.signals?.join(', ') || 'None'}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No pins defined for this component.</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DynamicPropertyEditor;
