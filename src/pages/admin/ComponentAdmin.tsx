
import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useProfile } from "@/hooks/use-profile";
import PageLayout from "@/components/layout/PageLayout";
import ComponentTable from "./components/ComponentTable";
import ComponentSearch from "./components/ComponentSearch";
import AddComponentDialog from "./components/AddComponentDialog";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw } from "lucide-react";

const ComponentAdmin = () => {
  const { user } = useAuth();
  const { isAdmin, isLoading } = useProfile();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false);

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
          searchQuery={searchQuery} 
          setSearchQuery={setSearchQuery} 
        />

        <ComponentTable searchQuery={searchQuery} />

        <AddComponentDialog 
          open={isAddDialogOpen} 
          onOpenChange={setIsAddDialogOpen} 
        />
      </div>
    </PageLayout>
  );
};

export default ComponentAdmin;
