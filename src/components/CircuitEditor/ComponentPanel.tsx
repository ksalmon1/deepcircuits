
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Define component categories and items
const componentCategories = [
  {
    id: 'basic',
    label: 'Basic',
    components: [
      { id: 'led', name: 'LED', type: 'wokwi-led', description: 'Light Emitting Diode' },
      { id: 'resistor', name: 'Resistor', type: 'wokwi-resistor', description: 'Limits current flow' },
      { id: 'capacitor', name: 'Capacitor', type: 'wokwi-capacitor', description: 'Stores electrical charge' },
      { id: 'battery', name: 'Battery', type: 'wokwi-battery', description: 'Power source' }
    ]
  },
  {
    id: 'controllers',
    label: 'Controllers',
    components: [
      { id: 'arduino-uno', name: 'Arduino Uno', type: 'wokwi-arduino-uno', description: 'Arduino Uno microcontroller' },
      { id: 'arduino-nano', name: 'Arduino Nano', type: 'wokwi-arduino-nano', description: 'Arduino Nano microcontroller' },
      { id: 'esp32', name: 'ESP32', type: 'wokwi-esp32-devkit-v1', description: 'ESP32 development board' }
    ]
  },
  {
    id: 'input',
    label: 'Input',
    components: [
      { id: 'pushbutton', name: 'Push Button', type: 'wokwi-pushbutton', description: 'Momentary button input' },
      { id: 'slide-switch', name: 'Slide Switch', type: 'wokwi-slide-switch', description: 'On/off toggle switch' },
      { id: 'potentiometer', name: 'Potentiometer', type: 'wokwi-potentiometer', description: 'Variable resistor' },
      { id: 'keypad', name: 'Keypad', type: 'wokwi-membrane-keypad', description: 'Membrane keypad input' },
      { id: 'dht22', name: 'DHT22', type: 'wokwi-dht22', description: 'Temperature & humidity sensor' },
      { id: 'ir-receiver', name: 'IR Receiver', type: 'wokwi-ir-receiver', description: 'Infrared signal receiver' }
    ]
  },
  {
    id: 'output',
    label: 'Output',
    components: [
      { id: '7segment', name: '7-Segment Display', type: 'wokwi-7segment', description: 'Seven-segment LED display' },
      { id: 'buzzer', name: 'Buzzer', type: 'wokwi-buzzer', description: 'Piezo buzzer/speaker' },
      { id: 'servo', name: 'Servo Motor', type: 'wokwi-servo', description: 'Servo motor for precise control' },
      { id: 'stepper', name: 'Stepper Motor', type: 'wokwi-stepper-motor', description: 'Stepper motor for precise positioning' },
      { id: 'lcd1602', name: 'LCD 16x2', type: 'wokwi-lcd1602', description: '16x2 character LCD display' },
      { id: 'ir-remote', name: 'IR Remote', type: 'wokwi-ir-remote', description: 'Infrared remote control' },
      { id: 'relay', name: 'Relay', type: 'wokwi-relay', description: 'Electronically controlled switch' }
    ]
  },
  {
    id: 'tools',
    label: 'Tools',
    components: [
      { id: 'logic-analyzer', name: 'Logic Analyzer', type: 'wokwi-logic-analyzer', description: 'Digital signal analyzer' }
    ]
  }
];

const ComponentPanel = () => {
  const handleDragStart = (e: React.DragEvent, component: any) => {
    e.dataTransfer.setData('component', JSON.stringify(component));
    // Set a drag image (optional enhancement for later)
    // const img = new Image();
    // img.src = `path-to-component-icons/${component.id}.svg`;
    // e.dataTransfer.setDragImage(img, 0, 0);
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
                <TooltipProvider key={component.id}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        className="justify-start h-auto py-2 px-3 cursor-grab"
                        draggable
                        onDragStart={(e) => handleDragStart(e, component)}
                      >
                        <span className="truncate">{component.name}</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{component.description}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>
      
      <div className="mt-auto p-2 text-xs text-gray-500 border-t">
        Drag components to the canvas to build your circuit
      </div>
    </div>
  );
};

export default ComponentPanel;
