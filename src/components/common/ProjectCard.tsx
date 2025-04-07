import React from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Cpu } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { DashboardProject } from '@/integrations/supabase/projectsApi';

interface ProjectCardProps {
  project: DashboardProject;
  onDelete?: (id: string) => void;
  isDeleting?: boolean;
}

const ProjectCard = ({ project, onDelete, isDeleting = false }: ProjectCardProps) => {
  const navigate = useNavigate();
  
  const handleOpen = () => {
    navigate(`/circuit-editor/${project.id}`);
  };
  
  const handleDelete = () => {
    if (onDelete) {
      onDelete(project.id);
    }
  };
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <Card className="h-full flex flex-col shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <Link to={`/circuit-editor/${project.id}`} className="hover:text-primary transition-colors block">
          <CardTitle className="text-lg text-primary flex items-center justify-between">
            <span>{project.name}</span>
          </CardTitle>
        </Link>
        <CardDescription className="text-sm text-muted-foreground">
          Last updated: {formatDate(project.updated_at)}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="flex-grow">
        <div className="aspect-video bg-gray-100 rounded-md mb-3 flex items-center justify-center text-gray-400">
          No preview available
        </div>
      </CardContent>
      
      <CardFooter className="border-t pt-3 flex justify-between">
        <Button variant="outline" size="sm" onClick={handleOpen}>
          <Pencil className="h-4 w-4 mr-1" />
          Open
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleDelete} 
          className="text-destructive hover:bg-destructive/10"
          disabled={isDeleting}
        >
          {isDeleting ? (
            <span className="animate-spin h-4 w-4">⏳</span> 
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ProjectCard;
