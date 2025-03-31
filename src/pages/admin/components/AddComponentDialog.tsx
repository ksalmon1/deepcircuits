
import React from "react";
import { ComponentLibraryItem } from "@/types/component";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface AddComponentDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  newComponent: Partial<ComponentLibraryItem>;
  onNewComponentChange: (field: string, value: any) => void;
  onAddComponent: () => void;
  isCreatingComponent: boolean;
}

const AddComponentDialog = ({
  isOpen,
  onOpenChange,
  newComponent,
  onNewComponentChange,
  onAddComponent,
  isCreatingComponent
}: AddComponentDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add New Component</DialogTitle>
          <DialogDescription>
            Create a new component to add to the library.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <label htmlFor="name">Component Name</label>
              <Input 
                id="name" 
                value={newComponent.name || ''} 
                onChange={(e) => onNewComponentChange('name', e.target.value)}
                placeholder="Arduino Uno"
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="type">Component Type</label>
              <Input 
                id="type" 
                value={newComponent.type || ''} 
                onChange={(e) => onNewComponentChange('type', e.target.value)}
                placeholder="arduino-uno"
              />
            </div>
          </div>
          
          <div className="grid gap-2">
            <label htmlFor="category">Category</label>
            <Select 
              value={newComponent.category} 
              onValueChange={(value) => onNewComponentChange('category', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="microcontroller">Microcontroller</SelectItem>
                <SelectItem value="input">Input</SelectItem>
                <SelectItem value="output">Output</SelectItem>
                <SelectItem value="sensor">Sensor</SelectItem>
                <SelectItem value="display">Display</SelectItem>
                <SelectItem value="power">Power</SelectItem>
                <SelectItem value="passive">Passive</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid gap-2">
            <label htmlFor="description">Description</label>
            <Textarea 
              id="description" 
              value={newComponent.description || ''} 
              onChange={(e) => onNewComponentChange('description', e.target.value)}
              placeholder="A brief description of the component and its functionality"
              rows={3}
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch 
              id="enabled" 
              checked={newComponent.enabled} 
              onCheckedChange={(checked) => onNewComponentChange('enabled', checked)}
            />
            <label htmlFor="enabled">Enable component for users</label>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button 
            onClick={onAddComponent}
            disabled={isCreatingComponent || !newComponent.name || !newComponent.type || !newComponent.category}
          >
            {isCreatingComponent ? 'Creating...' : 'Create Component'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddComponentDialog;
