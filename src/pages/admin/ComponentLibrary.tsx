
import React, { useState, useEffect, useRef } from "react";
import PageLayout from "@/components/PageLayout";
import { useAuth } from "@/context/AuthContext";
import { Navigate } from "react-router-dom";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Switch
} from "@/components/ui/switch";
import { 
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@/components/ui/tabs";
import { 
  Database, 
  Search, 
  Filter, 
  Plus, 
  Edit, 
  Trash, 
  Eye, 
  Upload, 
  Save, 
  Cpu, 
  AlertCircle,
  LucideProps,
  X,
  Settings,
  Move,
  CheckCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { 
  isWokwiLoaded, 
  forceLoadWokwiElements,
  renderWokwiElement,
  isOriginalWokwiComponent,
  ORIGINAL_WOKWI_COMPONENTS,
  getComponentPinInfo
} from '@/integrations/wokwi/WokwiIntegration';
import VisualPinEditor from "@/components/CircuitEditor/VisualPinEditor";
import DynamicPropertyEditor from "@/components/CircuitEditor/DynamicPropertyEditor";
import EnhancedComponentPreview from "@/components/CircuitEditor/EnhancedComponentPreview";

interface ComponentType {
  id: string;
  name: string;
  type: string;
  category: string;
  created_at: string;
  last_updated: string;
  pins: number;
  enabled?: boolean;
  description?: string;
  svgPath?: string;
  pinConfig?: PinConfig[];
  properties?: Record<string, any>;
  isOriginal?: boolean;
}

interface PinConfig {
  name: string;
  x: number;
  y: number;
  signals: string[];
}

// Helper function to generate a good display name from a wokwi element type
const getDisplayNameFromType = (type: string): string => {
  // Remove 'wokwi-' prefix and capitalize first letter of each word
  return type
    .replace('wokwi-', '')
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// Function to categorize components based on their type
const getCategoryFromType = (type: string): string => {
  // Define mappings for different categories
  const categoryMap: Record<string, string> = {
    'led': 'output',
    'resistor': 'passive',
    'capacitor': 'passive',
    'battery': 'power',
    'breadboard': 'base',
    'arduino': 'microcontroller',
    'esp32': 'microcontroller',
    'raspberry-pi': 'microcontroller',
    'microbit': 'microcontroller',
    'attiny': 'microcontroller',
    'pushbutton': 'input',
    'slide-switch': 'input',
    'potentiometer': 'input',
    'buzzer': 'output',
    'servo': 'output',
    'stepper': 'output',
    'lcd': 'display',
    'segment': 'display',
    'matrix': 'display',
    'keypad': 'input',
    'relay': 'output',
    'ir': 'sensor',
    'dht22': 'sensor',
    'bme280': 'sensor',
    'ultrasonic': 'sensor',
    'photoresistor': 'sensor',
    'temperature': 'sensor',
    'hall': 'sensor',
    'pir': 'sensor',
    'gas': 'sensor',
    'analog-joystick': 'input',
  };
  
  // Check for matching keywords in the type
  for (const [keyword, category] of Object.entries(categoryMap)) {
    if (type.includes(keyword)) {
      return category;
    }
  }
  
  // Default category if no match is found
  return 'other';
};

// Function to create default pin config and properties for components
const getDefaultPropertiesForType = (type: string): Record<string, any> => {
  const defaults: Record<string, Record<string, any>> = {
    'wokwi-led': { color: 'red', brightness: 1 },
    'wokwi-resistor': { resistance: '220', tolerance: '5%' },
    'wokwi-capacitor': { capacitance: '10uF' },
    'wokwi-pushbutton': { color: 'red' },
    'wokwi-servo': { angle: 90 },
    'wokwi-potentiometer': { value: 50 },
    'wokwi-slide-switch': { value: false },
    'wokwi-buzzer': { frequency: 440 },
    'wokwi-rgb-led': { color: '#ff0000' },
    'wokwi-lcd1602': { text: 'Hello World!' },
    'wokwi-7segment': { digits: '0' },
    'wokwi-dht22': { temperature: 25, humidity: 50 },
  };
  
  return defaults[type] || {};
};

// Generate components for all wokwi elements
const generateWokwiComponents = (): ComponentType[] => {
  const today = new Date().toISOString().split('T')[0];
  
  return ORIGINAL_WOKWI_COMPONENTS.map((type, index) => {
    const name = getDisplayNameFromType(type);
    const category = getCategoryFromType(type);
    const pins = getComponentPinInfo(type).length || 2;
    const properties = getDefaultPropertiesForType(type);
    
    return {
      id: `auto-${index + 1}`,
      name,
      type,
      category,
      created_at: today,
      last_updated: today,
      pins,
      enabled: true,
      description: `${name} component for circuit simulations`,
      pinConfig: getComponentPinInfo(type),
      properties,
      isOriginal: true
    };
  });
};

// Original mock components - will be supplemented by generated ones
const baseMockComponents = [
  { 
    id: "1", 
    name: "LED", 
    type: "wokwi-led", 
    category: "output", 
    created_at: "2023-01-15", 
    last_updated: "2023-03-22", 
    pins: 2,
    enabled: true,
    description: "Light Emitting Diode that can be turned on or off",
    svgPath: "/components/led.svg",
    pinConfig: [
      { name: "A", x: 0, y: 0, signals: ["power"] },
      { name: "C", x: 0, y: 20, signals: ["ground"] }
    ],
    properties: { 
      color: "red", 
      brightness: 1.0
    },
    isOriginal: true
  },
  { 
    id: "2", 
    name: "Resistor", 
    type: "wokwi-resistor", 
    category: "passive", 
    created_at: "2023-01-15", 
    last_updated: "2023-04-10", 
    pins: 2,
    enabled: true,
    description: "Passive component that implements electrical resistance",
    svgPath: "/components/resistor.svg",
    pinConfig: [
      { name: "1", x: 0, y: 0, signals: ["passive"] },
      { name: "2", x: 0, y: 20, signals: ["passive"] }
    ],
    properties: { 
      resistance: "220",
      tolerance: "5%"
    },
    isOriginal: true
  },
  { 
    id: "3", 
    name: "Capacitor", 
    type: "wokwi-capacitor", 
    category: "passive", 
    created_at: "2023-01-16", 
    last_updated: "2023-02-28", 
    pins: 2,
    enabled: true,
    description: "Stores electrical energy in an electric field",
    pinConfig: [
      { name: "1", x: 0, y: 0, signals: ["passive"] },
      { name: "2", x: 0, y: 20, signals: ["passive"] }
    ],
    properties: { 
      capacitance: "10uF"
    },
    isOriginal: true
  },
  { 
    id: "4", 
    name: "Arduino Uno", 
    type: "wokwi-arduino-uno", 
    category: "microcontroller", 
    created_at: "2023-01-18", 
    last_updated: "2023-05-05", 
    pins: 28,
    enabled: true,
    description: "Popular microcontroller board based on the ATmega328P",
    pinConfig: [
      { name: "D0", x: 0, y: 0, signals: ["digital", "rx"] },
      { name: "D1", x: 0, y: 10, signals: ["digital", "tx"] },
    ],
    isOriginal: true
  },
  { 
    id: "5", 
    name: "ESP32", 
    type: "wokwi-esp32-devkit-v1", 
    category: "microcontroller", 
    created_at: "2023-02-10", 
    last_updated: "2023-04-15", 
    pins: 36,
    enabled: true,
    description: "ESP32 is a series of low-cost, low-power system on a chip microcontrollers with integrated Wi-Fi and dual-mode Bluetooth",
    pinConfig: [
      { name: "D0", x: 0, y: 0, signals: ["digital"] },
      { name: "D1", x: 0, y: 10, signals: ["digital"] },
    ],
    isOriginal: true
  },
  { 
    id: "6", 
    name: "Button", 
    type: "wokwi-pushbutton", 
    category: "input", 
    created_at: "2023-01-20", 
    last_updated: "2023-03-30", 
    pins: 2,
    enabled: true,
    description: "A push button is a switch that closes a circuit when pressed",
    pinConfig: [
      { name: "1", x: 0, y: 0, signals: ["passive"] },
      { name: "2", x: 0, y: 20, signals: ["passive"] }
    ],
    properties: { 
      color: "red",
    },
    isOriginal: true
  },
  { 
    id: "7", 
    name: "Motor", 
    type: "wokwi-servo", 
    category: "output", 
    created_at: "2023-02-05", 
    last_updated: "2023-03-15", 
    pins: 2,
    enabled: true,
    description: "A servo motor is a rotary actuator or linear actuator that allows for precise control of angular or linear position, velocity, and acceleration",
    pinConfig: [
      { name: "1", x: 0, y: 0, signals: ["power"] },
      { name: "2", x: 0, y: 20, signals: ["ground"] }
    ],
    properties: {
      angle: 90
    },
    isOriginal: true
  },
];

// Generate the complete list of components by merging existing detailed ones 
// with auto-generated ones, avoiding duplicates
const generateFullComponentList = (): ComponentType[] => {
  const existingTypes = new Set(baseMockComponents.map(comp => comp.type));
  const autoGenerated = generateWokwiComponents().filter(comp => !existingTypes.has(comp.type));
  
  return [...baseMockComponents, ...autoGenerated];
};

const signalTypes = [
  "power", "ground", "digital", "analog", "passive", "i2c", "spi", "uart", "rx", "tx"
];

const ComponentLibrary = () => {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [selectedComponent, setSelectedComponent] = useState<ComponentType | null>(null);
  const [editedComponent, setEditedComponent] = useState<ComponentType | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [wokwiReady, setWokwiReady] = useState(false);
  const [activeTab, setActiveTab] = useState("details");
  const [showPins, setShowPins] = useState(true);
  const previewRef = useRef<HTMLDivElement>(null);
  const [allComponents, setAllComponents] = useState<ComponentType[]>(() => {
    return generateFullComponentList().map(comp => ({
      ...comp,
      isOriginal: isOriginalWokwiComponent(comp.type)
    }));
  });
  
  // Get unique categories for filter dropdown
  const uniqueCategories = Array.from(new Set(allComponents.map(comp => comp.category)));
  
  useEffect(() => {
    const loadWokwi = async () => {
      try {
        if (isWokwiLoaded()) {
          setWokwiReady(true);
          return;
        }
        
        const success = await forceLoadWokwiElements();
        setWokwiReady(success);
        
        if (!success) {
          toast({
            title: "Warning",
            description: "Wokwi components failed to load. Preview may not work correctly.",
            variant: "destructive"
          });
        }
      } catch (error) {
        console.error("Error loading Wokwi:", error);
        setWokwiReady(false);
      }
    };
    
    loadWokwi();
  }, [toast]);

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (!isAdmin()) {
    return <Navigate to="/dashboard" />;
  }

  const filteredComponents = allComponents.filter(component => {
    const matchesSearch = component.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "all" || !categoryFilter ? true : component.category === categoryFilter;
    let matchesType = typeFilter === "all" || !typeFilter ? true : false;
    
    // Handle specific type filters
    if (typeFilter === "original") {
      matchesType = component.isOriginal === true;
    } else if (typeFilter === "custom") {
      matchesType = component.isOriginal === false;
    } else if (typeFilter) {
      matchesType = component.type === typeFilter;
    }
    
    return matchesSearch && matchesCategory && matchesType;
  });

  const handleAddComponent = () => {
    const newComponent = {
      id: `comp-${Date.now()}`,
      name: "New Component",
      type: "wokwi-led",
      category: "output",
      created_at: new Date().toISOString().split('T')[0],
      last_updated: new Date().toISOString().split('T')[0],
      pins: 2,
      enabled: true,
      description: "New component description",
      properties: { color: "red" },
      isOriginal: true
    };
    
    setAllComponents([...allComponents, newComponent]);
    
    toast({
      title: "Component Added",
      description: "New component has been added to the library.",
    });
    setIsAddDialogOpen(false);
  };

  const handleEditComponent = (component: ComponentType) => {
    setSelectedComponent(component);
    setEditedComponent({...component});
    setIsEditDialogOpen(true);
    setActiveTab("details");
  };

  const handleViewComponent = (component: ComponentType) => {
    setSelectedComponent(component);
    setIsViewDialogOpen(true);
  };

  const handleDeleteComponent = (component: ComponentType) => {
    setSelectedComponent(component);
    setIsDeleteDialogOpen(true);
  };

  const handleSaveComponent = () => {
    if (!editedComponent) return;
    
    if (editedComponent.type !== selectedComponent?.type) {
      editedComponent.isOriginal = isOriginalWokwiComponent(editedComponent.type);
    }
    
    setAllComponents(prevComponents => 
      prevComponents.map(comp => 
        comp.id === editedComponent.id ? editedComponent : comp
      )
    );
    
    toast({
      title: "Component Updated",
      description: `Component "${editedComponent.name}" has been updated successfully.`,
    });
    setIsEditDialogOpen(false);
  };

  const handleConfirmDelete = () => {
    if (!selectedComponent) return;
    
    setAllComponents(prevComponents => 
      prevComponents.filter(comp => comp.id !== selectedComponent.id)
    );
    
    toast({
      title: "Component Deleted",
      description: `Component "${selectedComponent.name}" has been removed from the library.`,
    });
    setIsDeleteDialogOpen(false);
  };

  const handleSaveLibrary = () => {
    toast({
      title: "Library Saved",
      description: "Component library has been saved to database successfully.",
    });
  };

  const updateComponentProperty = (property: string, value: any) => {
    if (!editedComponent) return;
    
    setEditedComponent(prev => {
      if (!prev) return prev;
      
      if (property === 'enabled') {
        return { ...prev, enabled: value };
      }
      
      if (property === 'type') {
        editedComponent.isOriginal = isOriginalWokwiComponent(value);
        return { 
          ...prev, 
          type: value,
          isOriginal: isOriginalWokwiComponent(value)
        };
      }
      
      if (property.startsWith('properties.')) {
        const propName = property.split('.')[1];
        return { 
          ...prev, 
          properties: { 
            ...prev.properties, 
            [propName]: value 
          } 
        };
      }
      
      return { ...prev, [property]: value };
    });
  };
  
  const updateComponentProperties = (properties: Record<string, any>) => {
    if (!editedComponent) return;
    
    setEditedComponent(prev => {
      if (!prev) return prev;
      return { ...prev, properties };
    });
  };
  
  const updatePinConfiguration = (pinConfig: PinConfig[]) => {
    if (!editedComponent) return;
    
    setEditedComponent(prev => {
      if (!prev) return prev;
      return { 
        ...prev, 
        pinConfig, 
        pins: pinConfig.length 
      };
    });
  };

  return (
    <PageLayout>
      <div className="container py-6">
        <div className="mb-6 flex items-center gap-3">
          <Cpu className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Component Admin</h1>
        </div>

        <div className="flex justify-end mb-4 gap-2">
          <Button 
            variant="default" 
            onClick={handleSaveLibrary}
            className="gap-1"
          >
            <Save className="h-4 w-4" />
            <span>Save Library</span>
          </Button>
          <Button 
            onClick={() => setIsAddDialogOpen(true)}
            className="gap-1"
          >
            <Plus className="h-4 w-4" />
            <span>Add Component</span>
          </Button>
        </div>

        <Card className="mb-6">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Circuit Components</CardTitle>
                <CardDescription>Manage the components available in the circuit editor</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4 mb-6 justify-between">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search components..."
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-[150px]">
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4" />
                      <span>{categoryFilter || "Category"}</span>
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {uniqueCategories.sort().map(category => (
                      <SelectItem key={category} value={category}>
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-[130px]">
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4" />
                      <span>{typeFilter || "Type"}</span>
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="original">Original Wokwi</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Pins</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredComponents.length > 0 ? (
                    filteredComponents.map((component) => (
                      <TableRow key={component.id}>
                        <TableCell className="font-medium flex items-center gap-2">
                          {component.name}
                          {component.isOriginal && (
                            <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">
                              Original
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              component.category === "microcontroller" ? "default" : 
                              component.category === "input" ? "secondary" : 
                              component.category === "output" ? "outline" :
                              "outline"
                            }
                          >
                            {component.category}
                          </Badge>
                        </TableCell>
                        <TableCell>{component.type}</TableCell>
                        <TableCell>{component.pins}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={component.enabled ? "default" : "outline"}
                            className={component.enabled ? "bg-green-500" : "text-red-500"}
                          >
                            {component.enabled ? "Enabled" : "Disabled"}
                          </Badge>
                        </TableCell>
                        <TableCell>{component.last_updated}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleViewComponent(component)}
                              title="View"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditComponent(component)}
                              title="Edit"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteComponent(component)}
                              title="Delete"
                            >
                              <Trash className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                        No components match your filters.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Component</DialogTitle>
              <DialogDescription>
                Add a new component to the circuit library.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <label htmlFor="name">Component Name</label>
                <Input id="name" placeholder="e.g. LED, Resistor, etc." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <label htmlFor="category">Category</label>
                  <Select defaultValue="input">
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="input">Input</SelectItem>
                      <SelectItem value="output">Output</SelectItem>
                      <SelectItem value="passive">Passive</SelectItem>
                      <SelectItem value="microcontroller">Microcontroller</SelectItem>
                      <SelectItem value="sensor">Sensor</SelectItem>
                      <SelectItem value="display">Display</SelectItem>
                      <SelectItem value="power">Power</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <label htmlFor="type">Type</label>
                  <Select defaultValue="wokwi-led">
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px] overflow-y-auto">
                      {ORIGINAL_WOKWI_COMPONENTS.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <label htmlFor="description">Description</label>
                <Textarea 
                  id="description" 
                  placeholder="Describe this component and its functionality"
                  rows={3}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Switch id="enabled" defaultChecked={true} />
                  <label htmlFor="enabled">Enable component for users</label>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleAddComponent}>Add Component</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                Edit Component
                {editedComponent?.isOriginal && (
                  <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">
                    Original Wokwi Component
                  </Badge>
                )}
              </DialogTitle>
              <DialogDescription>
                {editedComponent?.isOriginal 
                  ? "Original Wokwi components have predefined pin configurations. You can modify basic details and properties."
                  : "Modify component properties and configuration."}
              </DialogDescription>
            </DialogHeader>

            {editedComponent && (
              <Tabs 
                defaultValue="details" 
                className="mt-4"
                value={activeTab}
                onValueChange={setActiveTab}
              >
                <TabsList className="grid grid-cols-4">
                  <TabsTrigger value="details">Basic Details</TabsTrigger>
                  <TabsTrigger value="properties">Properties</TabsTrigger>
                  <TabsTrigger value="pins" disabled={editedComponent.isOriginal} title={editedComponent.isOriginal ? "Pin configuration is predefined for original Wokwi components" : ""}>
                    Pin Configuration
                  </TabsTrigger>
                  <TabsTrigger value="preview">Preview</TabsTrigger>
                </TabsList>
                
                <TabsContent value="details" className="py-4">
                  <div className="grid gap-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <label htmlFor="name">Component Name</label>
                        <Input 
                          id="name" 
                          value={editedComponent.name} 
                          onChange={(e) => updateComponentProperty('name', e.target.value)}
                        />
                      </div>
                      <div className="grid gap-2">
                        <label htmlFor="type">Wokwi Element Type</label>
                        <Select 
                          value={editedComponent.type}
                          onValueChange={(value) => updateComponentProperty('type', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent className="max-h-[300px] overflow-y-auto">
                            {ORIGINAL_WOKWI_COMPONENTS.map(type => (
                              <SelectItem key={type} value={type}>{type}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <label htmlFor="category">Category</label>
                        <Select 
                          value={editedComponent.category}
                          onValueChange={(value) => updateComponentProperty('category', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="input">Input</SelectItem>
                            <SelectItem value="output">Output</SelectItem>
                            <SelectItem value="passive">Passive</SelectItem>
                            <SelectItem value="microcontroller">Microcontroller</SelectItem>
                            <SelectItem value="sensor">Sensor</SelectItem>
                            <SelectItem value="display">Display</SelectItem>
                            <SelectItem value="power">Power</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <label htmlFor="svgPath">SVG Path (Optional)</label>
                        <Input 
                          id="svgPath" 
                          value={editedComponent.svgPath || ''} 
                          onChange={(e) => updateComponentProperty('svgPath', e.target.value)}
                          placeholder="URL or path to custom SVG"
                        />
                      </div>
                    </div>
                    
                    <div className="grid gap-2">
                      <label htmlFor="description">Description</label>
                      <Textarea 
                        id="description" 
                        value={editedComponent.description || ''} 
                        onChange={(e) => updateComponentProperty('description', e.target.value)}
                        rows={3}
                      />
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch 
                        id="enabled" 
                        checked={editedComponent.enabled} 
                        onCheckedChange={(checked) => updateComponentProperty('enabled', checked)}
                      />
                      <label htmlFor="enabled">Enable component for users</label>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="properties" className="py-4">
                  {editedComponent && (
                    <DynamicPropertyEditor 
                      properties={editedComponent.properties || {}}
                      onChange={updateComponentProperties}
                    />
                  )}
                </TabsContent>
                
                <TabsContent value="pins" className="py-4">
                  {editedComponent && !editedComponent.isOriginal && (
                    <VisualPinEditor 
                      pinConfig={editedComponent.pinConfig || []}
                      onChange={updatePinConfiguration}
                      signalTypes={signalTypes}
                    />
                  )}
                  {editedComponent && editedComponent.isOriginal && (
                    <div className="p-4 border rounded-md bg-amber-50">
                      <div className="flex gap-2 items-center">
                        <AlertCircle className="h-5 w-5 text-amber-500" />
                        <h3 className="font-medium">Read-Only Configuration</h3>
                      </div>
                      <p className="mt-2 text-amber-800">
                        Pin configuration for original Wokwi components is predefined and cannot be modified.
                      </p>
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="preview" className="py-4">
                  <div className="flex flex-col items-center gap-6">
                    <div className="flex gap-4 items-center">
                      <div className="flex items-center space-x-2">
                        <Switch 
                          id="show-pins" 
                          checked={showPins} 
                          onCheckedChange={setShowPins}
                        />
                        <label htmlFor="show-pins">Show Pin Labels</label>
                      </div>
                    </div>
                    
                    {!wokwiReady ? (
                      <div className="flex flex-col items-center justify-center h-60 w-full border rounded-md bg-slate-50">
                        <div className="animate-spin mb-3">
                          <svg className="h-6 w-6 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        </div>
                        <p className="text-gray-500">Loading Wokwi components...</p>
                      </div>
                    ) : (
                      <div className="border rounded-md p-6 w-full flex justify-center bg-slate-50" ref={previewRef}>
                        <EnhancedComponentPreview
                          componentType={editedComponent.type}
                          properties={editedComponent.properties || {}}
                          customSvgPath={editedComponent.svgPath}
                          previewId="edit-preview"
                          showPins={showPins}
                        />
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveComponent}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selectedComponent?.name}
                {selectedComponent?.isOriginal && (
                  <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">
                    Original
                  </Badge>
                )}
              </DialogTitle>
              <DialogDescription>
                {selectedComponent?.description || "Component details"}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <h3 className="text-sm font-medium mb-1">Type</h3>
                  <p className="text-sm">{selectedComponent?.type}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium mb-1">Category</h3>
                  <p className="text-sm">
                    <Badge variant="outline">
                      {selectedComponent?.category}
                    </Badge>
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium mb-1">Pins</h3>
                  <p className="text-sm">{selectedComponent?.pins}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium mb-1">Status</h3>
                  <p className="text-sm">
                    <Badge 
                      variant={selectedComponent?.enabled ? "default" : "outline"}
                      className={selectedComponent?.enabled ? "bg-green-500" : "text-red-500"}
                    >
                      {selectedComponent?.enabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium mb-1">Created</h3>
                  <p className="text-sm">{selectedComponent?.created_at}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium mb-1">Last Updated</h3>
                  <p className="text-sm">{selectedComponent?.last_updated}</p>
                </div>
              </div>
              
              {selectedComponent && wokwiReady && (
                <div className="border rounded-md p-4 flex justify-center bg-slate-50">
                  <EnhancedComponentPreview
                    componentType={selectedComponent.type}
                    properties={selectedComponent.properties || {}}
                    customSvgPath={selectedComponent.svgPath}
                    previewId="view-preview"
                    showPins={true}
                  />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>Close</Button>
              <Button onClick={() => {
                if (selectedComponent) {
                  handleEditComponent(selectedComponent);
                  setIsViewDialogOpen(false);
                }
              }}>Edit Component</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Deletion</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete "{selectedComponent?.name}"? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleConfirmDelete}>Delete Component</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageLayout>
  );
};

export default ComponentLibrary;
