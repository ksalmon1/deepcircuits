
import React, { useState } from "react";
import PageLayout from "@/components/PageLayout";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut, Plus } from "lucide-react";
import ProjectCard, { ProjectData } from "@/components/ProjectCard";
import NewProjectCard from "@/components/NewProjectCard";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

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
];

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<ProjectData[]>(sampleProjects);

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
            This is your dashboard where you'll manage your circuit projects.
          </p>
        </div>

        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Your Projects</h2>
          <Button onClick={() => document.getElementById('create-project-button')?.click()}>
            <Plus className="mr-1 h-4 w-4" />
            New Project
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {/* New Project Card */}
          <div id="create-project-button">
            <NewProjectCard onCreateProject={handleCreateProject} />
          </div>
          
          {/* Project Cards */}
          {projects.map((project) => (
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
        </div>
      </div>
    </PageLayout>
  );
};

export default Dashboard;
