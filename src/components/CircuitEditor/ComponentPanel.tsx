
import React from 'react';
import { WokwiComponent } from '@/integrations/wokwi/WokwiIntegration';

interface ComponentPanelProps {
  onComponentSelect: (component: WokwiComponent) => void;
}

const ComponentPanel: React.FC<ComponentPanelProps> = ({ onComponentSelect }) => {
  const componentCategories = [
    {
      name: 'Microcontrollers',
      components: [
        { type: 'wokwi-arduino-uno', name: 'Arduino Uno' },
        { type: 'wokwi-arduino-nano', name: 'Arduino Nano' },
        { type: 'wokwi-esp32-devkit-v1', name: 'ESP32 DevKit' },
        { type: 'wokwi-raspberry-pi-pico', name: 'Raspberry Pi Pico' },
      ]
    },
    {
      name: 'Basic Components',
      components: [
        { type: 'wokwi-led', name: 'LED' },
        { type: 'wokwi-resistor', name: 'Resistor' },
        { type: 'wokwi-capacitor', name: 'Capacitor' },
        { type: 'wokwi-pushbutton', name: 'Button' },
        { type: 'wokwi-switch', name: 'Switch' },
      ]
    },
    {
      name: 'Displays',
      components: [
        { type: 'wokwi-lcd1602', name: 'LCD 16x2' },
        { type: 'wokwi-7segment', name: '7-Segment Display' },
      ]
    },
    {
      name: 'Sensors',
      components: [
        { type: 'wokwi-dht22', name: 'DHT22 Sensor' },
        { type: 'wokwi-photoresistor-sensor', name: 'Light Sensor' },
      ]
    },
  ];

  const handleDragStart = (e: React.DragEvent, component: any) => {
    e.dataTransfer.setData('component', JSON.stringify(component));
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div className="h-full overflow-auto p-2">
      <h2 className="text-lg font-semibold mb-4">Components</h2>
      
      {componentCategories.map((category) => (
        <div key={category.name} className="mb-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">{category.name}</h3>
          <div className="grid grid-cols-1 gap-2">
            {category.components.map((component) => (
              <div
                key={component.type}
                className="bg-white border rounded p-2 cursor-grab hover:bg-blue-50 hover:border-blue-300 transition-colors"
                draggable
                onDragStart={(e) => handleDragStart(e, component)}
              >
                <div className="text-sm font-medium">{component.name}</div>
                <div className="text-xs text-gray-500">{component.type}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ComponentPanel;
