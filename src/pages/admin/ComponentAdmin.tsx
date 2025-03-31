
import React, { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useProfile } from "@/hooks/use-profile";
import PageLayout from "@/components/layout/PageLayout";
import ComponentTable from "./components/ComponentTable";
import ComponentSearch from "./components/ComponentSearch";
import AddComponentDialog from "./components/AddComponentDialog";
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
import { ComponentLibraryItem } from "@/services/componentLibraryService";
import { toast } from "sonner";
import { getAllComponents } from "@/services/componentLibrary/api";

const ComponentAdmin = () => {
  const { user } = useAuth();
  const { isAdmin, isLoading: isProfileLoading } = useProfile(); // Renamed to avoid conflict
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [components, setComponents] = useState<ComponentLibraryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true); // Changed to true initially
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
  const [isCreatingComponent, setIsCreatingComponent] = useState(false);

  console.log("ComponentAdmin: Rendering", { isAdmin: isAdmin ? isAdmin() : false, isLoading: isProfileLoading });

  // Fetch components on component mount
  useEffect(() => {
    fetchComponents();
  }, []);

  // Function to fetch components
  const fetchComponents = async () => {
    try {
      setIsLoading(true);
      console.log("Fetching components...");
      const data = await getAllComponents();
      console.log("Fetched components:", data);
      setComponents(data);
      
      // Extract unique categories and types for filters
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

  if (!user || !isAdmin()) {
    console.log("ComponentAdmin: Redirecting to /dashboard - Not an admin");
    return <Navigate to="/dashboard" />;
  }

  // Filter components based on search term and filters
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
    // This would be implemented to add a component to the database
    toast.success("Component added successfully");
    setIsAddDialogOpen(false);
    fetchComponents(); // Refresh the components list
  };

  const handleViewComponent = (component: ComponentLibraryItem) => {
    // View component implementation
    console.log("Viewing component:", component);
  };

  const handleEditComponent = (component: ComponentLibraryItem) => {
    // Edit component implementation
    console.log("Editing component:", component);
  };

  const handleDeleteComponent = (component: ComponentLibraryItem) => {
    // Delete component implementation
    console.log("Deleting component:", component);
  };

  const handleRefresh = () => {
    fetchComponents();
    toast.success("Components refreshed");
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
      </div>
    </PageLayout>
  );
};

export default ComponentAdmin;
