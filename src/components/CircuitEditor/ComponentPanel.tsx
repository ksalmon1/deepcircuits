
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';

// Define component categories and items
const componentCategories = [
  {
    id: 'basic',
    label: 'Basic',
    components: [
      { id: 'led', name: 'LED', type: 'wokwi-led' },
      { id: 'resistor', name: 'Resistor', type: 'wokwi-resistor' },
      { id: 'capacitor', name: 'Capacitor', type: 'wokwi-capacitor' },
      { id: 'battery', name: 'Battery', type: 'wokwi-battery' }
    ]
  },
  {
    id: 'controllers',
    label: 'Controllers',
    components: [
      { id: 'arduino-uno', name: 'Arduino Uno', type: 'wokwi-arduino-uno' },
      { id: 'esp32', name: 'ESP32', type: 'wokwi-esp32-devkit-v1' }
    ]
  },
  {
    id: 'input',
    label: 'Input',
    components: [
      { id: 'pushbutton', name: 'Push Button', type: 'wokwi-pushbutton' },
      { id: 'slide-switch', name: 'Slide Switch', type: 'wokwi-slide-switch' },
      { id: 'potentiometer', name: 'Potentiometer', type: 'wokwi-potentiometer' }
    ]
  }
];

const ComponentPanel = () => {
  const handleDragStart = (e: React.DragEvent, component: any) => {
    e.dataTransfer.setData('component', JSON.stringify(component));
  };

  return (
    <div className="h-full flex flex-col">
      <h3 className="font-medium mb-3">Components</h3>
      
      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid grid-cols-3 mb-4">
          {componentCategories.map(category => (
            <TabsTrigger key={category.id} value={category.id}>
              {category.label}
            </TabsTrigger>
          ))}
        </TabsList>
        
        {componentCategories.map(category => (
          <TabsContent key={category.id} value={category.id} className="mt-0">
            <div className="grid grid-cols-1 gap-2">
              {category.components.map(component => (
                <Button
                  key={component.id}
                  variant="outline"
                  className="justify-start h-auto py-2 px-3"
                  draggable
                  onDragStart={(e) => handleDragStart(e, component)}
                >
                  <span className="truncate">{component.name}</span>
                </Button>
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default ComponentPanel;
