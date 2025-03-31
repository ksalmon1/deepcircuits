import React, { useState } from "react";
import { ComponentLibraryItem } from "@/services/componentLibraryService";
import { ComponentPin } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { 
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertCircle, Cpu, AlertTriangle } from "lucide-react";
import { ORIGINAL_WOKWI_COMPONENTS } from "@/integrations/wokwi/WokwiIntegration";
import VisualPinEditor from "@/components/CircuitEditor/VisualPinEditor";
import DynamicPropertyEditor from "@/components/CircuitEditor/DynamicPropertyEditor";
import EnhancedComponentPreview from "@/components/CircuitEditor/EnhancedComponentPreview";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface PinConfig {
  name: string;
  x: number;
  y: number;
  signals: string[];
}

interface EditComponentDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedComponent: ComponentLibraryItem | null;
  editedComponent: ComponentLibraryItem | null;
  isLoadingComponentDetails: boolean;
  componentDetailsError: Error | null;
  wokwiReady: boolean;
  activeTab: string;
  onActiveTabChange: (tab: string) => void;
  onSaveComponent: () => void;
  isUpdatingComponent: boolean;
  updateComponentProperty: (property: string, value: any) => void;
  updateComponentProperties: (properties: Record<string, any>) => void;
  updatePinConfiguration: (pinConfig: PinConfig[]) => void;
}

const EditComponentDialog = ({
  isOpen,
  onOpenChange,
  selectedComponent,
  editedComponent,
  isLoadingComponentDetails,
  componentDetailsError,
  wokwiReady,
  activeTab,
  onActiveTabChange,
  onSaveComponent,
  isUpdatingComponent,
  updateComponentProperty,
  updateComponentProperties,
  updatePinConfiguration
}: EditComponentDialogProps) => {
  const { toast } = useToast();
  const [typeChangeWarning, setTypeChangeWarning] = useState<string | null>(null);
  
  // Check if component type is being changed
  const handleTypeChange = (newType: string) => {
    if (selectedComponent && selectedComponent.type !== newType) {
      setTypeChangeWarning(
        "Changing the component type may cause errors if another component is already using this type. " +
        "Make sure this type is unique across all components."
      );
    } else {
      setTypeChangeWarning(null);
    }
    
    updateComponentProperty('type', newType);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Edit Component
            {editedComponent?.isOriginal && (
              <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">
                Original Wokwi Component
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Modify component properties and configuration.
          </DialogDescription>
        </DialogHeader>

        {isLoadingComponentDetails ? (
          <div className="py-8 text-center">
            <Cpu className="h-8 w-8 mx-auto mb-2 animate-spin text-primary" />
            <p>Loading component details...</p>
          </div>
        ) : componentDetailsError ? (
          <div className="py-8 text-center text-destructive">
            <AlertCircle className="h-8 w-8 mx-auto mb-2" />
            <p>Error loading component details</p>
            <p className="text-sm mt-2">{componentDetailsError.message}</p>
            <Button 
              className="mt-4" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
          </div>
        ) : editedComponent && (
          <Tabs 
            defaultValue="details" 
            className="mt-4"
            value={activeTab}
            onValueChange={onActiveTabChange}
          >
            <TabsList className="grid grid-cols-4">
              <TabsTrigger value="details">Basic Details</TabsTrigger>
              <TabsTrigger value="properties">Properties</TabsTrigger>
              <TabsTrigger value="pins">Pin Configuration</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>
            
            <TabsContent value="details" className="py-4">
              {typeChangeWarning && (
                <Alert variant="destructive" className="mb-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{typeChangeWarning}</AlertDescription>
                </Alert>
              )}
              
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <label htmlFor="name">Component Name</label>
                    <Input 
                      id="name" 
                      value={editedComponent.name} 
                      onChange={(e) => updateComponentProperty('name', e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <label htmlFor="type">Component Type</label>
                    <Select 
                      value={editedComponent.type}
                      onValueChange={handleTypeChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent className="overflow-y-auto max-h-[300px]">
                        <SelectItem key="custom" value="custom">Custom</SelectItem>
                        {ORIGINAL_WOKWI_COMPONENTS.map(type => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <label htmlFor="category">Category</label>
                    <Select 
                      value={editedComponent.category}
                      onValueChange={(value) => updateComponentProperty('category', value)}
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
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <label htmlFor="svgPath">SVG Path (Optional)</label>
                    <Input 
                      id="svgPath" 
                      value={editedComponent.svgPath || ''} 
                      onChange={(e) => updateComponentProperty('svgPath', e.target.value)}
                      placeholder="URL or path to custom SVG"
                    />
                  </div>
                </div>
                
                <div className="grid gap-2">
                  <label htmlFor="description">Description</label>
                  <Textarea 
                    id="description" 
                    value={editedComponent.description || ''} 
                    onChange={(e) => updateComponentProperty('description', e.target.value)}
                    rows={3}
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch 
                    id="enabled" 
                    checked={editedComponent.enabled} 
                    onCheckedChange={(checked) => updateComponentProperty('enabled', checked)}
                  />
                  <label htmlFor="enabled">Enable component for users</label>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="properties" className="py-4">
              {editedComponent && (
                <DynamicPropertyEditor 
                  properties={editedComponent.properties || {}}
                  onChange={updateComponentProperties}
                  componentType={editedComponent.type}
                />
              )}
            </TabsContent>
            
            <TabsContent value="pins" className="py-4 min-h-[450px]">
              <div className="flex flex-col h-full">
                <div className="border rounded-md bg-gray-50 p-4 h-full" style={{ minHeight: '500px' }}>
                  <VisualPinEditor
                    componentType={editedComponent.type}
                    pins={editedComponent.pins || []}
                    onPinsChange={updatePinConfiguration}
                    readonly={false}
                    height={500}
                  />
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="preview" className="py-4">
              <div className="flex flex-col">
                <h3 className="text-lg font-medium mb-4">Component Preview</h3>
                
                <div className="border rounded-md bg-gray-50 p-6">
                  <div className="flex justify-center items-center">
                    {wokwiReady ? (
                      <EnhancedComponentPreview
                        componentType={editedComponent.type}
                        properties={editedComponent.properties || {}}
                        previewId={`preview-${editedComponent.id}`}
                      />
                    ) : (
                      <div className="text-center py-8">
                        <div className="flex justify-center mb-4">
                          <AlertCircle className="h-8 w-8 text-amber-500" />
                        </div>
                        <p className="font-medium">Loading Wokwi Elements...</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Please wait while the component preview is being initialized.
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-6 space-y-3 text-sm">
                    <p className="font-medium">Component Properties Preview:</p>
                    <div className="bg-gray-100 p-3 rounded-md">
                      <pre className="text-xs overflow-auto max-h-40">
                        {JSON.stringify(editedComponent.properties || {}, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        )}
        
        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button 
            onClick={() => {
              try {
                onSaveComponent();
              } catch (error) {
                toast({
                  title: "Error saving component",
                  description: error instanceof Error ? error.message : "An unknown error occurred",
                  variant: "destructive"
                });
              }
            }}
            disabled={isUpdatingComponent}
          >
            {isUpdatingComponent ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditComponentDialog;
