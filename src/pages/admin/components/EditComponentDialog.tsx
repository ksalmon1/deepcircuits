
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useComponentLibrary } from '@/hooks/useComponentLibrary';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ComponentLibraryItem } from "@/services/componentLibrary/types";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import EnhancedComponentPreview from "@/components/CircuitEditor/EnhancedComponentPreview";

interface EditComponentDialogProps {
  component: ComponentLibraryItem | null;
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

const EditComponentDialog = ({ component, open, onClose, onSaved }: EditComponentDialogProps) => {
  const { updateComponent, isUpdatingComponent, updateComponentError } = useComponentLibrary();
  
  // Form state
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [svgPath, setSvgPath] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [isOriginal, setIsOriginal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Reset form when component changes
  useEffect(() => {
    if (component) {
      setName(component.name || '');
      setType(component.type || '');
      setCategory(component.category || '');
      setDescription(component.description || '');
      setSvgPath(component.svgPath || '');
      setEnabled(component.enabled);
      setIsOriginal(component.isOriginal);
      setError(null);
    } else {
      // Reset form if no component
      setName('');
      setType('');
      setCategory('');
      setDescription('');
      setSvgPath('');
      setEnabled(true);
      setIsOriginal(false);
      setError(null);
    }
  }, [component]);

  // Handle update error
  useEffect(() => {
    if (updateComponentError) {
      console.error('Update error:', updateComponentError);
      setError(`Error updating component: ${updateComponentError.message || 'Unknown error'}`);
    }
  }, [updateComponentError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    try {
      // Validation
      if (!name) {
        setError('Name is required');
        return;
      }
      
      if (!type) {
        setError('Type is required');
        return;
      }
      
      if (!category) {
        setError('Category is required');
        return;
      }
      
      if (component && component.id) {
        // Update existing component
        const updatedComponent: ComponentLibraryItem = {
          id: component.id,
          name,
          type, // Allowing type to be changed now
          category,
          description,
          svgPath,
          enabled,
          isOriginal,
          pins: component.pins, // Preserve pins
          properties: component.properties // Preserve properties
        };
        
        console.log('Updating component:', updatedComponent);
        
        await updateComponent(updatedComponent);
        
        // Close dialog and refresh list
        if (onSaved) {
          onSaved();
        }
        onClose();
      }
    } catch (err) {
      console.error('Error in handleSubmit:', err);
      setError(`Error saving component: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Component</DialogTitle>
          <DialogDescription>
            Update component in the library.
          </DialogDescription>
        </DialogHeader>
        
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Component name"
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="type">Type</Label>
                <Input
                  id="type"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  placeholder="Component type (e.g., wokwi-led)"
                />
                <p className="text-xs text-muted-foreground">Changing type may affect component behavior.</p>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="category">Category</Label>
                <Select 
                  value={category} 
                  onValueChange={setCategory}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="input">Input</SelectItem>
                    <SelectItem value="output">Output</SelectItem>
                    <SelectItem value="power">Power</SelectItem>
                    <SelectItem value="passive">Passive</SelectItem>
                    <SelectItem value="ic">Integrated Circuit</SelectItem>
                    <SelectItem value="mcu">Microcontroller</SelectItem>
                    <SelectItem value="connector">Connector</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Component description"
                  rows={3}
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="svgPath">SVG Path (optional)</Label>
                <Textarea
                  id="svgPath"
                  value={svgPath}
                  onChange={(e) => setSvgPath(e.target.value)}
                  placeholder="SVG path data (optional)"
                  rows={3}
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="enabled"
                  checked={enabled}
                  onCheckedChange={setEnabled}
                />
                <Label htmlFor="enabled">Enabled</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="isOriginal"
                  checked={isOriginal}
                  onCheckedChange={setIsOriginal}
                />
                <Label htmlFor="isOriginal">Is Original Component</Label>
              </div>
            </div>
            
            <div className="space-y-4">
              <Label>Component Preview</Label>
              <div className="border rounded-lg p-4 h-64 flex items-center justify-center bg-gray-50">
                <EnhancedComponentPreview 
                  componentType={type} 
                  svgPath={svgPath}
                  isOriginalComponent={isOriginal}
                />
              </div>
              
              <div className="border rounded-lg p-4 h-32 overflow-auto">
                <h4 className="text-sm font-medium mb-2">Pins Configuration</h4>
                {component?.pins && component.pins.length > 0 ? (
                  <div className="space-y-2">
                    {component.pins.map((pin, index) => (
                      <div key={index} className="text-xs">
                        {pin.name} ({pin.x}, {pin.y})
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No pins defined</p>
                )}
              </div>
            </div>
          </div>
        
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isUpdatingComponent}>
              {isUpdatingComponent ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditComponentDialog;
