
import React, { useState, useEffect } from "react";
import PageLayout from "@/components/layout/PageLayout";
import { useAuth } from "@/context/AuthContext";
import { useProfile } from "@/hooks/use-profile";
import { Navigate } from "react-router-dom";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableBody, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Cpu, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { 
  isWokwiLoaded, 
  forceLoadWokwiElements,
  isOriginalWokwiComponent,
  getComponentPinInfo
} from '@/integrations/wokwi/WokwiIntegration';
import { useComponentLibrary } from "@/hooks/useComponentLibrary";
import { ComponentLibraryItem } from "@/services/componentLibraryService";

// Import sub-components
import ComponentTable from "./components/ComponentTable";
import ComponentSearch from "./components/ComponentSearch";
import AddComponentDialog from "./components/AddComponentDialog";
import ViewComponentDialog from "./components/ViewComponentDialog";
import EditComponentDialog from "./components/EditComponentDialog";
import DeleteComponentDialog from "./components/DeleteComponentDialog";

// Import utilities
import { 
  getDefaultPropertiesForType,
  uniqueCategories
} from "./components/ComponentUtils";

/**
 * Component Library Admin Page
 * Allows administrators to manage components in the library
 */
const ComponentLibrary = () => {
  const { user } = useAuth();
  const { isAdmin } = useProfile();
  const { toast } = useToast();
  
  // Filter and search state
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  
  // Component state management
  const [selectedComponent, setSelectedComponent] = useState<ComponentLibraryItem | null>(null);
  const [editedComponent, setEditedComponent] = useState<ComponentLibraryItem | null>(null);
  
  // Dialog control state
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  
  // Wokwi and UI state
  const [wokwiReady, setWokwiReady] = useState(false);
  const [activeTab, setActiveTab] = useState("details");
  
  // New component form state
  const [newComponent, setNewComponent] = useState<Partial<ComponentLibraryItem>>({
    name: '',
    type: 'wokwi-led',
    category: 'output',
    description: '',
    enabled: true,
    isOriginal: true
  });
  
  // Get component data and operations from the hook
  const { 
    components, 
    isLoadingComponents, 
    createComponent, 
    updateComponent, 
    deleteComponent,
    isCreatingComponent,
    isUpdatingComponent,
    isDeletingComponent,
    updateComponentError,
  } = useComponentLibrary();
  
  // Component detail loading state
  const [componentDetailsData, setComponentDetailsData] = useState<any>(null);
  const [isLoadingComponentDetails, setIsLoadingComponentDetails] = useState(false);
  const [componentDetailsError, setComponentDetailsError] = useState<Error | null>(null);
  
  // Load Wokwi elements on component mount
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

  // Load component details when selected component changes and dialog is opened
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

  // Display toast when update error occurs
  useEffect(() => {
    if (updateComponentError) {
      toast({
        title: "Error updating component",
        description: updateComponentError instanceof Error 
          ? updateComponentError.message 
          : "Failed to update component. Make sure the component type is unique.",
        variant: "destructive"
      });
    }
  }, [updateComponentError, toast]);

  // Redirect if not authenticated or not admin
  if (!user) {
    return <Navigate to="/login" />;
  }

  if (!isAdmin()) {
    return <Navigate to="/dashboard" />;
  }

  // Filter components based on search and filters
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

  // Event handlers
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
    
    try {
      if (editedComponent.type !== selectedComponent?.type) {
        editedComponent.isOriginal = isOriginalWokwiComponent(editedComponent.type);
      }
      
      updateComponent(editedComponent);
      setIsEditDialogOpen(false);
    } catch (error) {
      console.error("Error saving component:", error);
      toast({
        title: "Error saving component",
        description: error instanceof Error 
          ? error.message 
          : "An unknown error occurred while saving the component.",
        variant: "destructive"
      });
    }
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
  
  const updatePinConfiguration = (pinConfig: any[]) => {
    if (!editedComponent) return;
    
    setEditedComponent(prev => {
      if (!prev) return prev;
      const typedPinConfig = pinConfig.map(pin => ({
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
            <ComponentSearch 
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              categoryFilter={categoryFilter}
              onCategoryFilterChange={setCategoryFilter}
              typeFilter={typeFilter}
              onTypeFilterChange={setTypeFilter}
              uniqueCategories={uniqueCategories}
            />

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
                  <ComponentTable 
                    components={filteredComponents}
                    isLoading={isLoadingComponents}
                    onEdit={handleEditComponent}
                    onView={handleViewComponent}
                    onDelete={handleDeleteComponent}
                  />
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Add Component Dialog */}
        <AddComponentDialog 
          isOpen={isAddDialogOpen}
          onOpenChange={setIsAddDialogOpen}
          newComponent={newComponent}
          onNewComponentChange={handleNewComponentChange}
          onAddComponent={handleAddComponent}
          isCreatingComponent={isCreatingComponent}
        />

        {/* Edit Component Dialog */}
        <EditComponentDialog 
          isOpen={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          selectedComponent={selectedComponent}
          editedComponent={editedComponent}
          isLoadingComponentDetails={isLoadingComponentDetails}
          componentDetailsError={componentDetailsError}
          wokwiReady={wokwiReady}
          activeTab={activeTab}
          onActiveTabChange={setActiveTab}
          onSaveComponent={handleSaveComponent}
          isUpdatingComponent={isUpdatingComponent}
          updateComponentProperty={updateComponentProperty}
          updateComponentProperties={updateComponentProperties}
          updatePinConfiguration={updatePinConfiguration}
        />

        {/* View Component Dialog */}
        <ViewComponentDialog 
          isOpen={isViewDialogOpen}
          onOpenChange={setIsViewDialogOpen}
          selectedComponent={selectedComponent}
          isLoadingComponentDetails={isLoadingComponentDetails}
          componentDetailsError={componentDetailsError}
          onEditClick={() => {
            setIsViewDialogOpen(false);
            if (selectedComponent) {
              handleEditComponent(selectedComponent);
            }
          }}
        />

        {/* Delete Component Dialog */}
        <DeleteComponentDialog 
          isOpen={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
          selectedComponent={selectedComponent}
          onConfirmDelete={handleConfirmDelete}
          isDeletingComponent={isDeletingComponent}
        />
      </div>
    </PageLayout>
  );
};

export default ComponentLibrary;
