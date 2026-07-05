
import React from "react";
import { ComponentLibraryItem } from "@/types/component";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { Eye, Edit, Trash } from "lucide-react";

interface ComponentTableProps {
  components: ComponentLibraryItem[];
  isLoading: boolean;
  onEdit: (component: ComponentLibraryItem) => void;
  onView: (component: ComponentLibraryItem) => void;
  onDelete: (component: ComponentLibraryItem) => void;
}

const ComponentTable = ({ 
  components, 
  isLoading, 
  onEdit, 
  onView, 
  onDelete 
}: ComponentTableProps) => {
  if (isLoading) {
    return (
      <TableRow>
        <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
          Loading components...
        </TableCell>
      </TableRow>
    );
  }

  if (components.length === 0) {
    return (
      <TableRow>
        <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
          No components match your filters.
        </TableCell>
      </TableRow>
    );
  }

  return (
    <>
      {components.map((component) => (
        <TableRow key={component.id}>
          <TableCell className="font-medium flex items-center gap-2">
            {component.name}
            {component.isOriginal && (
              <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">
                Original
              </Badge>
            )}
          </TableCell>
          <TableCell>
            <Badge 
              variant={
                component.category === "microcontroller" ? "default" : 
                component.category === "input" ? "secondary" : 
                component.category === "output" ? "outline" :
                "outline"
              }
            >
              {component.category}
            </Badge>
          </TableCell>
          <TableCell>{component.type}</TableCell>
          <TableCell>
            <Badge 
              variant={component.enabled ? "default" : "outline"}
              className={component.enabled ? "bg-green-500" : "text-red-500"}
            >
              {component.enabled ? "Enabled" : "Disabled"}
            </Badge>
          </TableCell>
          <TableCell className="text-right">
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onView(component)}
                title="View"
              >
                <Eye className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onEdit(component)}
                title="Edit"
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDelete(component)}
                title="Delete"
              >
                <Trash className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </TableCell>
        </TableRow>
      ))}
    </>
  );
};

export default ComponentTable;
