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
  ORIGINAL_WOKWI_COMPONENTS
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
    return mockComponents.map(comp => ({
      ...comp,
      isOriginal: isOriginalWokwiComponent(comp.type)
    }));
  });
  
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
    const matchesType = typeFilter === "all" || !typeFilter ? true : component.type === typeFilter;
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
                    
                    <div className="mt-4">
                      <EnhancedComponentPreview
                        componentType={editedComponent.type}
                        properties={editedComponent.properties || {}}
                        customSvgPath={editedComponent.svgPath}
                        previewId="details-preview"
                        showPins={showPins}
                        onShowPinsChange={setShowPins}
                        isOriginalComponent={editedComponent.isOriginal}
                      />
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="properties" className="py-4">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <DynamicPropertyEditor
                      properties={editedComponent.properties || {}}
                      componentType={editedComponent.type}
                      onChange={updateComponentProperties}
                    />
                    
                    <EnhancedComponentPreview
                      componentType={editedComponent.type}
                      properties={editedComponent.properties || {}}
                      customSvgPath={editedComponent.svgPath}
                      previewId="property-preview"
                      showPins={showPins}
                      onShowPinsChange={setShowPins}
                      isOriginalComponent={editedComponent.isOriginal}
                    />
                  </div>
                </TabsContent>
                
                <TabsContent value="pins" className="py-4">
                  {editedComponent.isOriginal ? (
                    <div className="p-6 text-center border rounded-md bg-muted">
                      <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">Pin Configuration Not Editable</h3>
                      <p className="text-muted-foreground max-w-md mx-auto">
                        Pin configuration for original Wokwi components is predefined 
                        and cannot be modified. You can view the pins in the preview tab.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      <div className="lg:col-span-2">
                        <VisualPinEditor
                          pins={editedComponent.pinConfig || []}
                          componentType={editedComponent.type}
                          onChange={updatePinConfiguration}
                        />
                      </div>
                      
                      <div>
                        <EnhancedComponentPreview
                          componentType={editedComponent.type}
                          properties={editedComponent.properties || {}}
                          customSvgPath={editedComponent.svgPath}
                          previewId="pinEditor-component-preview"
                          showPins={showPins}
                          onShowPinsChange={setShowPins}
                          isOriginalComponent={editedComponent.isOriginal}
                        />
                        
                        <div className="mt-4 p-4 border rounded-md bg-gray-50">
                          <h4 className="font-medium mb-2">Pin Configuration Tips</h4>
                          <ul className="text-sm space-y-2 text-muted-foreground">
                            <li>• Click a pin marker and then click on the grid to reposition it</li>
                            <li>• Pins should be positioned relative to the component's outline</li>
                            <li>• For accurate simulation, ensure pin positions match actual component pins</li>
                            <li>• Each pin must have at least one signal type</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="preview" className="py-4">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <EnhancedComponentPreview
                      componentType={editedComponent.type}
                      properties={editedComponent.properties || {}}
                      customSvgPath={editedComponent.svgPath}
                      previewId="edit-component-preview"
                      showPins={showPins}
                      onShowPinsChange={setShowPins}
                      isOriginalComponent={editedComponent.isOriginal}
                    />
                    
                    <div className="border rounded-md p-4">
                      <h3 className="text-lg font-medium mb-3">Component JSON</h3>
                      <div className="bg-gray-100 rounded-md p-4 font-mono text-xs overflow-auto max-h-[320px]">
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
              <DialogTitle className="flex items-center gap-2">
                Component Details
                {selectedComponent?.isOriginal && (
                  <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">
                    Original Wokwi Component
                  </Badge>
                )}
              </DialogTitle>
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
                    <EnhancedComponentPreview
                      componentType={selectedComponent.type}
                      properties={selectedComponent.properties || {}}
                      customSvgPath={selectedComponent.svgPath}
                      previewId="component-preview"
                      showPins={showPins}
                      onShowPinsChange={setShowPins}
                      isOriginalComponent={selectedComponent.isOriginal}
                    />
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

        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="text-destructive">Delete Component</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this component? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              {selectedComponent && (
                <div className="flex items-center gap-3 p-3 border rounded-md bg-gray-50">
                  <div className="w-10 h-10 flex items-center justify-center bg-red-100 rounded-md">
                    <AlertCircle className="h-6 w-6 text-destructive" />
                  </div>
                  <div>
                    <p className="font-medium">{selectedComponent.name}</p>
                    <p className="text-sm text-muted-foreground">{selectedComponent.type}</p>
                  </div>
                </div>
              )}
            </div>
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
