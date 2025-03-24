
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
      { id: 'bicolor-led', name: 'Bicolor LED', type: 'wokwi-bicolor-led', description: 'Two-color LED' },
      { id: 'rgb-led', name: 'RGB LED', type: 'wokwi-rgb-led', description: 'Red-Green-Blue LED' },
      { id: 'neopixel', name: 'NeoPixel', type: 'wokwi-neopixel', description: 'RGB LED with integrated controller' },
      { id: 'resistor', name: 'Resistor', type: 'wokwi-resistor', description: 'Limits current flow' },
      { id: 'capacitor', name: 'Capacitor', type: 'wokwi-capacitor', description: 'Stores electrical charge' },
      { id: 'crystal', name: 'Crystal', type: 'wokwi-crystal', description: 'Quartz crystal oscillator' },
      { id: 'battery', name: 'Battery', type: 'wokwi-battery', description: 'Power source' },
      { id: 'voltage-source', name: 'Voltage Source', type: 'wokwi-voltage-source', description: 'Programmable voltage source' },
      { id: 'breadboard', name: 'Breadboard', type: 'wokwi-breadboard', description: 'Solderless prototyping board' }
    ]
  },
  {
    id: 'controllers',
    label: 'Controllers',
    components: [
      { id: 'arduino-uno', name: 'Arduino Uno', type: 'wokwi-arduino-uno', description: 'Arduino Uno microcontroller' },
      { id: 'arduino-nano', name: 'Arduino Nano', type: 'wokwi-arduino-nano', description: 'Arduino Nano microcontroller' },
      { id: 'arduino-mega', name: 'Arduino Mega', type: 'wokwi-arduino-mega', description: 'Arduino Mega 2560 microcontroller' },
      { id: 'arduino-leonardo', name: 'Arduino Leonardo', type: 'wokwi-arduino-leonardo', description: 'Arduino Leonardo microcontroller' },
      { id: 'arduino-micro', name: 'Arduino Micro', type: 'wokwi-arduino-micro', description: 'Arduino Micro microcontroller' },
      { id: 'esp32', name: 'ESP32', type: 'wokwi-esp32-devkit-v1', description: 'ESP32 development board' },
      { id: 'raspberry-pico', name: 'Raspberry Pi Pico', type: 'wokwi-raspberrypi-pico', description: 'Raspberry Pi Pico microcontroller' }
    ]
  },
  {
    id: 'input',
    label: 'Input',
    components: [
      { id: 'pushbutton', name: 'Push Button', type: 'wokwi-pushbutton', description: 'Momentary button input' },
      { id: 'slide-switch', name: 'Slide Switch', type: 'wokwi-slide-switch', description: 'On/off toggle switch' },
      { id: 'potentiometer', name: 'Potentiometer', type: 'wokwi-potentiometer', description: 'Variable resistor' },
      { id: 'slide-potentiometer', name: 'Slide Potentiometer', type: 'wokwi-slide-potentiometer', description: 'Linear variable resistor' },
      { id: 'keypad', name: 'Keypad', type: 'wokwi-membrane-keypad', description: 'Membrane keypad input' },
      { id: 'dht22', name: 'DHT22', type: 'wokwi-dht22', description: 'Temperature & humidity sensor' },
      { id: 'ir-receiver', name: 'IR Receiver', type: 'wokwi-ir-receiver', description: 'Infrared signal receiver' },
      { id: 'microphone', name: 'Microphone', type: 'wokwi-microphone', description: 'Sound detector module' },
      { id: 'photoresistor', name: 'Photoresistor', type: 'wokwi-photoresistor-sensor', description: 'Light-dependent resistor' },
      { id: 'pir-sensor', name: 'PIR Sensor', type: 'wokwi-pir-motion-sensor', description: 'Passive infrared motion detector' },
      { id: 'rotary-encoder', name: 'Rotary Encoder', type: 'wokwi-ky-040', description: 'Rotational input device' },
      { id: 'rotary-dialer', name: 'Rotary Dialer', type: 'wokwi-rotary-dialer', description: 'Retro telephone rotary dial' },
      { id: 'analog-joystick', name: 'Analog Joystick', type: 'wokwi-analog-joystick', description: 'Two-axis joystick control' },
      { id: 'tilt-sensor', name: 'Tilt Sensor', type: 'wokwi-tilt-sensor', description: 'Detects orientation changes' },
      { id: 'ultrasonic', name: 'Ultrasonic Sensor', type: 'wokwi-ultrasonic-distance-sensor', description: 'Distance measurement sensor' },
      { id: 'mpu6050', name: 'MPU6050', type: 'wokwi-mpu6050', description: 'Accelerometer and gyroscope' }
    ]
  },
  {
    id: 'output',
    label: 'Output',
    components: [
      { id: '7segment', name: '7-Segment Display', type: 'wokwi-7segment', description: 'Seven-segment LED display' },
      { id: 'led-bar', name: 'LED Bar Graph', type: 'wokwi-led-bar-graph', description: 'Bar of 10 LEDs for level display' },
      { id: 'led-matrix', name: 'LED Matrix', type: 'wokwi-led-matrix', description: '8×8 LED matrix' },
      { id: 'max7219', name: 'MAX7219 Matrix', type: 'wokwi-max7219-matrix', description: 'Matrix display with MAX7219 driver' },
      { id: 'buzzer', name: 'Buzzer', type: 'wokwi-buzzer', description: 'Piezo buzzer/speaker' },
      { id: 'piezo', name: 'Piezo Element', type: 'wokwi-piezo', description: 'Piezoelectric element' },
      { id: 'servo', name: 'Servo Motor', type: 'wokwi-servo', description: 'Servo motor for precise control' },
      { id: 'stepper', name: 'Stepper Motor', type: 'wokwi-stepper-motor', description: 'Stepper motor for precise positioning' },
      { id: 'lcd1602', name: 'LCD 16x2', type: 'wokwi-lcd1602', description: '16x2 character LCD display' },
      { id: 'lcd2004', name: 'LCD 20x4', type: 'wokwi-lcd2004', description: '20x4 character LCD display' },
      { id: 'text-lcd1602', name: 'Text LCD 16x2', type: 'wokwi-text-lcd1602', description: 'Simple 16x2 LCD display' },
      { id: 'ir-remote', name: 'IR Remote', type: 'wokwi-ir-remote', description: 'Infrared remote control' },
      { id: 'relay', name: 'Relay', type: 'wokwi-relay', description: 'Electronically controlled switch' },
      { id: 'ssd1306', name: 'SSD1306 OLED', type: 'wokwi-ssd1306', description: '128x64 OLED display' }
    ]
  },
  {
    id: 'tools',
    label: 'Tools',
    components: [
      { id: 'logic-analyzer', name: 'Logic Analyzer', type: 'wokwi-logic-analyzer', description: 'Digital signal analyzer' },
      { id: 'clock-generator', name: 'Clock Generator', type: 'wokwi-clock-generator', description: 'Digital clock signal generator' },
      { id: 'sd-card', name: 'SD Card', type: 'wokwi-sd-card', description: 'SD memory card' },
      { id: 'hc-sr04', name: 'HC-SR04', type: 'wokwi-hc-sr04', description: 'Ultrasonic distance sensor module' }
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
