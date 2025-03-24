
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ORIGINAL_WOKWI_COMPONENTS } from '@/integrations/wokwi/WokwiIntegration';
import { Input } from '@/components/ui/input';
import { 
  Search, 
  ChevronDown, 
  ChevronRight, 
  Cpu, 
  Lightbulb, 
  Workflow, 
  Monitor, 
  Gauge, 
  AppWindow,
  History,
  SlidersHorizontal
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';

// Define component categories and items with icon mapping
const componentCategories = [
  {
    id: 'basic',
    label: 'Basic Components',
    icon: <Workflow className="h-4 w-4 mr-2" />,
    components: [
      { id: 'led', name: 'LED', type: 'wokwi-led', description: 'Light Emitting Diode' },
      { id: 'resistor', name: 'Resistor', type: 'wokwi-resistor', description: 'Limits current flow' },
      { id: 'capacitor', name: 'Capacitor', type: 'wokwi-capacitor', description: 'Stores electrical charge' },
      { id: 'battery', name: 'Battery', type: 'wokwi-battery', description: 'Power source' },
      { id: 'rgb-led', name: 'RGB LED', type: 'wokwi-rgb-led', description: 'Multicolor LED' },
      { id: 'breadboard', name: 'Breadboard', type: 'wokwi-breadboard', description: 'Connects components without soldering' }
    ]
  },
  {
    id: 'controllers',
    label: 'Microcontrollers',
    icon: <Cpu className="h-4 w-4 mr-2" />,
    components: [
      { id: 'arduino-uno', name: 'Arduino Uno', type: 'wokwi-arduino-uno', description: 'Arduino Uno microcontroller' },
      { id: 'arduino-nano', name: 'Arduino Nano', type: 'wokwi-arduino-nano', description: 'Arduino Nano microcontroller' },
      { id: 'arduino-mega', name: 'Arduino Mega', type: 'wokwi-arduino-mega', description: 'Arduino Mega microcontroller' },
      { id: 'esp32', name: 'ESP32', type: 'wokwi-esp32-devkit-v1', description: 'ESP32 development board' },
      { id: 'raspberry-pi-pico', name: 'Raspberry Pi Pico', type: 'wokwi-raspberry-pi-pico', description: 'Raspberry Pi Pico microcontroller' },
      { id: 'microbit', name: 'Micro:bit', type: 'wokwi-microbit', description: 'BBC Micro:bit board' },
      { id: 'arduino-nano-33', name: 'Arduino Nano 33 BLE', type: 'wokwi-arduino-nano-33-ble-sense', description: 'Arduino Nano 33 BLE Sense' },
      { id: 'attiny85', name: 'ATtiny85', type: 'wokwi-attiny85', description: 'ATtiny85 microcontroller' }
    ]
  },
  {
    id: 'input',
    label: 'Input Devices',
    icon: <SlidersHorizontal className="h-4 w-4 mr-2" />,
    components: [
      { id: 'pushbutton', name: 'Push Button', type: 'wokwi-pushbutton', description: 'Momentary button input' },
      { id: 'slide-switch', name: 'Slide Switch', type: 'wokwi-slide-switch', description: 'On/off toggle switch' },
      { id: 'potentiometer', name: 'Potentiometer', type: 'wokwi-potentiometer', description: 'Variable resistor' },
      { id: 'potentiometer-slide', name: 'Slide Potentiometer', type: 'wokwi-potentiometer-slide', description: 'Slide variable resistor' },
      { id: 'keypad', name: 'Keypad', type: 'wokwi-keypad', description: 'Numeric keypad input' },
      { id: 'membrane-keypad', name: 'Membrane Keypad', type: 'wokwi-membrane-keypad', description: 'Membrane keypad matrix' },
      { id: 'photoresistor', name: 'Photoresistor', type: 'wokwi-photoresistor-sensor', description: 'Light-sensitive resistor' },
      { id: 'joystick', name: 'Analog Joystick', type: 'wokwi-analog-joystick', description: 'Dual-axis control stick' },
      { id: 'pir-sensor', name: 'PIR Motion Sensor', type: 'wokwi-pir-motion-sensor', description: 'Passive infrared motion detector' },
      { id: 'touch-button', name: 'Touch Button', type: 'wokwi-ttp223', description: 'Capacitive touch sensor' },
      { id: 'fsr', name: 'Force Sensor', type: 'wokwi-fsr', description: 'Force Sensitive Resistor' }
    ]
  },
  {
    id: 'output',
    label: 'Output Devices',
    icon: <Lightbulb className="h-4 w-4 mr-2" />,
    components: [
      { id: 'buzzer', name: 'Buzzer', type: 'wokwi-buzzer', description: 'Active piezo buzzer' },
      { id: 'buzzer-passive', name: 'Passive Buzzer', type: 'wokwi-buzzer-passive', description: 'Passive piezo buzzer' },
      { id: 'servo', name: 'Servo', type: 'wokwi-servo', description: 'Standard servo motor' },
      { id: 'servo-sg90', name: 'Servo SG90', type: 'wokwi-servo-sg90', description: 'SG90 micro servo motor' },
      { id: 'stepper-motor', name: 'Stepper Motor', type: 'wokwi-stepper-motor', description: 'Stepper motor' },
      { id: 'relay', name: 'Relay', type: 'wokwi-relay', description: 'Electromagnetic switch' },
      { id: 'neopixel', name: 'NeoPixel', type: 'wokwi-neopixel', description: 'Addressable RGB LED' },
      { id: 'led-bar', name: 'LED Bar Graph', type: 'wokwi-led-bar-graph', description: 'Linear LED array' },
      { id: 'led-matrix', name: 'LED Matrix', type: 'wokwi-led-matrix', description: 'LED dot matrix display' },
      { id: 'led-ring', name: 'LED Ring', type: 'wokwi-led-ring', description: 'Circular LED array' },
      { id: '7segment', name: '7-Segment Display', type: 'wokwi-7segment', description: 'Seven-segment display' },
      { id: 'piezo', name: 'Piezo Element', type: 'wokwi-piezo', description: 'Piezoelectric element' }
    ]
  },
  {
    id: 'displays',
    label: 'Display Modules',
    icon: <Monitor className="h-4 w-4 mr-2" />,
    components: [
      { id: 'lcd1602', name: 'LCD 16x2', type: 'wokwi-lcd1602', description: '16x2 character LCD display' },
      { id: 'lcd-pcf8574', name: 'LCD 16x2 I2C', type: 'wokwi-2x16-lcd-pcf8574', description: '16x2 LCD with I2C adapter' },
      { id: 'ssd1306', name: 'OLED Display', type: 'wokwi-ssd1306', description: 'SSD1306 OLED display' },
      { id: 'max7219', name: 'MAX7219 Matrix', type: 'wokwi-max7219-matrix', description: 'MAX7219 LED matrix display' },
      { id: 'ili9341', name: 'ILI9341 LCD', type: 'wokwi-ili9341', description: 'ILI9341 color LCD display' },
      { id: 'st7789', name: 'ST7789 LCD', type: 'wokwi-st7789', description: 'ST7789 color LCD display' },
      { id: 'ssd1351', name: 'SSD1351 OLED', type: 'wokwi-ssd1351', description: 'SSD1351 color OLED display' },
      { id: 'display-spi', name: 'SPI Display', type: 'wokwi-display-spi', description: 'Generic SPI display' },
      { id: 'oled-spi', name: 'SPI OLED', type: 'wokwi-oled-spi', description: 'Generic SPI OLED display' },
      { id: 'braille-display', name: 'Braille Display', type: 'wokwi-braille-display', description: 'Refreshable Braille display' }
    ]
  },
  {
    id: 'sensors',
    label: 'Sensors',
    icon: <Gauge className="h-4 w-4 mr-2" />,
    components: [
      { id: 'temperature', name: 'Temperature Sensor', type: 'wokwi-temperature-sensor', description: 'Analog temperature sensor' },
      { id: 'dht22', name: 'DHT22', type: 'wokwi-dht22', description: 'Temperature and humidity sensor' },
      { id: 'bme280', name: 'BME280', type: 'wokwi-bme280', description: 'Environmental sensor (temp, pressure, humidity)' },
      { id: 'ds18b20', name: 'DS18B20', type: 'wokwi-ds18b20', description: 'Digital temperature sensor' },
      { id: 'ultrasonic', name: 'Ultrasonic Sensor', type: 'wokwi-ultrasonic-distance-sensor', description: 'Distance measurement sensor' },
      { id: 'hc-sr04', name: 'HC-SR04', type: 'wokwi-hc-sr04', description: 'Ultrasonic distance sensor' },
      { id: 'hall-effect', name: 'Hall Effect Sensor', type: 'wokwi-hall-effect-sensor', description: 'Magnetic field sensor' },
      { id: 'gas-sensor', name: 'Gas Sensor', type: 'wokwi-gas-sensor', description: 'Analog gas sensor' },
      { id: 'mpu6050', name: 'MPU6050', type: 'wokwi-mpu6050', description: 'Accelerometer and gyroscope sensor' }
    ]
  },
  {
    id: 'ics',
    label: 'ICs & Chips',
    icon: <AppWindow className="h-4 w-4 mr-2" />,
    components: [
      { id: 'timer-ic', name: '555 Timer', type: 'wokwi-timer-ic', description: '555 timer integrated circuit' },
      { id: 'rtc-ds1307', name: 'RTC DS1307', type: 'wokwi-rtc-ds1307', description: 'Real-time clock module' },
      { id: 'ds1307', name: 'DS1307', type: 'wokwi-ds1307', description: 'Real-time clock IC' },
      { id: 'ht16k33', name: 'HT16K33', type: 'wokwi-ht16k33', description: 'LED matrix driver' },
      { id: 'tca9548a', name: 'TCA9548A', type: 'wokwi-tca9548a', description: 'I2C multiplexer' },
      { id: 'level-shifter', name: 'Level Shifter', type: 'wokwi-level-shifter', description: 'Bidirectional logic level converter' }
    ]
  },
  {
    id: 'tools',
    label: 'Tools & Debug',
    icon: <History className="h-4 w-4 mr-2" />,
    components: [
      { id: 'logic-analyzer', name: 'Logic Analyzer', type: 'wokwi-logic-analyzer', description: 'Digital signal analyzer' },
      { id: 'ir-remote', name: 'IR Remote', type: 'wokwi-ir-remote', description: 'Infrared remote control' },
      { id: 'ir-receiver', name: 'IR Receiver', type: 'wokwi-ir-receiver', description: 'Infrared receiver module' },
      { id: 'microsd-card', name: 'microSD Card', type: 'wokwi-microsd-card', description: 'microSD card module' }
    ]
  }
];

const ComponentPanel = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({
    'controllers': true, // Open by default
    'basic': true       // Open by default
  });

  const handleDragStart = (e: React.DragEvent, component: any) => {
    e.dataTransfer.setData('component', JSON.stringify(component));
    // We could also set a custom drag image here
  };

  const toggleCategory = (categoryId: string) => {
    setOpenCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }));
  };

  // Filter components based on search term
  const filteredCategories = searchTerm 
    ? componentCategories.map(category => ({
        ...category,
        components: category.components.filter(comp => 
          comp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          comp.description.toLowerCase().includes(searchTerm.toLowerCase())
        )
      })).filter(category => category.components.length > 0)
    : componentCategories;

  return (
    <div className="h-full flex flex-col">
      <div className="relative mb-3">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search components..."
          className="pl-8 text-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {searchTerm && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="absolute right-1 top-1 h-6 w-6 p-0" 
            onClick={() => setSearchTerm('')}
          >
            <span className="sr-only">Clear search</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>
      
      <ScrollArea className="flex-1 pr-3">
        {filteredCategories.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            No components found
          </div>
        ) : (
          <div className="space-y-1">
            {filteredCategories.map(category => (
              <Collapsible 
                key={category.id} 
                open={searchTerm ? true : openCategories[category.id]} 
                className="mb-1"
              >
                <CollapsibleTrigger asChild onClick={() => toggleCategory(category.id)}>
                  <div className="flex items-center justify-between py-2 px-1 hover:bg-accent rounded-md cursor-pointer">
                    <div className="flex items-center text-sm font-medium">
                      {category.icon}
                      {category.label}
                    </div>
                    {searchTerm ? null : (
                      openCategories[category.id] ? 
                        <ChevronDown className="h-4 w-4" /> : 
                        <ChevronRight className="h-4 w-4" />
                    )}
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="pl-4 pr-1">
                  <div className="grid grid-cols-1 gap-1 py-1">
                    {category.components.map(component => (
                      <TooltipProvider key={component.id}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="justify-start h-auto py-1.5 text-sm w-full cursor-grab"
                              draggable
                              onDragStart={(e) => handleDragStart(e, component)}
                            >
                              <span className="truncate">{component.name}</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="right">
                            <p>{component.description}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        )}
      </ScrollArea>
      
      <div className="mt-auto pt-2 text-xs text-muted-foreground border-t">
        Drag components to the canvas
      </div>
    </div>
  );
};

export default ComponentPanel;
