
import React from "react";
import { ComponentLibraryItem } from "@/services/componentLibraryService";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface DeleteComponentDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedComponent: ComponentLibraryItem | null;
  onConfirmDelete: () => void;
  isDeletingComponent: boolean;
}

const DeleteComponentDialog = ({
  isOpen,
  onOpenChange,
  selectedComponent,
  onConfirmDelete,
  isDeletingComponent
}: DeleteComponentDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Confirm Delete</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this component? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        
        {selectedComponent && (
          <div className="py-4">
            <p className="font-medium">{selectedComponent.name}</p>
            <p className="text-sm text-muted-foreground mt-1">{selectedComponent.type}</p>
          </div>
        )}
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button 
            variant="destructive" 
            onClick={onConfirmDelete}
            disabled={isDeletingComponent}
          >
            {isDeletingComponent ? 'Deleting...' : 'Delete Component'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteComponentDialog;
