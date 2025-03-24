
import React from "react";
import { ComponentLibraryItem } from "@/services/componentLibraryService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ORIGINAL_WOKWI_COMPONENTS } from "@/integrations/wokwi/WokwiIntegration";

interface AddComponentDialogProps {
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Component</DialogTitle>
          <DialogDescription>
            Add a new component to the circuit library.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <label htmlFor="name">Component Name</label>
            <Input 
              id="name" 
              placeholder="e.g. LED, Resistor, etc." 
              value={newComponent.name}
              onChange={(e) => onNewComponentChange('name', e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <label htmlFor="category">Category</label>
              <Select 
                value={newComponent.category} 
                onValueChange={(value) => onNewComponentChange('category', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="input">Input</SelectItem>
                  <SelectItem value="output">Output</SelectItem>
                  <SelectItem value="passive">Passive</SelectItem>
                  <SelectItem value="microcontroller">Microcontroller</SelectItem>
                  <SelectItem value="sensor">Sensor</SelectItem>
                  <SelectItem value="display">Display</SelectItem>
                  <SelectItem value="power">Power</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <label htmlFor="type">Type</label>
              <Select 
                value={newComponent.type} 
                onValueChange={(value) => onNewComponentChange('type', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px] overflow-y-auto">
                  {ORIGINAL_WOKWI_COMPONENTS.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-2">
            <label htmlFor="description">Description</label>
            <Textarea 
              id="description" 
              placeholder="Describe this component and its functionality"
              rows={3}
              value={newComponent.description}
              onChange={(e) => onNewComponentChange('description', e.target.value)}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Switch 
                id="enabled" 
                checked={newComponent.enabled} 
                onCheckedChange={(checked) => onNewComponentChange('enabled', checked)}
              />
              <label htmlFor="enabled">Enable component for users</label>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button 
            onClick={onAddComponent}
            disabled={isCreatingComponent}
          >
            {isCreatingComponent ? 'Adding...' : 'Add Component'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddComponentDialog;
