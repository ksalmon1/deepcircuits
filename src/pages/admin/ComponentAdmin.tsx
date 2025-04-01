import React, { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useProfile } from "@/hooks/use-profile";
import PageLayout from "@/components/layout/PageLayout";
import ComponentTable from "./components/ComponentTable";
import ComponentSearch from "./components/ComponentSearch";
import AddComponentDialog from "./components/AddComponentDialog";
import EditComponentDialog from "./components/EditComponentDialog";
import ViewComponentDialog from "./components/ViewComponentDialog";
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
import { toast } from "sonner";
import { getAllComponents, getComponentWithDetails } from "@/services/componentLibrary/api";
import { useComponentLibrary } from "@/hooks/useComponentLibrary";

const ComponentAdmin = () => {
  const { user } = useAuth();
  const { isLoading: isProfileLoading } = useProfile();
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [components, setComponents] = useState<ComponentLibraryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [uniqueCategories, setUniqueCategories] = useState<string[]>([]);
  const [uniqueTypes, setUniqueTypes] = useState<string[]>([]);
  
  const [newComponent, setNewComponent] = useState<Partial<ComponentLibraryItem>>({
    name: "",
    type: "",
    category: "",
    description: "",
    enabled: true,
    isOriginal: false
  });
  
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedComponent, setSelectedComponent] = useState<ComponentLibraryItem | null>(null);
  const [editedComponent, setEditedComponent] = useState<ComponentLibraryItem | null>(null);
  const [isLoadingComponentDetails, setIsLoadingComponentDetails] = useState(false);
  const [componentDetailsError, setComponentDetailsError] = useState<Error | null>(null);
  const [activeTab, setActiveTab] = useState("details");
  
  const { 
    updateComponent,
    isUpdatingComponent,
    updateComponentError
  } = useComponentLibrary();

  console.log("ComponentAdmin: Rendering", { isLoading: isProfileLoading });

  useEffect(() => {
    fetchComponents();
  }, []);

  const fetchComponents = async () => {
    try {
      setIsLoading(true);
      console.log("Fetching components...");
      const data = await getAllComponents();
      console.log("Fetched components:", data);
      setComponents(data);
      
      const categories = [...new Set(data.map(comp => comp.category))];
      const types = [...new Set(data.map(comp => comp.type))];
      setUniqueCategories(categories);
      setUniqueTypes(types);
    } catch (error) {
      console.error("Error fetching components:", error);
      toast.error("Failed to load components", {
        description: "Please try refreshing the page",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isProfileLoading) {
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

  const handleNewComponentChange = (field: string, value: any) => {
    setNewComponent(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddComponent = async () => {
    toast.success("Component added successfully");
    setIsAddDialogOpen(false);
    fetchComponents();
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
    fetchComponents();
    toast.success("Components refreshed");
  };

  const updateComponentProperty = (property: string, value: any) => {
    if (!editedComponent) return;
    
    setEditedComponent(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        [property]: value
      };
    });
  };

  const updateComponentProperties = (properties: Record<string, any>) => {
    if (!editedComponent) return;
    
    setEditedComponent(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        properties: {
          ...(prev.properties || {}),
          ...properties
        }
      };
    });
  };

  const updatePinConfiguration = (pinConfig: any[]) => {
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
      toast.success("Component updated successfully");
      setIsEditDialogOpen(false);
      setEditedComponent(null);
      fetchComponents();
    } catch (error) {
      console.error("Error updating component:", error);
      toast.error("Failed to update component", {
        description: error instanceof Error ? error.message : "Unknown error"
      });
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
          newComponent={{
            name: "",
            type: "",
            category: "",
            description: "",
            enabled: true,
            isOriginal: false
          }}
          onNewComponentChange={handleNewComponentChange}
          onAddComponent={handleAddComponent}
          isCreatingComponent={false}
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
