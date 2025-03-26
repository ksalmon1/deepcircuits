import React, { useState } from 'react';
import { ComponentLibraryItem } from '@/services/componentLibraryService';
import { 
  Dialog, 
  DialogContent, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2, ListFilter } from "lucide-react";
import { PinEditorTab } from './PinEditorTab';
import { PropertiesTab } from './PropertiesTab';
import { PreviewTab } from './PreviewTab';
import { useToast } from '@/hooks/use-toast';
import {
  isWokwiLoaded,
  forceLoadWokwiElements,
  isOriginalWokwiComponent,
  getComponentPinInfo,
  WokwiPin
} from '@/integrations/wokwi/WokwiIntegration';

// Interface for our custom component properties
export interface CustomComponentConfig {
  type: string;
  name: string;
  description: string;
  category: string;
  svgPath: string;
  pins: WokwiPin[];
  properties?: Record<string, any>;
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
  updatePinConfiguration: (pinConfig: any[]) => void;
}

/**
 * Component Edit Dialog
 * Provides a modal interface for editing component details
 */
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
  updatePinConfiguration,
}: EditComponentDialogProps) => {
  const { toast } = useToast();
  
  // Get all unique component types from available elements
  const getAvailableComponentTypes = () => {
    if (!editedComponent) return [];
    
    // Get all available component types from wokwi-elements
    const availableElements = (window as any).wokwiElements || {};
    
    // Filter out custom components
    const componentTypes = Object.keys(availableElements).filter(
      type => !type.startsWith('custom-')
    );
    
    return componentTypes;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Edit Component</DialogTitle>
          <DialogDescription>
            Update details for this component in the component library
          </DialogDescription>
        </DialogHeader>

        {!editedComponent ? (
          <div className="flex justify-center items-center p-6">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Loading component details...</span>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={onActiveTabChange} className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="details">Basic Details</TabsTrigger>
              <TabsTrigger value="pins">Pin Configuration</TabsTrigger>
              <TabsTrigger value="properties">Properties</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4">
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <FormLabel htmlFor="name">Component Name</FormLabel>
                    <Input
                      id="name"
                      value={editedComponent.name}
                      onChange={(e) => updateComponentProperty('name', e.target.value)}
                      className="mt-1"
                    />
                    <FormDescription>
                      The display name for this component
                    </FormDescription>
                  </div>
                  
                  <div>
                    <FormLabel htmlFor="category">Category</FormLabel>
                    <Select 
                      value={editedComponent.category} 
                      onValueChange={(value) => updateComponentProperty('category', value)}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="input">Input</SelectItem>
                        <SelectItem value="output">Output</SelectItem>
                        <SelectItem value="power">Power</SelectItem>
                        <SelectItem value="microcontrollers">Microcontrollers</SelectItem>
                        <SelectItem value="passive">Passive</SelectItem>
                        <SelectItem value="integrated">Integrated Circuits</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      The category this component belongs to
                    </FormDescription>
                  </div>
                </div>

                <div className="grid gap-2">
                  <FormLabel htmlFor="type">Component Type</FormLabel>
                  <Select 
                    value={editedComponent.type} 
                    onValueChange={(value) => updateComponentProperty('type', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a component type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="custom">Custom</SelectItem>
                      {getAvailableComponentTypes().map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    The identifier or type of component (e.g. wokwi-led, wokwi-resistor)
                  </FormDescription>
                </div>

                <div>
                  <FormLabel htmlFor="description">Description</FormLabel>
                  <Textarea
                    id="description"
                    value={editedComponent.description}
                    onChange={(e) => updateComponentProperty('description', e.target.value)}
                    className="mt-1"
                  />
                  <FormDescription>
                    A brief description of the component and its function
                  </FormDescription>
                </div>

                <div className="flex items-center space-x-2 pt-2">
                  <Switch
                    id="component-active"
                    checked={editedComponent.enabled}
                    onCheckedChange={(checked) => updateComponentProperty('enabled', checked)}
                  />
                  <FormLabel htmlFor="component-active" className="cursor-pointer">
                    Component Active
                  </FormLabel>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="pins">
              {isLoadingComponentDetails ? (
                <div className="flex justify-center items-center p-6">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="ml-2">Loading pin details...</span>
                </div>
              ) : componentDetailsError ? (
                <div className="text-center p-6 text-destructive">
                  Error loading pin details: {componentDetailsError.message}
                </div>
              ) : (
                <PinEditorTab 
                  component={editedComponent}
                  updatePinConfiguration={updatePinConfiguration}
                  wokwiReady={wokwiReady}
                />
              )}
            </TabsContent>

            <TabsContent value="properties">
              {isLoadingComponentDetails ? (
                <div className="flex justify-center items-center p-6">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="ml-2">Loading properties...</span>
                </div>
              ) : componentDetailsError ? (
                <div className="text-center p-6 text-destructive">
                  Error loading properties: {componentDetailsError.message}
                </div>
              ) : (
                <PropertiesTab 
                  component={editedComponent}
                  updateComponentProperties={updateComponentProperties}
                />
              )}
            </TabsContent>
          </Tabs>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={onSaveComponent} 
            disabled={isUpdatingComponent || isLoadingComponentDetails}
          >
            {isUpdatingComponent ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditComponentDialog;
