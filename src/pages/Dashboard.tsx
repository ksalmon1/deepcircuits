import React, { useState, useMemo, useEffect } from "react";
import PageLayout from "@/components/layout/PageLayout";
import { useAuth } from "@/context/AuthContext";
import { useProfile } from "@/hooks/use-profile";
import { Button } from "@/components/ui/button";
import { Plus, Search, ArrowUpDown } from "lucide-react";
import ProjectCard, { ProjectData } from "@/components/common/ProjectCard";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { getDashboardProjectsByUserId, DashboardProject, deleteProjectById, createProject } from "@/integrations/supabase/projectsApi";

type SortOption = "name-asc" | "name-desc" | "date-asc" | "date-desc";

const Dashboard = () => {
  const { user } = useAuth();
  const { profile } = useProfile();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<DashboardProject[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState<SortOption>("date-desc");
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false);
  const [projectToDeleteId, setProjectToDeleteId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState<boolean>(false);

  useEffect(() => {
    if (user?.id) {
      setIsLoading(true);
      setError(null);
      console.log('Dashboard: Fetching projects for user:', user.id);
      getDashboardProjectsByUserId(user.id)
        .then(data => {
          console.log('Dashboard: Projects fetched successfully', data);
          setProjects(data);
        })
        .catch(err => {
          console.error('Dashboard: Error fetching projects:', err);
          setError("Failed to load your projects. Please try again later.");
          toast.error("Failed to load projects", {
            description: err.message || "An unknown error occurred.",
          });
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
        setIsLoading(false);
        setProjects([]);
        console.log('Dashboard: No user ID available, skipping fetch.');
    }
  }, [user?.id]);

  const handleCreateProject = async () => {
    if (!user?.id) {
      toast.error("You must be logged in to create a project.");
      return;
    }
    if (isCreating) return;

    setIsCreating(true);
    const newProjectId = crypto.randomUUID();
    const newProjectName = "Untitled Project";

    console.log(`Dashboard: Attempting to create project ${newProjectName} (${newProjectId})`);
    try {
      const createdProject = await createProject(newProjectId, user.id, newProjectName);

      if (createdProject) {
        console.log(`Dashboard: Project created successfully in DB. Navigating...`, createdProject);
        const newDashboardProject: DashboardProject = {
          id: createdProject.id,
          name: createdProject.name,
          description: createdProject.description,
          updated_at: createdProject.updated_at
        };
        setProjects(prevProjects => [newDashboardProject, ...prevProjects]);

        toast.success("New project created", {
          description: `Navigating to editor...`,
        });
        navigate(`/circuit-editor/${newProjectId}`);
      } else {
        throw new Error("Project creation call returned no data.");
      }
    } catch (err) {
      console.error("Dashboard: Error creating project:", err);
      toast.error("Failed to create project", {
        description: err instanceof Error ? err.message : "An unknown error occurred.",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteProject = (id: string) => {
    if (!id || isDeleting) return;
    setProjectToDeleteId(id);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteProject = async () => {
    if (!projectToDeleteId || isDeleting) return;
    
    const idToDelete = projectToDeleteId;
    setIsDeleting(idToDelete);
    setIsDeleteDialogOpen(false);
    setProjectToDeleteId(null);
    
    console.log(`Dashboard: Confirming delete for project ${idToDelete}`);
    try {
      await deleteProjectById(idToDelete);
      setProjects(prevProjects => prevProjects.filter(project => project.id !== idToDelete));
      console.log(`Dashboard: Project ${idToDelete} deleted successfully locally.`);
      toast.success("Project deleted successfully");
    } catch (err) {
      console.error(`Dashboard: Error deleting project ${idToDelete}:`, err);
      toast.error("Failed to delete project", {
        description: err instanceof Error ? err.message : "An unknown error occurred.",
      });
    } finally {
      setIsDeleting(null);
    }
  };

  const cancelDeleteProject = () => {
     setIsDeleteDialogOpen(false);
     setProjectToDeleteId(null);
  };

  const filteredProjects = useMemo(() => {
    let result = projects.filter(project => 
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (project.description && project.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );
    
    return result.sort((a, b) => {
      switch (sortOption) {
        case "name-asc":
          return a.name.localeCompare(b.name);
        case "name-desc":
          return b.name.localeCompare(a.name);
        case "date-asc":
          return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
        case "date-desc":
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        default:
          return 0;
      }
    });
  }, [projects, searchQuery, sortOption]);

  return (
    <PageLayout>
      <div className="container py-12">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold">Dashboard</h1>
        </div>

        <div className="mb-8 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold">Welcome, {profile?.display_name || user?.email}</h2>
          <p className="text-slate-600">
            This is your dashboard where you'll manage your circuit projects.
          </p>
        </div>
      
        <div className="mb-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Your Projects</h2>
            <Button onClick={handleCreateProject} disabled={isCreating}>
              <Plus className="mr-1 h-4 w-4" />
              {isCreating ? 'Creating...' : 'New Project'}
            </Button>
          </div>
          
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative flex-grow">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search projects..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="flex gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="flex items-center gap-1">
                    <ArrowUpDown className="h-4 w-4" />
                    Sort
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setSortOption("name-asc")}>
                    Name (A-Z)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortOption("name-desc")}>
                    Name (Z-A)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortOption("date-desc")}>
                    Newest first
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortOption("date-asc")}>
                    Oldest first
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {isLoading && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[...Array(4)].map((_, index) => (
              <div key={index} className="flex flex-col space-y-3">
                <Skeleton className="h-[125px] w-full rounded-xl" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[200px]" />
                  <Skeleton className="h-4 w-[150px]" />
                </div>
              </div>
            ))}
          </div>
        )}
        
        {!isLoading && error && (
           <div className="col-span-full rounded-md border border-destructive bg-destructive/10 p-4 text-center text-destructive">
            <p><strong>Error:</strong> {error}</p>
          </div>
        )}

        {!isLoading && !error && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onDelete={handleDeleteProject}
                isDeleting={isDeleting === project.id}
              />
            ))}
            
            {projects.length === 0 && (
              <div className="col-span-full py-12 text-center text-slate-500">
                <p>You don't have any projects yet. Create your first project using the "New Project" button.</p>
              </div>
            )}
            
            {projects.length > 0 && filteredProjects.length === 0 && (
              <div className="col-span-full py-12 text-center text-slate-500">
                <p>No projects match your search criteria. Try adjusting your filters.</p>
              </div>
            )}
          </div>
        )}
      </div>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the project 
              and all associated data from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelDeleteProject}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteProject}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting === projectToDeleteId}
            >
              {isDeleting === projectToDeleteId ? 'Deleting...' : 'Delete Project'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageLayout>
  );
};

export default Dashboard;
