
import React, { useState } from "react";
import PageLayout from "@/components/PageLayout";
import { AdminRoute } from "@/components/AdminRoute";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Database, 
  CirclePlus, 
  HelpCircle, 
  RefreshCw, 
  PackageCheck,
  ExternalLink 
} from "lucide-react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ORIGINAL_WOKWI_COMPONENTS, isWokwiLoaded, forceLoadWokwiElements } from "@/integrations/wokwi/WokwiIntegration";
import '@/styles/component-preview.css';

// Import example for component preview
import EnhancedComponentPreview from "@/components/CircuitEditor/EnhancedComponentPreview";

const ComponentLibrary = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [wokwiLoaded, setWokwiLoaded] = useState(false);
  const [loadingWokwi, setLoadingWokwi] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("all");
  
  // Categories and components mapping
  const componentCategories = [
    {
      id: "basic",
      name: "Basic Components",
      components: [
        { id: "led", name: "LED", type: "wokwi-led", description: "Light Emitting Diode" },
        { id: "bicolor-led", name: "Bicolor LED", type: "wokwi-bicolor-led", description: "Two-color LED" },
        { id: "rgb-led", name: "RGB LED", type: "wokwi-rgb-led", description: "RGB LED" },
        { id: "resistor", name: "Resistor", type: "wokwi-resistor", description: "Electrical resistor" },
        { id: "capacitor", name: "Capacitor", type: "wokwi-capacitor", description: "Electrical capacitor" },
        { id: "battery", name: "Battery", type: "wokwi-battery", description: "Battery power source" },
        { id: "crystal", name: "Crystal", type: "wokwi-crystal", description: "Quartz crystal oscillator" },
        { id: "neopixel", name: "NeoPixel", type: "wokwi-neopixel", description: "RGB LED with integrated controller" },
        { id: "breadboard", name: "Breadboard", type: "wokwi-breadboard", description: "Solderless prototyping board" },
        { id: "voltage-source", name: "Voltage Source", type: "wokwi-voltage-source", description: "Programmable voltage source" },
      ]
    },
    {
      id: "controllers",
      name: "Microcontrollers",
      components: [
        { id: "arduino-uno", name: "Arduino Uno", type: "wokwi-arduino-uno", description: "Arduino Uno development board" },
        { id: "arduino-nano", name: "Arduino Nano", type: "wokwi-arduino-nano", description: "Arduino Nano development board" },
        { id: "arduino-mega", name: "Arduino Mega", type: "wokwi-arduino-mega", description: "Arduino Mega 2560 development board" },
        { id: "arduino-leonardo", name: "Arduino Leonardo", type: "wokwi-arduino-leonardo", description: "Arduino Leonardo development board" },
        { id: "arduino-micro", name: "Arduino Micro", type: "wokwi-arduino-micro", description: "Arduino Micro development board" },
        { id: "esp32", name: "ESP32", type: "wokwi-esp32-devkit-v1", description: "ESP32 development board" },
        { id: "raspberry-pico", name: "Raspberry Pi Pico", type: "wokwi-raspberrypi-pico", description: "Raspberry Pi Pico development board" },
      ]
    },
    {
      id: "input",
      name: "Input Devices",
      components: [
        { id: "pushbutton", name: "Push Button", type: "wokwi-pushbutton", description: "Momentary push button" },
        { id: "slide-switch", name: "Slide Switch", type: "wokwi-slide-switch", description: "SPDT slide switch" },
        { id: "potentiometer", name: "Potentiometer", type: "wokwi-potentiometer", description: "Rotary potentiometer" },
        { id: "slide-potentiometer", name: "Slide Potentiometer", type: "wokwi-slide-potentiometer", description: "Linear potentiometer" },
        { id: "keypad", name: "4x4 Keypad", type: "wokwi-membrane-keypad", description: "4x4 membrane keypad" },
        { id: "dht22", name: "DHT22", type: "wokwi-dht22", description: "Temperature & humidity sensor" },
        { id: "ir-receiver", name: "IR Receiver", type: "wokwi-ir-receiver", description: "Infrared receiver module" },
        { id: "microphone", name: "Microphone", type: "wokwi-microphone", description: "Sound detector module" },
        { id: "photoresistor", name: "Photoresistor", type: "wokwi-photoresistor-sensor", description: "Light-dependent resistor" },
        { id: "pir-sensor", name: "PIR Sensor", type: "wokwi-pir-motion-sensor", description: "Passive infrared motion detector" },
        { id: "rotary-encoder", name: "Rotary Encoder", type: "wokwi-ky-040", description: "Rotary encoder with button" },
        { id: "rotary-dialer", name: "Rotary Dialer", type: "wokwi-rotary-dialer", description: "Retro telephone rotary dial" },
        { id: "analog-joystick", name: "Analog Joystick", type: "wokwi-analog-joystick", description: "Two-axis joystick" },
        { id: "tilt-sensor", name: "Tilt Sensor", type: "wokwi-tilt-sensor", description: "Mercury tilt switch sensor" },
        { id: "ultrasonic", name: "Ultrasonic Sensor", type: "wokwi-ultrasonic-distance-sensor", description: "HC-SR04 ultrasonic distance sensor" },
        { id: "mpu6050", name: "MPU6050", type: "wokwi-mpu6050", description: "Accelerometer and gyroscope sensor" },
        { id: "hc-sr04", name: "HC-SR04", type: "wokwi-hc-sr04", description: "Ultrasonic distance sensor module" },
      ]
    },
    {
      id: "output",
      name: "Output Devices",
      components: [
        { id: "7segment", name: "7-Segment Display", type: "wokwi-7segment", description: "Single 7-segment display" },
        { id: "led-bar", name: "LED Bar Graph", type: "wokwi-led-bar-graph", description: "10-segment LED bar graph" },
        { id: "led-matrix", name: "LED Matrix", type: "wokwi-led-matrix", description: "8×8 LED matrix display" },
        { id: "max7219", name: "MAX7219 Matrix", type: "wokwi-max7219-matrix", description: "8×8 LED matrix with MAX7219 driver" },
        { id: "buzzer", name: "Buzzer", type: "wokwi-buzzer", description: "Piezo buzzer" },
        { id: "piezo", name: "Piezo Element", type: "wokwi-piezo", description: "Piezoelectric element" },
        { id: "servo", name: "Servo Motor", type: "wokwi-servo", description: "RC servo motor" },
        { id: "stepper", name: "Stepper Motor", type: "wokwi-stepper-motor", description: "Stepper motor" },
        { id: "lcd1602", name: "LCD 16x2", type: "wokwi-lcd1602", description: "16×2 character LCD display" },
        { id: "lcd2004", name: "LCD 20x4", type: "wokwi-lcd2004", description: "20×4 character LCD display" },
        { id: "text-lcd1602", name: "Text LCD 16x2", type: "wokwi-text-lcd1602", description: "Simple 16×2 text LCD" },
        { id: "ir-remote", name: "IR Remote", type: "wokwi-ir-remote", description: "Infrared remote control" },
        { id: "relay", name: "Relay", type: "wokwi-relay", description: "Relay module" },
        { id: "ssd1306", name: "SSD1306 OLED", type: "wokwi-ssd1306", description: "128×64 OLED display with SSD1306 driver" },
      ]
    },
    {
      id: "tools",
      name: "Tools & Misc",
      components: [
        { id: "logic-analyzer", name: "Logic Analyzer", type: "wokwi-logic-analyzer", description: "Digital signal analyzer" },
        { id: "clock-generator", name: "Clock Generator", type: "wokwi-clock-generator", description: "Digital clock signal generator" },
        { id: "sd-card", name: "SD Card", type: "wokwi-sd-card", description: "SD memory card" },
      ]
    }
  ];

  // Function to load Wokwi elements if needed
  const handleLoadWokwi = async () => {
    setLoadingWokwi(true);
    try {
      const loaded = await forceLoadWokwiElements();
      setWokwiLoaded(loaded);
    } catch (error) {
      console.error("Failed to load Wokwi elements:", error);
    } finally {
      setLoadingWokwi(false);
    }
  };
  
  // Check if Wokwi is loaded on component mount
  React.useEffect(() => {
    const loaded = isWokwiLoaded();
    setWokwiLoaded(loaded);
    
    if (!loaded) {
      handleLoadWokwi();
    }
  }, []);

  // Filter components based on search query and selected category
  const filteredComponents = React.useMemo(() => {
    const allComponents = componentCategories.flatMap(category => 
      category.components.map(comp => ({
        ...comp,
        category: category.id
      }))
    );
    
    return allComponents.filter(comp => {
      const matchesSearch = searchQuery.trim() === '' || 
        comp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        comp.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        comp.type.toLowerCase().includes(searchQuery.toLowerCase());
        
      const matchesCategory = selectedCategory === 'all' || comp.category === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory, componentCategories]);

  return (
    <AdminRoute>
      <PageLayout>
        <div className="container py-10">
          <div className="mb-8 flex items-center gap-3">
            <Database className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Component Library</h1>
          </div>
          
          <div className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Wokwi Components</CardTitle>
                <CardDescription>
                  Manage the available circuit components in the application
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <p className="text-muted-foreground">
                    The component library is based on the <a href="https://docs.wokwi.com/parts/wokwi-arduino-uno" target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80">Wokwi Elements</a> library. 
                    These are the official components that can be used in circuit simulations.
                  </p>
                  
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <PackageCheck className="h-5 w-5 text-green-500" />
                        <span>
                          {wokwiLoaded ? 
                            "Wokwi elements are loaded successfully" : 
                            "Wokwi elements are not loaded"}
                        </span>
                      </div>
                    </div>
                    
                    {!wokwiLoaded && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleLoadWokwi}
                        disabled={loadingWokwi}
                      >
                        {loadingWokwi ? (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                            Loading
                          </>
                        ) : (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Load Elements
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
                
                <div className="mb-4 flex flex-col gap-4 sm:flex-row">
                  <div className="flex-1">
                    <Input
                      placeholder="Search components..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full"
                    />
                  </div>
                  
                  <div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline">
                          Category: {selectedCategory === 'all' ? 'All' : 
                            componentCategories.find(c => c.id === selectedCategory)?.name || 'All'}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => setSelectedCategory('all')}>
                          All Categories
                        </DropdownMenuItem>
                        {componentCategories.map(category => (
                          <DropdownMenuItem 
                            key={category.id}
                            onClick={() => setSelectedCategory(category.id)}
                          >
                            {category.name}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                
                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {filteredComponents.length === 0 ? (
                    <div className="col-span-full py-8 text-center text-muted-foreground">
                      No components found matching your search criteria
                    </div>
                  ) : (
                    filteredComponents.map((component) => (
                      <ComponentCard 
                        key={component.id} 
                        component={component} 
                        wokwiLoaded={wokwiLoaded}
                      />
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Library Statistics</CardTitle>
                <CardDescription>
                  Overview of available components
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b pb-2">
                    <span className="font-medium">Total Components:</span>
                    <span className="font-mono">
                      {componentCategories.reduce((sum, cat) => sum + cat.components.length, 0)}
                    </span>
                  </div>
                  
                  {componentCategories.map(category => (
                    <div key={category.id} className="flex items-center justify-between">
                      <span>{category.name}:</span>
                      <span className="font-mono">{category.components.length}</span>
                    </div>
                  ))}
                </div>
                
                <Collapsible className="mt-6 space-y-2">
                  <CollapsibleTrigger asChild>
                    <Button variant="outline" className="flex w-full items-center justify-between">
                      <span>Documentation</span>
                      <HelpCircle className="h-4 w-4" />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="rounded-md border p-4">
                    <div className="space-y-2 text-sm">
                      <p>
                        The Wokwi Elements library provides components for circuit simulation.
                      </p>
                      <p>
                        <a
                          href="https://docs.wokwi.com"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center text-primary hover:underline"
                        >
                          Wokwi Documentation <ExternalLink className="ml-1 h-3 w-3" />
                        </a>
                      </p>
                      <p>
                        <a
                          href="https://elements.wokwi.com"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center text-primary hover:underline"
                        >
                          Components Explorer <ExternalLink className="ml-1 h-3 w-3" />
                        </a>
                      </p>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </CardContent>
            </Card>
          </div>
        </div>
      </PageLayout>
    </AdminRoute>
  );
};

interface ComponentCardProps {
  component: {
    id: string;
    name: string;
    type: string;
    description: string;
  };
  wokwiLoaded: boolean;
}

const ComponentCard: React.FC<ComponentCardProps> = ({ component, wokwiLoaded }) => {
  const [isEnabled, setIsEnabled] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  
  const previewId = `preview-${component.id}`;
  
  const defaultProps = {
    'wokwi-led': { color: 'red' },
    'wokwi-resistor': { value: '1kohm' },
    'wokwi-capacitor': { value: '100nF' },
    'wokwi-pushbutton': { color: 'red' },
    'wokwi-buzzer': {},
    'wokwi-servo': {},
    'wokwi-7segment': { color: 'red' },
    'wokwi-bicolor-led': { color1: 'red', color2: 'green' },
    'wokwi-rgb-led': { color: '#ff0000' }
  };
  
  const props = defaultProps[component.type as keyof typeof defaultProps] || {};
  
  return (
    <Card className="overflow-hidden hover:shadow-md">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{component.name}</CardTitle>
          <HoverCard>
            <HoverCardTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full">
                <HelpCircle className="h-4 w-4" />
                <span className="sr-only">Component info</span>
              </Button>
            </HoverCardTrigger>
            <HoverCardContent>
              <div className="space-y-1">
                <h4 className="text-sm font-semibold">{component.name}</h4>
                <p className="text-sm">{component.description}</p>
                <div className="pt-2 text-xs text-muted-foreground">
                  <code>{component.type}</code>
                </div>
              </div>
            </HoverCardContent>
          </HoverCard>
        </div>
        <CardDescription className="text-xs">{component.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between space-x-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id={`enable-${component.id}`}
              checked={isEnabled}
              onCheckedChange={(value) => setIsEnabled(!!value)}
            />
            <Label htmlFor={`enable-${component.id}`} className="text-sm">Enabled</Label>
          </div>
          
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" onClick={() => setShowPreview(true)}>
                Preview
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{component.name}</DialogTitle>
                <DialogDescription>
                  {component.description}
                </DialogDescription>
              </DialogHeader>
              
              <div className="py-4">
                {wokwiLoaded ? (
                  <EnhancedComponentPreview
                    componentType={component.type}
                    properties={props}
                    previewId={previewId}
                    showPins={true}
                  />
                ) : (
                  <div className="flex h-40 items-center justify-center rounded-md border">
                    <p className="text-muted-foreground">
                      Wokwi elements are not loaded
                    </p>
                  </div>
                )}
              </div>
              
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowPreview(false)}
                >
                  Close
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
};

export default ComponentLibrary;
