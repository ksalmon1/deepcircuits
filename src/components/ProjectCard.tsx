
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
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

export interface ProjectData {
  id: string;
  name: string;
  description: string;
  updatedAt: string;
  thumbnailUrl?: string;
  microcontroller?: {
    type: string;
    codeSize?: number;
    lastCompiled?: string;
  };
}

interface ProjectCardProps {
  project: ProjectData;
  onDelete?: (id: string) => void;
}

const ProjectCard = ({ project, onDelete }: ProjectCardProps) => {
  const navigate = useNavigate();
  
  const handleEdit = () => {
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
        <CardTitle className="text-lg text-primary flex items-center justify-between">
          {project.name}
          {project.microcontroller && (
            <Badge variant="outline" className="flex items-center gap-1">
              <Cpu className="h-3 w-3" />
              {project.microcontroller.type}
            </Badge>
          )}
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          Last updated: {formatDate(project.updatedAt)}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="flex-grow">
        {project.thumbnailUrl ? (
          <div className="aspect-video bg-gray-100 rounded-md mb-3 overflow-hidden">
            <img 
              src={project.thumbnailUrl} 
              alt={project.name} 
              className="h-full w-full object-cover"
            />
          </div>
        ) : (
          <div className="aspect-video bg-gray-100 rounded-md mb-3 flex items-center justify-center text-gray-400">
            No preview
          </div>
        )}
        <p className="text-sm line-clamp-2">{project.description}</p>
        
        {project.microcontroller?.lastCompiled && (
          <div className="mt-2 text-xs text-muted-foreground">
            <span>Code compiled: {formatDate(project.microcontroller.lastCompiled)}</span>
            {project.microcontroller.codeSize && (
              <span className="ml-2">
                Size: {(project.microcontroller.codeSize / 1024).toFixed(1)} KB
              </span>
            )}
          </div>
        )}
      </CardContent>
      
      <CardFooter className="border-t pt-3 flex justify-between">
        <Button variant="outline" size="sm" onClick={handleEdit}>
          <Pencil className="h-4 w-4 mr-1" />
          Edit
        </Button>
        <Button variant="outline" size="sm" onClick={handleDelete} className="text-destructive hover:bg-destructive/10">
          <Trash2 className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ProjectCard;
