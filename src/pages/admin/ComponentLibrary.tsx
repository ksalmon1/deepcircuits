
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
  Move
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { 
  isWokwiLoaded, 
  forceLoadWokwiElements, 
  renderWokwiElement 
} from '@/integrations/wokwi/WokwiIntegration';

// Extended component type with additional admin properties
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
}

interface PinConfig {
  name: string;
  x: number;
  y: number;
  signals: string[];
}

const mockComponents = [
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
    }
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
    }
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
    }
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
      // Additional pins would be defined here
    ]
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
    ]
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
    }
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
    }
  },
];

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
  const previewRef = useRef<HTMLDivElement>(null);
  const [allComponents, setAllComponents] = useState<ComponentType[]>(mockComponents);
  
  // Ensure Wokwi elements are loaded
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

  // Render component preview when selected component changes
  useEffect(() => {
    if (wokwiReady && selectedComponent && previewRef.current) {
      try {
        const componentType = selectedComponent.type;
        const properties = selectedComponent.properties || {};
        renderWokwiElement(componentType, "component-preview", properties);
      } catch (error) {
        console.error("Error rendering component preview:", error);
      }
    }
  }, [wokwiReady, selectedComponent, activeTab]);
  
  // Similarly render for edited component
  useEffect(() => {
    if (wokwiReady && editedComponent && previewRef.current && activeTab === "preview") {
      try {
        const componentType = editedComponent.type;
        const properties = editedComponent.properties || {};
        renderWokwiElement(componentType, "edit-component-preview", properties);
      } catch (error) {
        console.error("Error rendering edit component preview:", error);
      }
    }
  }, [wokwiReady, editedComponent, activeTab]);

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (!isAdmin()) {
    return <Navigate to="/dashboard" />;
  }

  const filteredComponents = allComponents.filter(component => {
    const matchesSearch = component.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter ? component.category === categoryFilter : true;
    const matchesType = typeFilter ? component.type === typeFilter : true;
    return matchesSearch && matchesCategory && matchesType;
  });

  const handleAddComponent = () => {
    // Add the component to the list
    const newComponent = {
      id: `comp-${Date.now()}`,
      name: "New Component",
      type: "wokwi-led", // Default component type
      category: "output",
      created_at: new Date().toISOString().split('T')[0],
      last_updated: new Date().toISOString().split('T')[0],
      pins: 2,
      enabled: true,
      description: "New component description",
      properties: { color: "red" }
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
    setEditedComponent({...component}); // Create a copy for editing
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
    
    // Update the component in the list
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
    
    // Remove the component from the list
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
    // In a real app, this would save to Supabase
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
  
  const updatePinConfig = (index: number, field: string, value: any) => {
    if (!editedComponent || !editedComponent.pinConfig) return;
    
    const updatedPins = [...editedComponent.pinConfig];
    updatedPins[index] = { 
      ...updatedPins[index], 
      [field]: field === 'signals' 
        ? Array.isArray(value) ? value : [value]
        : value 
    };
    
    setEditedComponent({
      ...editedComponent,
      pinConfig: updatedPins
    });
  };
  
  const addPin = () => {
    if (!editedComponent) return;
    
    const newPin = {
      name: `Pin ${(editedComponent.pinConfig?.length || 0) + 1}`,
      x: 0,
      y: (editedComponent.pinConfig?.length || 0) * 10,
      signals: ["digital"]
    };
    
    setEditedComponent({
      ...editedComponent,
      pinConfig: [...(editedComponent.pinConfig || []), newPin],
      pins: (editedComponent.pins || 0) + 1
    });
  };
  
  const removePin = (index: number) => {
    if (!editedComponent || !editedComponent.pinConfig) return;
    
    const updatedPins = editedComponent.pinConfig.filter((_, i) => i !== index);
    
    setEditedComponent({
      ...editedComponent,
      pinConfig: updatedPins,
      pins: editedComponent.pins - 1
    });
  };

  // Component to render pin configuration UI
  const PinConfigurationSection = () => {
    if (!editedComponent || !editedComponent.pinConfig) {
      return (
        <div className="text-center py-4">
          <p>No pin configuration available for this component.</p>
          <Button onClick={addPin} className="mt-2">Add First Pin</Button>
        </div>
      );
    }
    
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">Pin Configuration</h3>
          <Button onClick={addPin} size="sm">Add Pin</Button>
        </div>
        
        {editedComponent.pinConfig.map((pin, index) => (
          <div key={`pin-${index}`} className="border rounded-md p-3 space-y-2">
            <div className="flex justify-between items-center">
              <h4 className="font-medium">Pin {index + 1}</h4>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => removePin(index)}
                className="h-6 w-6 text-destructive"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-muted-foreground">Name</label>
                <Input 
                  value={pin.name} 
                  onChange={(e) => updatePinConfig(index, 'name', e.target.value)}
                  className="mt-1"
                />
              </div>
              
              <div>
                <label className="text-sm text-muted-foreground">Signal Types</label>
                <Select
                  value={pin.signals[0] || "digital"}
                  onValueChange={(value) => updatePinConfig(index, 'signals', [value])}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {signalTypes.map(signal => (
                      <SelectItem key={signal} value={signal}>
                        {signal.charAt(0).toUpperCase() + signal.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm text-muted-foreground">X Position</label>
                <Input 
                  type="number"
                  value={pin.x} 
                  onChange={(e) => updatePinConfig(index, 'x', parseInt(e.target.value))}
                  className="mt-1"
                />
              </div>
              
              <div>
                <label className="text-sm text-muted-foreground">Y Position</label>
                <Input 
                  type="number"
                  value={pin.y} 
                  onChange={(e) => updatePinConfig(index, 'y', parseInt(e.target.value))}
                  className="mt-1"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Component to render properties UI
  const PropertiesSection = () => {
    if (!editedComponent) return null;
    
    const properties = editedComponent.properties || {};
    const propertyKeys = Object.keys(properties);
    
    if (propertyKeys.length === 0) {
      return (
        <div className="text-center py-4">
          <p>No custom properties defined for this component.</p>
        </div>
      );
    }
    
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Component Properties</h3>
        
        {propertyKeys.map(propKey => (
          <div key={propKey} className="grid grid-cols-2 gap-2">
            <div className="font-medium">{propKey}:</div>
            <Input 
              value={properties[propKey]} 
              onChange={(e) => updateComponentProperty(`properties.${propKey}`, e.target.value)}
            />
          </div>
        ))}
      </div>
    );
  };

  return (
    <PageLayout>
      <div className="container py-6">
        <div className="mb-6 flex items-center gap-3">
          <Cpu className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Component Library</h1>
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
                    <SelectItem value="">All Categories</SelectItem>
                    <SelectItem value="input">Input</SelectItem>
                    <SelectItem value="output">Output</SelectItem>
                    <SelectItem value="passive">Passive</SelectItem>
                    <SelectItem value="microcontroller">Microcontroller</SelectItem>
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
                    <SelectItem value="">All Types</SelectItem>
                    <SelectItem value="basic">Basic</SelectItem>
                    <SelectItem value="complex">Complex</SelectItem>
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
                        <TableCell className="font-medium">{component.name}</TableCell>
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
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <label htmlFor="type">Type</label>
                  <Select defaultValue="wokwi-led">
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="wokwi-led">LED</SelectItem>
                      <SelectItem value="wokwi-resistor">Resistor</SelectItem>
                      <SelectItem value="wokwi-capacitor">Capacitor</SelectItem>
                      <SelectItem value="wokwi-arduino-uno">Arduino Uno</SelectItem>
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
          <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Component</DialogTitle>
              <DialogDescription>
                Modify component properties and configuration.
              </DialogDescription>
            </DialogHeader>

            {editedComponent && (
              <Tabs 
                defaultValue="details" 
                className="mt-4"
                value={activeTab}
                onValueChange={setActiveTab}
              >
                <TabsList className="grid grid-cols-3">
                  <TabsTrigger value="details">Basic Details</TabsTrigger>
                  <TabsTrigger value="pins">Pin Configuration</TabsTrigger>
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
                        <Input 
                          id="type" 
                          value={editedComponent.type} 
                          onChange={(e) => updateComponentProperty('type', e.target.value)}
                        />
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
                    
                    <PropertiesSection />
                  </div>
                </TabsContent>
                
                <TabsContent value="pins" className="py-4">
                  <PinConfigurationSection />
                </TabsContent>
                
                <TabsContent value="preview" className="py-4">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="border rounded-md p-4">
                      <h3 className="text-lg font-medium mb-3">Component Preview</h3>
                      <div className="bg-gray-50 p-8 rounded-md flex items-center justify-center min-h-[200px]">
                        {wokwiReady ? (
                          <div id="edit-component-preview" ref={previewRef} className="component-preview-container"></div>
                        ) : (
                          <div className="text-center text-muted-foreground">
                            <Cpu className="h-12 w-12 mb-2 mx-auto animate-pulse" />
                            <p>Loading component preview...</p>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="border rounded-md p-4">
                      <h3 className="text-lg font-medium mb-3">Component JSON</h3>
                      <div className="bg-gray-100 rounded-md p-4 font-mono text-xs overflow-auto max-h-[300px]">
                        <pre>{JSON.stringify(editedComponent, null, 2)}</pre>
                      </div>
                    </div>
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
          <DialogContent className="sm:max-w-[800px]">
            <DialogHeader>
              <DialogTitle>Component Details</DialogTitle>
              <DialogDescription>
                View component specifications and configuration.
              </DialogDescription>
            </DialogHeader>
            
            {selectedComponent && (
              <div className="py-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-medium mb-4">Component Information</h3>
                    <div className="space-y-3">
                      <div>
                        <span className="text-sm text-muted-foreground">Name:</span>
                        <p className="font-medium">{selectedComponent.name}</p>
                      </div>
                      <div>
                        <span className="text-sm text-muted-foreground">Type:</span>
                        <p className="font-mono text-sm">{selectedComponent.type}</p>
                      </div>
                      <div>
                        <span className="text-sm text-muted-foreground">Category:</span>
                        <p>
                          <Badge className="mt-1">{selectedComponent.category}</Badge>
                        </p>
                      </div>
                      <div>
                        <span className="text-sm text-muted-foreground">Status:</span>
                        <p>
                          <Badge 
                            variant={selectedComponent.enabled ? "default" : "outline"}
                            className={`mt-1 ${selectedComponent.enabled ? "bg-green-500" : "text-red-500"}`}
                          >
                            {selectedComponent.enabled ? "Enabled" : "Disabled"}
                          </Badge>
                        </p>
                      </div>
                      <div>
                        <span className="text-sm text-muted-foreground">Description:</span>
                        <p className="text-sm mt-1">{selectedComponent.description}</p>
                      </div>
                      <div>
                        <span className="text-sm text-muted-foreground">Last Updated:</span>
                        <p className="text-sm">{selectedComponent.last_updated}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-medium mb-4">Component Preview</h3>
                    <div className="bg-gray-50 p-6 rounded-md flex items-center justify-center min-h-[200px] border">
                      {wokwiReady ? (
                        <div id="component-preview" className="component-preview-container"></div>
                      ) : (
                        <div className="text-center text-muted-foreground">
                          <Cpu className="h-10 w-10 mb-2 mx-auto animate-pulse" />
                          <p>Loading component preview...</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {selectedComponent.pinConfig && selectedComponent.pinConfig.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-lg font-medium mb-3">Pin Configuration</h3>
                    <div className="rounded-md border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Pin Name</TableHead>
                            <TableHead>X Position</TableHead>
                            <TableHead>Y Position</TableHead>
                            <TableHead>Signal Types</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedComponent.pinConfig.map((pin, index) => (
                            <TableRow key={`view-pin-${index}`}>
                              <TableCell className="font-medium">{pin.name}</TableCell>
                              <TableCell>{pin.x}</TableCell>
                              <TableCell>{pin.y}</TableCell>
                              <TableCell>
                                {pin.signals.map(signal => (
                                  <Badge key={signal} variant="outline" className="mr-1">
                                    {signal}
                                  </Badge>
                                ))}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
                
                {selectedComponent.properties && Object.keys(selectedComponent.properties).length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-lg font-medium mb-3">Component Properties</h3>
                    <div className="grid grid-cols-2 gap-2 border rounded-md p-4">
                      {Object.entries(selectedComponent.properties).map(([key, value]) => (
                        <div key={`prop-${key}`} className="flex justify-between">
                          <span className="font-medium">{key}:</span>
                          <span className="text-right">{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            <DialogFooter>
              <Button onClick={() => setIsViewDialogOpen(false)}>Close</Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsViewDialogOpen(false);
                  handleEditComponent(selectedComponent!);
                }}
              >
                Edit Component
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageLayout>
  );
};

export default ComponentLibrary;
