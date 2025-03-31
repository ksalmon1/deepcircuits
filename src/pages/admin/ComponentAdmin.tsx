
import React, { useState } from "react";
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

const ComponentAdmin = () => {
  const { user } = useAuth();
  const { isAdmin, isLoading } = useProfile();
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [components, setComponents] = useState<ComponentLibraryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uniqueCategories, setUniqueCategories] = useState<string[]>([]);
  const [newComponent, setNewComponent] = useState<Partial<ComponentLibraryItem>>({
    name: "",
    type: "",
    category: "",
    description: "",
    enabled: true,
    isOriginal: false
  });
  const [isCreatingComponent, setIsCreatingComponent] = useState(false);

  console.log("ComponentAdmin: Rendering", { isAdmin: isAdmin ? isAdmin() : false, isLoading });

  if (isLoading) {
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
  };

  const handleViewComponent = (component: ComponentLibraryItem) => {
    // View component implementation
  };

  const handleEditComponent = (component: ComponentLibraryItem) => {
    // Edit component implementation
  };

  const handleDeleteComponent = (component: ComponentLibraryItem) => {
    // Delete component implementation
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
                components={components} 
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
