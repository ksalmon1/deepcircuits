
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
import { useComponentLibrary } from "@/hooks/useComponentLibrary";
import { ComponentLibraryItem } from "@/services/componentLibraryService";
import { ComponentPin } from "@/types/database";

interface PinConfig {
  name: string;
  x: number;
  y: number;
  signals: string[];
}

const getDisplayNameFromType = (type: string): string => {
  return type
    .replace('wokwi-', '')
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const getCategoryFromType = (type: string): string => {
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
  
  for (const [keyword, category] of Object.entries(categoryMap)) {
    if (type.includes(keyword)) {
      return category;
    }
  }
  
  return 'other';
};

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

const signalTypes = [
  "power", "ground", "digital", "analog", "passive", "i2c", "spi", "uart", "rx", "tx"
];

// Define a uniqueCategories array for the filter dropdown
const uniqueCategories = [
  'input', 'output', 'passive', 'microcontroller', 'sensor', 'display', 'power', 'base', 'other'
];

const ComponentLibrary = () => {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [selectedComponent, setSelectedComponent] = useState<ComponentLibraryItem | null>(null);
  const [editedComponent, setEditedComponent] = useState<ComponentLibraryItem | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [wokwiReady, setWokwiReady] = useState(false);
  const [activeTab, setActiveTab] = useState("details");
  const [showPins, setShowPins] = useState(true);
  const previewRef = useRef<HTMLDivElement>(null);
  const [newComponent, setNewComponent] = useState<Partial<ComponentLibraryItem>>({
    name: '',
    type: 'wokwi-led',
    category: 'output',
    description: '',
    enabled: true,
    isOriginal: true
  });
  
  const { 
    components, 
    isLoadingComponents, 
    createComponent, 
    updateComponent, 
    deleteComponent,
    isCreatingComponent,
    isUpdatingComponent,
    isDeletingComponent,
    useComponentDetails
  } = useComponentLibrary();
  
  // Create a state for component details 
  const [componentDetailsData, setComponentDetailsData] = useState<any>(null);
  const [isLoadingComponentDetails, setIsLoadingComponentDetails] = useState(false);
  const [componentDetailsError, setComponentDetailsError] = useState<Error | null>(null);
  
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

  // Effect to load component details when selectedComponent changes and dialog is opened
  useEffect(() => {
    const fetchComponentDetails = async () => {
      if (selectedComponent?.id && (isEditDialogOpen || isViewDialogOpen)) {
        setIsLoadingComponentDetails(true);
        setComponentDetailsError(null);
        
        try {
          // Import from service to avoid hook issues
          const { getComponentWithDetails } = await import('@/services/componentLibraryService');
          const details = await getComponentWithDetails(selectedComponent.id);
          
          console.log("Component details loaded:", details);
          setComponentDetailsData(details);
          
          if (isEditDialogOpen && details) {
            const fullComponent = {
              ...selectedComponent,
              pins: details.pins || [],
              properties: details.properties || {}
            };
            setEditedComponent(fullComponent);
          }
          
          if (isViewDialogOpen && details) {
            const fullComponent = {
              ...selectedComponent,
              pins: details.pins || [],
              properties: details.properties || {}
            };
            setSelectedComponent(fullComponent);
          }
        } catch (error) {
          console.error("Error fetching component details:", error);
          setComponentDetailsError(error instanceof Error ? error : new Error("Failed to load component details"));
          toast({
            title: "Error loading component details",
            description: "Could not load pins and properties for this component.",
            variant: "destructive"
          });
        } finally {
          setIsLoadingComponentDetails(false);
        }
      }
    };
    
    fetchComponentDetails();
  }, [selectedComponent?.id, isEditDialogOpen, isViewDialogOpen, toast]);

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (!isAdmin()) {
    return <Navigate to="/dashboard" />;
  }

  const filteredComponents = (components || []).filter(component => {
    const matchesSearch = component.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "all" || !categoryFilter ? true : component.category === categoryFilter;
    let matchesType = typeFilter === "all" || !typeFilter ? true : false;
    
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
    if (!newComponent.name || !newComponent.type || !newComponent.category) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }
    
    const pins = getComponentPinInfo(newComponent.type as string);
    const properties = getDefaultPropertiesForType(newComponent.type as string);
    
    const componentToAdd: ComponentLibraryItem = {
      name: newComponent.name,
      type: newComponent.type as string,
      category: newComponent.category as string,
      description: newComponent.description,
      enabled: newComponent.enabled === undefined ? true : newComponent.enabled,
      isOriginal: isOriginalWokwiComponent(newComponent.type as string),
      pins,
      properties
    };
    
    createComponent(componentToAdd);
    
    setNewComponent({
      name: '',
      type: 'wokwi-led',
      category: 'output',
      description: '',
      enabled: true,
      isOriginal: true
    });
    
    setIsAddDialogOpen(false);
  };

  const handleEditComponent = (component: ComponentLibraryItem) => {
    setSelectedComponent(component);
    setEditedComponent({...component});
    setIsEditDialogOpen(true);
    setActiveTab("details");
  };

  const handleViewComponent = (component: ComponentLibraryItem) => {
    setSelectedComponent(component);
    setIsViewDialogOpen(true);
  };

  const handleDeleteComponent = (component: ComponentLibraryItem) => {
    setSelectedComponent(component);
    setIsDeleteDialogOpen(true);
  };

  const handleSaveComponent = () => {
    if (!editedComponent) return;
    
    if (!editedComponent.name || !editedComponent.type || !editedComponent.category) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }
    
    if (editedComponent.type !== selectedComponent?.type) {
      editedComponent.isOriginal = isOriginalWokwiComponent(editedComponent.type);
    }
    
    updateComponent(editedComponent);
    
    setIsEditDialogOpen(false);
  };

  const handleConfirmDelete = () => {
    if (!selectedComponent || !selectedComponent.id) return;
    
    deleteComponent(selectedComponent.id);
    
    setIsDeleteDialogOpen(false);
  };

  const updateComponentProperty = (property: string, value: any) => {
    if (!editedComponent) return;
    
    setEditedComponent(prev => {
      if (!prev) return prev;
      
      if (property === 'enabled') {
        return { ...prev, enabled: value };
      }
      
      if (property === 'type') {
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
      const typedPinConfig: ComponentPin[] = pinConfig.map(pin => ({
        name: pin.name,
        x: pin.x,
        y: pin.y,
        signals: pin.signals || []
      }));
      
      return { 
        ...prev, 
        pins: typedPinConfig
      };
    });
  };

  const handleNewComponentChange = (field: string, value: any) => {
    setNewComponent(prev => ({
      ...prev,
      [field]: value
    }));
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
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingComponents ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                        Loading components...
                      </TableCell>
                    </TableRow>
                  ) : filteredComponents.length > 0 ? (
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
                        <TableCell>
                          <Badge 
                            variant={component.enabled ? "default" : "outline"}
                            className={component.enabled ? "bg-green-500" : "text-red-500"}
                          >
                            {component.enabled ? "Enabled" : "Disabled"}
                          </Badge>
                        </TableCell>
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
                      <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
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
                <Input 
                  id="name" 
                  placeholder="e.g. LED, Resistor, etc." 
                  value={newComponent.name}
                  onChange={(e) => handleNewComponentChange('name', e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <label htmlFor="category">Category</label>
                  <Select 
                    value={newComponent.category} 
                    onValueChange={(value) => handleNewComponentChange('category', value)}
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
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <label htmlFor="type">Type</label>
                  <Select 
                    value={newComponent.type} 
                    onValueChange={(value) => handleNewComponentChange('type', value)}
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
              <div className="grid gap-2">
                <label htmlFor="description">Description</label>
                <Textarea 
                  id="description" 
                  placeholder="Describe this component and its functionality"
                  rows={3}
                  value={newComponent.description}
                  onChange={(e) => handleNewComponentChange('description', e.target.value)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Switch 
                    id="enabled" 
                    checked={newComponent.enabled} 
                    onCheckedChange={(checked) => handleNewComponentChange('enabled', checked)}
                  />
                  <label htmlFor="enabled">Enable component for users</label>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
              <Button 
                onClick={handleAddComponent}
                disabled={isCreatingComponent}
              >
                {isCreatingComponent ? 'Adding...' : 'Add Component'}
              </Button>
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
                Modify component properties and configuration.
              </DialogDescription>
            </DialogHeader>

            {isLoadingComponentDetails ? (
              <div className="py-8 text-center">
                <Cpu className="h-8 w-8 mx-auto mb-2 animate-spin text-primary" />
                <p>Loading component details...</p>
              </div>
            ) : componentDetailsError ? (
              <div className="py-8 text-center text-destructive">
                <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                <p>Error loading component details</p>
                <p className="text-sm mt-2">{componentDetailsError.message}</p>
                <Button 
                  className="mt-4" 
                  variant="outline" 
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  Close
                </Button>
              </div>
            ) : editedComponent && (
              <Tabs 
                defaultValue="details" 
                className="mt-4"
                value={activeTab}
                onValueChange={setActiveTab}
              >
                <TabsList className="grid grid-cols-4">
                  <TabsTrigger value="details">Basic Details</TabsTrigger>
                  <TabsTrigger value="properties">Properties</TabsTrigger>
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
                      componentType={editedComponent.type}
                    />
                  )}
                </TabsContent>
                
                <TabsContent value="pins" className="py-4">
                  <div className="flex flex-col">
                    <div className="border rounded-md bg-gray-50 p-4">
                      <VisualPinEditor
                        componentType={editedComponent.type}
                        pins={editedComponent.pins || getComponentPinInfo(editedComponent.type)}
                        onChange={updatePinConfiguration}
                        readonly={false}
                      />
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="preview" className="py-4">
                  <div className="flex flex-col">
                    <h3 className="text-lg font-medium mb-4">Component Preview</h3>
                    
                    <div className="border rounded-md bg-gray-50 p-6">
                      <div className="flex justify-center items-center" ref={previewRef}>
                        {wokwiReady ? (
                          <EnhancedComponentPreview
                            componentType={editedComponent.type}
                            properties={editedComponent.properties || {}}
                            previewId={`preview-${editedComponent.id}`}
                          />
                        ) : (
                          <div className="text-center py-8">
                            <div className="flex justify-center mb-4">
                              <AlertCircle className="h-8 w-8 text-amber-500" />
                            </div>
                            <p className="font-medium">Loading Wokwi Elements...</p>
                            <p className="text-sm text-muted-foreground mt-1">
                              Please wait while the component preview is being initialized.
                            </p>
                          </div>
                        )}
                      </div>
                      
                      <div className="mt-6 space-y-3 text-sm">
                        <p className="font-medium">Component Properties Preview:</p>
                        <div className="bg-gray-100 p-3 rounded-md">
                          <pre className="text-xs overflow-auto max-h-40">
                            {JSON.stringify(editedComponent.properties || {}, null, 2)}
                          </pre>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            )}
            
            <DialogFooter className="mt-6">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
              <Button 
                onClick={handleSaveComponent}
                disabled={isUpdatingComponent}
              >
                {isUpdatingComponent ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="sm:max-w-[700px]">
            <DialogHeader>
              <DialogTitle>Component Details</DialogTitle>
            </DialogHeader>
            
            {isLoadingComponentDetails ? (
              <div className="py-8 text-center">
                <Cpu className="h-8 w-8 mx-auto mb-2 animate-spin text-primary" />
                <p>Loading component details...</p>
              </div>
            ) : componentDetailsError ? (
              <div className="py-8 text-center text-destructive">
                <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                <p>Error loading component details</p>
                <p className="text-sm mt-2">{componentDetailsError.message}</p>
              </div>
            ) : selectedComponent && (
              <div className="py-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                  <div>
                    <h4 className="text-sm font-medium mb-1">Component Name</h4>
                    <p>{selectedComponent.name}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium mb-1">Type</h4>
                    <p>{selectedComponent.type}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium mb-1">Category</h4>
                    <Badge 
                      variant={
                        selectedComponent.category === "microcontroller" ? "default" : 
                        selectedComponent.category === "input" ? "secondary" : 
                        "outline"
                      }
                    >
                      {selectedComponent.category}
                    </Badge>
                  </div>
                </div>
                
                <div className="mb-4">
                  <h4 className="text-sm font-medium mb-1">Description</h4>
                  <p className="text-sm text-muted-foreground">
                    {selectedComponent.description || "No description provided."}
                  </p>
                </div>
                
                <div className="mb-4">
                  <h4 className="text-sm font-medium mb-1">Status</h4>
                  <Badge 
                    variant={selectedComponent.enabled ? "default" : "outline"}
                    className={selectedComponent.enabled ? "bg-green-500" : "text-red-500"}
                  >
                    {selectedComponent.enabled ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
                
                <div className="mb-4">
                  <h4 className="text-sm font-medium mb-1">Properties</h4>
                  {selectedComponent.properties && Object.keys(selectedComponent.properties).length > 0 ? (
                    <div className="bg-gray-100 p-3 rounded-md">
                      <pre className="text-xs overflow-auto max-h-40">
                        {JSON.stringify(selectedComponent.properties, null, 2)}
                      </pre>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No properties defined.</p>
                  )}
                </div>
                
                <div>
                  <h4 className="text-sm font-medium mb-2">Pin Configuration</h4>
                  {selectedComponent.pins && selectedComponent.pins.length > 0 ? (
                    <div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Position X</TableHead>
                            <TableHead>Position Y</TableHead>
                            <TableHead>Signals</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedComponent.pins.map((pin, index) => (
                            <TableRow key={index}>
                              <TableCell>{pin.name}</TableCell>
                              <TableCell>{pin.x}</TableCell>
                              <TableCell>{pin.y}</TableCell>
                              <TableCell>
                                {pin.signals && pin.signals.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {pin.signals.map((signal, idx) => (
                                      <Badge key={idx} variant="outline">{signal}</Badge>
                                    ))}
                                  </div>
                                ) : (
                                  "None"
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No pin configuration defined.</p>
                  )}
                </div>
              </div>
            )}
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>Close</Button>
              <Button onClick={() => {
                setIsViewDialogOpen(false);
                if (selectedComponent) {
                  handleEditComponent(selectedComponent);
                }
              }}>
                Edit Component
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Confirm Delete</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this component? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            
            {selectedComponent && (
              <div className="py-4">
                <p className="font-medium">{selectedComponent.name}</p>
                <p className="text-sm text-muted-foreground mt-1">{selectedComponent.type}</p>
              </div>
            )}
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
              <Button 
                variant="destructive" 
                onClick={handleConfirmDelete}
                disabled={isDeletingComponent}
              >
                {isDeletingComponent ? 'Deleting...' : 'Delete Component'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageLayout>
  );
};

export default ComponentLibrary;
