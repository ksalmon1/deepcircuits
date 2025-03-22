
import React, { useState, useMemo } from "react";
import PageLayout from "@/components/PageLayout";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut, Plus, Search, ArrowUpDown } from "lucide-react";
import ProjectCard, { ProjectData } from "@/components/ProjectCard";
import NewProjectCard from "@/components/NewProjectCard";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import ProfileSection from "@/components/ProfileSection";
import DashboardAnalytics from "@/components/DashboardAnalytics";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Sample project data - in a real app, this would come from a database
const sampleProjects: ProjectData[] = [
  {
    id: "1",
    name: "LED Blink Circuit",
    description: "Simple Arduino circuit that blinks an LED on and off.",
    updatedAt: "2023-09-15T14:48:00.000Z",
  },
  {
    id: "2",
    name: "Temperature Sensor",
    description: "Circuit that reads temperature using a DHT22 sensor and displays it on an LCD.",
    updatedAt: "2023-10-02T09:23:00.000Z",
  },
  {
    id: "3",
    name: "Motor Control",
    description: "DC motor control circuit with speed adjustment.",
    updatedAt: "2023-11-10T15:30:00.000Z",
  },
  {
    id: "4",
    name: "IoT Weather Station",
    description: "ESP32-based weather station that uploads data to the cloud.",
    updatedAt: "2023-12-05T11:20:00.000Z",
  },
];

type SortOption = "name-asc" | "name-desc" | "date-asc" | "date-desc";

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<ProjectData[]>(sampleProjects);
  const [activeTab, setActiveTab] = useState("projects");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState<SortOption>("date-desc");
  const [filterType, setFilterType] = useState<string>("all");

  // Analytics data (in a real app, these would be calculated or fetched)
  const analyticsData = {
    totalProjects: projects.length,
    activeProjects: projects.filter(p => new Date(p.updatedAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length,
    recentlyModified: projects.filter(p => new Date(p.updatedAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length,
    codeCompilations: 12, // Sample value
  };

  const handleCreateProject = (name: string, description: string) => {
    const newProject: ProjectData = {
      id: `proj-${Date.now()}`,
      name,
      description,
      updatedAt: new Date().toISOString(),
    };
    
    setProjects([...projects, newProject]);
    toast.success("Project created successfully", {
      description: `"${name}" has been created.`,
      action: {
        label: "Open Editor",
        onClick: () => navigate(`/circuit-editor?id=${newProject.id}`),
      },
    });
  };

  const handleDeleteProject = (id: string) => {
    toast.warning("Delete project?", {
      description: "This action cannot be undone.",
      action: {
        label: "Delete",
        onClick: () => {
          setProjects(projects.filter(project => project.id !== id));
          toast.success("Project deleted");
        },
      },
    });
  };

  // Filter and sort projects
  const filteredProjects = useMemo(() => {
    // First filter by search query
    let result = projects.filter(project => 
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      project.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    // Then filter by type if needed
    if (filterType !== "all") {
      result = result.filter(project => {
        // This is a placeholder for actual type filtering
        // In a real app, you'd have project types or categories
        const hasKeyword = project.description?.toLowerCase().includes(filterType.toLowerCase());
        return hasKeyword;
      });
    }
    
    // Finally sort
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
  }, [projects, searchQuery, sortOption, filterType]);

  return (
    <PageLayout>
      <div className="container py-12">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <Button variant="outline" onClick={signOut} className="flex items-center gap-2">
            <LogOut size={16} />
            Sign Out
          </Button>
        </div>

        <div className="mb-8 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold">Welcome, {user?.email}</h2>
          <p className="text-slate-600">
            This is your dashboard where you'll manage your circuit projects and profile.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
          <TabsList className="mb-6">
            <TabsTrigger value="projects">Your Projects</TabsTrigger>
            <TabsTrigger value="profile">Profile Settings</TabsTrigger>
          </TabsList>
          
          <TabsContent value="projects">
            {/* Dashboard Analytics */}
            <DashboardAnalytics 
              totalProjects={analyticsData.totalProjects}
              activeProjects={analyticsData.activeProjects}
              recentlyModified={analyticsData.recentlyModified}
              codeCompilations={analyticsData.codeCompilations}
            />
          
            <div className="mb-6 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Your Projects</h2>
                <Button onClick={() => document.getElementById('create-project-button')?.click()}>
                  <Plus className="mr-1 h-4 w-4" />
                  New Project
                </Button>
              </div>
              
              {/* Search and filter options */}
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
                  <Select
                    value={filterType}
                    onValueChange={setFilterType}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter by type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Projects</SelectItem>
                      <SelectItem value="arduino">Arduino</SelectItem>
                      <SelectItem value="esp32">ESP32</SelectItem>
                      <SelectItem value="sensor">Sensors</SelectItem>
                      <SelectItem value="motor">Motors</SelectItem>
                      <SelectItem value="lcd">Displays</SelectItem>
                    </SelectContent>
                  </Select>
                  
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

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {/* New Project Card */}
              <div id="create-project-button">
                <NewProjectCard onCreateProject={handleCreateProject} />
              </div>
              
              {/* Project Cards */}
              {filteredProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onDelete={handleDeleteProject}
                />
              ))}
              
              {projects.length === 0 && (
                <div className="col-span-full py-12 text-center text-slate-500">
                  <p>You don't have any projects yet. Create your first project to get started!</p>
                </div>
              )}
              
              {projects.length > 0 && filteredProjects.length === 0 && (
                <div className="col-span-full py-12 text-center text-slate-500">
                  <p>No projects match your search criteria. Try adjusting your filters.</p>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="profile">
            <ProfileSection />
          </TabsContent>
        </Tabs>
      </div>
    </PageLayout>
  );
};

export default Dashboard;
