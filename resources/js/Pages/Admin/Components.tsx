import React, { useState, useEffect } from "react";
import { Navigate } from '@/lib/router';
import { useAuth } from "@/context/AuthContext";
import { useProfile } from "@/hooks/use-profile";
import PageLayout from "@/components/layout/PageLayout";
import ComponentTable from "@/components/admin-dialogs/ComponentTable";
import ComponentSearch from "@/components/admin-dialogs/ComponentSearch";
import AddComponentDialog from "@/components/admin-dialogs/AddComponentDialog";
import EditComponentDialog from "@/components/admin-dialogs/EditComponentDialog";
import ViewComponentDialog from "@/components/admin-dialogs/ViewComponentDialog";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw } from "lucide-react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { ComponentLibraryItem } from '@/types/component';
import { ComponentPin } from '@/types/pin';
import { toast } from "sonner";
import { getComponentWithDetails } from "@/services/componentLibrary/api";
import { useComponentLibrary } from "@/hooks/useComponentLibrary";

const ComponentAdmin = () => {
  const { user } = useAuth();
  const { isLoading: isProfileLoading } = useProfile();
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [uniqueCategories, setUniqueCategories] = useState<string[]>([]);
  const [uniqueTypes, setUniqueTypes] = useState<string[]>([]);
  
  const initialNewComponentState: Partial<ComponentLibraryItem> = {
    name: "",
    type: "",
    category: "",
    description: "",
    enabled: true,
    isOriginal: false // Assuming new components added via UI are not "original"
  };
  
  const [newComponent, setNewComponent] = useState<Partial<ComponentLibraryItem>>(initialNewComponentState);
  
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedComponent, setSelectedComponent] = useState<ComponentLibraryItem | null>(null);
  const [editedComponent, setEditedComponent] = useState<ComponentLibraryItem | null>(null);
  const [isLoadingComponentDetails, setIsLoadingComponentDetails] = useState(false);
  const [componentDetailsError, setComponentDetailsError] = useState<Error | null>(null);
  const [activeTab, setActiveTab] = useState("details");
  
  const { 
    components = [],
    isLoadingComponents: isLoading,
    componentsError,
    refetchLibrary,
    createComponent,
    isCreatingComponent,
    updateComponent,
    isUpdatingComponent,
  } = useComponentLibrary();

  console.log("ComponentAdmin: Rendering", { isLoading: isProfileLoading || isLoading });

  useEffect(() => {
    if (components && components.length > 0) {
      const categories = [...new Set(components.map(comp => comp.category).filter(Boolean))];
      const types = [...new Set(components.map(comp => comp.type).filter(Boolean))];
      setUniqueCategories(categories as string[]);
      setUniqueTypes(types as string[]);
    } else {
      setUniqueCategories([]);
      setUniqueTypes([]);
    }
  }, [components]);

  useEffect(() => {
    if (componentsError) {
      toast.error("Failed to load components", {
        description: componentsError.message || "Please try refreshing the page",
      });
    }
  }, [componentsError]);

  if (isProfileLoading || isLoading) {
    return (
      <PageLayout>
        <div className="container py-8">
          <h1 className="text-3xl font-bold mb-6">Loading Component Admin...</h1>
        </div>
      </PageLayout>
    );
  }

  if (!user) {
    console.log("ComponentAdmin: Redirecting to /dashboard - Not logged in");
    return <Navigate to="/dashboard" />;
  }

  const filteredComponents = components.filter(comp => {
    const matchesSearch = comp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         comp.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         comp.type.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = categoryFilter === "all" || comp.category === categoryFilter;
    const matchesType = typeFilter === "all" || comp.type === typeFilter;
    
    return matchesSearch && matchesCategory && matchesType;
  });

  const handleNewComponentChange = (field: string, value: unknown) => {
    setNewComponent(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddComponent = async () => {
    if (!newComponent.name || !newComponent.type || !newComponent.category) {
      toast.error("Please fill in all required fields (Name, Type, Category).");
      return;
    }
    
    try {
      const componentToAdd: ComponentLibraryItem = {
        ...(initialNewComponentState as Omit<ComponentLibraryItem, 'id'>),
        ...newComponent,
        id: '',
        name: newComponent.name,
        type: newComponent.type,
        category: newComponent.category,
        pins: newComponent.pins || [],
        properties: newComponent.properties || {},
        svgPath: newComponent.svgPath || '',
        isOriginal: newComponent.isOriginal ?? false,
        enabled: newComponent.enabled ?? true,
      };

      await createComponent(componentToAdd);
      setIsAddDialogOpen(false);
      setNewComponent(initialNewComponentState);
    } catch (error) {
      console.error("Error creating component locally (mutation might handle toast):", error);
    }
  };

  const handleViewComponent = async (component: ComponentLibraryItem) => {
    console.log("Viewing component:", component);
    setSelectedComponent(component);
    setIsViewDialogOpen(true);
  };

  const handleEditComponent = async (component: ComponentLibraryItem) => {
    console.log("Editing component:", component);
    setIsLoadingComponentDetails(true);
    setComponentDetailsError(null);
    setSelectedComponent(component);
    setActiveTab("details");
    
    try {
      const componentDetails = await getComponentWithDetails(component.id as string);
      setEditedComponent(componentDetails);
      setIsEditDialogOpen(true);
    } catch (error) {
      console.error("Error loading component details:", error);
      setComponentDetailsError(error instanceof Error ? error : new Error('Failed to load component details'));
      toast.error("Failed to load component details");
    } finally {
      setIsLoadingComponentDetails(false);
    }
  };

  const handleDeleteComponent = (component: ComponentLibraryItem) => {
    console.log("Deleting component:", component);
  };

  const handleRefresh = () => {
    refetchLibrary();
  };

  const updateComponentProperty = (property: string, value: unknown) => {
    if (!editedComponent) return;
    
    setEditedComponent(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        [property]: value
      };
    });
  };

  const updateComponentProperties = (properties: Record<string, unknown>) => {
    if (!editedComponent) return;
    
    setEditedComponent(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        properties: properties
      };
    });
  };

  const updatePinConfiguration = (pinConfig: ComponentPin[]) => {
    if (!editedComponent) return;
    
    setEditedComponent(prev => {
      if (!prev) return prev;
      console.log("ComponentAdmin: Updating pins. Old:", prev.pins, "New:", pinConfig);
      return {
        ...prev,
        pins: pinConfig
      };
    });
  };

  const handleSaveComponent = async () => {
    if (!editedComponent) return;
    
    try {
      await updateComponent(editedComponent);
      setIsEditDialogOpen(false);
      setEditedComponent(null);
    } catch (error) {
      console.error("Error updating component locally (mutation might handle toast):", error);
    }
  };

  return (
    <PageLayout>
      <div className="container py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Component Library Management</h1>
            <p className="text-gray-500 mt-2">Add, edit, and manage components in the library</p>
          </div>
          <div className="flex gap-2 mt-4 md:mt-0">
            <Button 
              variant="outline" 
              className="flex items-center gap-2"
              onClick={handleRefresh}
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            <Button 
              className="flex items-center gap-2"
              onClick={() => setIsAddDialogOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Add Component
            </Button>
          </div>
        </div>

        <ComponentSearch 
          searchTerm={searchTerm} 
          onSearchChange={setSearchTerm}
          categoryFilter={categoryFilter}
          onCategoryFilterChange={setCategoryFilter}
          typeFilter={typeFilter}
          onTypeFilterChange={setTypeFilter}
          uniqueCategories={uniqueCategories}
          uniqueTypes={uniqueTypes}
        />

        <div className="bg-white rounded-md shadow">
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
                isLoading={isLoading}
                onEdit={handleEditComponent}
                onView={handleViewComponent}
                onDelete={handleDeleteComponent}
              />
            </TableBody>
          </Table>
        </div>

        <AddComponentDialog
          isOpen={isAddDialogOpen}
          onOpenChange={setIsAddDialogOpen}
          newComponent={newComponent}
          onNewComponentChange={handleNewComponentChange}
          onAddComponent={handleAddComponent}
          isCreatingComponent={isCreatingComponent}
        />

        {selectedComponent && (
          <ViewComponentDialog
            isOpen={isViewDialogOpen}
            onOpenChange={setIsViewDialogOpen}
            component={selectedComponent}
          />
        )}

        {selectedComponent && (
          <EditComponentDialog
            isOpen={isEditDialogOpen}
            onOpenChange={setIsEditDialogOpen}
            selectedComponent={selectedComponent}
            editedComponent={editedComponent}
            isLoadingDetails={isLoadingComponentDetails}
            detailsError={componentDetailsError}
            onSave={handleSaveComponent}
            onPinUpdate={updatePinConfiguration}
            onPropertyUpdate={updateComponentProperties}
            updateComponentProperty={updateComponentProperty}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />
        )}
      </div>
    </PageLayout>
  );
};

export default ComponentAdmin;
