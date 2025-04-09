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
import { AlertCircle, Cpu, AlertTriangle, Trash2, PlusCircle } from "lucide-react";
import PinConfigCanvas from "@/components/admin/PinConfigCanvas";
import DynamicPropertyEditor from "@/components/CircuitEditor/DynamicPropertyEditor";
import EnhancedComponentPreview from "@/components/CircuitEditor/EnhancedComponentPreview";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";

interface PinConfig {
  name: string;
  x: number;
  y: number;
  signals: string[];
}

interface EditComponentDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  selectedComponent: ComponentLibraryItem | null;
  editedComponent: ComponentLibraryItem | null;
  isLoadingDetails: boolean;
  detailsError: Error | null;
  onSave: () => void;
  onPinUpdate: (pins: any[]) => void; 
  onPropertyUpdate: (properties: Record<string, any>) => void;
  updateComponentProperty: (property: string, value: any) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

// Define available signal types for the dropdown
const AVAILABLE_SIGNALS = [
  'power', 'ground', 'digital', 'analog', 'i2c', 'spi', 'uart', 
  'pwm', 'clock', 'data', 'reset', 'interrupt', 
  'passive',
  'other'
];

const EditComponentDialog = ({
  isOpen,
  onOpenChange,
  selectedComponent,
  editedComponent,
  isLoadingDetails,
  detailsError,
  onSave,
  onPinUpdate,
  onPropertyUpdate,
  updateComponentProperty,
  activeTab,
  setActiveTab
}: EditComponentDialogProps) => {
  const [typeChangeWarning, setTypeChangeWarning] = useState<string | null>(null);
  
  console.log("EditComponentDialog rendering with editedComponent pins:", editedComponent?.pins);
  
  const handleTypeChange = (newType: string) => {
    if (selectedComponent && selectedComponent.type !== newType) {
      setTypeChangeWarning(
        "Changing the component type is generally not recommended as it defines behavior. " + 
        "Ensure this type maps correctly to your simulation engine."
      );
    } else {
      setTypeChangeWarning(null);
    }
    updateComponentProperty('type', newType);
  };
  
  const handlePinUpdate = (pinIndex: number, newPosition: { x: number; y: number }) => {
    if (!editedComponent || !editedComponent.pins) return;

    const updatedPins = editedComponent.pins.map((pin, index) => {
      if (index === pinIndex) {
        return { ...pin, x: newPosition.x, y: newPosition.y };
      }
      return pin;
    });

    onPinUpdate(updatedPins);
  };
  
  const handlePinNameChange = (index: number, name: string) => {
    if (!editedComponent || !editedComponent.pins) return;
    const updatedPins = editedComponent.pins.map((pin, i) => 
      i === index ? { ...pin, name } : pin
    );
    onPinUpdate(updatedPins);
  };

  const handlePinHandleIdChange = (index: number, handleId: string) => {
    if (!editedComponent || !editedComponent.pins) return;
    const updatedPins = editedComponent.pins.map((pin, i) => 
      i === index ? { ...pin, handle_id: handleId } : pin
    );
    onPinUpdate(updatedPins);
  };

  const handlePinSignalChange = (index: number, signal: string) => {
    if (!editedComponent || !editedComponent.pins) return;
    const updatedPins = editedComponent.pins.map((pin, i) =>
      i === index ? { ...pin, signals: [signal] } : pin 
    );
    onPinUpdate(updatedPins);
  };

  const handleDeletePin = (index: number) => {
    if (!editedComponent || !editedComponent.pins) return;
    const pinToDelete = editedComponent.pins[index];
    const pinIdentifier = pinToDelete.name || `Pin ${index + 1}`;
    const updatedPins = editedComponent.pins.filter((_, i) => i !== index);
    onPinUpdate(updatedPins);
    toast.success(`Deleted: ${pinIdentifier}`);
  };

  const handleAddPin = () => {
    if (!editedComponent) return;
    const nextPinIndex = (editedComponent.pins || []).length;
    const newPin: ComponentPin = {
      name: `Pin ${nextPinIndex + 1}`,
      x: 10,
      y: nextPinIndex * 15 + 10,
      signals: ['digital'],
      handle_id: `pin-${nextPinIndex}`
    };
    onPinUpdate([...(editedComponent.pins || []), newPin]);
    toast.success(`Added: ${newPin.name}`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[1200px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            Edit Component: {selectedComponent?.name}
            {selectedComponent?.isOriginal && (
              <Badge variant="outline">Original</Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Modify component properties and configuration.
          </DialogDescription>
        </DialogHeader>

        {isLoadingDetails ? (
          <div className="flex-grow flex items-center justify-center">
            <Cpu className="h-8 w-8 mx-auto mb-2 animate-spin text-primary" />
            <p>Loading component details...</p>
          </div>
        ) : detailsError ? (
          <div className="flex-grow flex flex-col items-center justify-center text-destructive">
            <AlertCircle className="h-8 w-8 mx-auto mb-2" />
            <p>Error loading component details</p>
            <p className="text-sm mt-2">{detailsError.message}</p>
            <Button 
              className="mt-4" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
          </div>
        ) : editedComponent && (
          <div className="flex-grow flex flex-col min-h-0">
            <ScrollArea className="flex-grow pr-6">
              <Tabs 
                value={activeTab} 
                onValueChange={setActiveTab} 
                className="w-full flex flex-col"
              >
                <TabsList className="grid w-full grid-cols-4 mb-4">
                  <TabsTrigger value="details">Basic Details</TabsTrigger>
                  <TabsTrigger value="properties">Properties</TabsTrigger>
                  <TabsTrigger value="pins">Pin Configuration</TabsTrigger>
                  <TabsTrigger value="preview">Preview</TabsTrigger>
                </TabsList>
                
                <TabsContent value="details" className="mt-0 border-0 p-0">
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
                        <Input 
                          id="type" 
                          value={editedComponent.type} 
                          onChange={(e) => handleTypeChange(e.target.value)} 
                          placeholder="e.g., resistor, led, custom-ic"
                        />
                        <p className="text-xs text-muted-foreground">
                          Internal type identifier (used by simulation engine).
                        </p>
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
                
                <TabsContent value="properties" className="mt-0 border-0 p-0">
                  {editedComponent && (
                    <DynamicPropertyEditor 
                      properties={editedComponent.properties || {}}
                      onChange={onPropertyUpdate}
                      componentType={editedComponent.type}
                    />
                  )}
                </TabsContent>
                
                <TabsContent value="pins" className="mt-0 border-0 p-0 flex flex-col h-full">
                  <div className="flex-grow grid grid-cols-3 gap-4 min-h-0">
                    <div className="col-span-2 flex flex-col h-full">
                      <div className="text-sm text-muted-foreground mb-2">
                        Drag the red pin handles to set their position relative to the component's top-left corner (0,0).
                      </div>
                      <div className="border rounded-md bg-gray-50 h-full" style={{ minHeight: '500px' }}>
                        <PinConfigCanvas
                          component={editedComponent}
                          pins={editedComponent.pins || []}
                          onPinUpdate={handlePinUpdate}
                          height={500} 
                        />
                      </div>
                    </div>

                    <div className="col-span-1 flex flex-col gap-4">
                      <div className="border rounded-md p-4">
                        <h3 className="text-lg font-semibold mb-4">Pin Details</h3>
                        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                          {(editedComponent.pins || []).map((pin, index) => (
                            <div key={index} className="border rounded p-3 bg-white">
                              <div className="flex justify-between items-center mb-2">
                                <span className="font-medium text-primary">
                                  {index + 1} - {pin.name} ({pin.handle_id || 'No ID'})
                                </span>
                                <Button variant="ghost" size="sm" onClick={() => handleDeletePin(index)} title="Delete Pin">
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                              <div className="grid grid-cols-3 gap-2 text-sm mb-2">
                                <Input 
                                  placeholder="Pin Name"
                                  title="User-facing pin name"
                                  value={pin.name} 
                                  onChange={(e) => handlePinNameChange(index, e.target.value)} 
                                />
                                <Input 
                                  placeholder="Handle ID"
                                  title="Internal Handle ID (e.g., pin-0)"
                                  value={pin.handle_id || ''}
                                  onChange={(e) => handlePinHandleIdChange(index, e.target.value)} 
                                />
                                 <Select 
                                  value={pin.signals?.[0] || ''} 
                                  onValueChange={(value) => handlePinSignalChange(index, value)}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select Signal" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {AVAILABLE_SIGNALS.map(sig => (
                                      <SelectItem key={sig} value={sig}>{sig}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Pos: ({pin.x?.toFixed(1)}, {pin.y?.toFixed(1)})
                              </div>
                            </div>
                          ))}
                          {(editedComponent.pins || []).length === 0 && (
                            <p className="text-sm text-muted-foreground text-center py-4">No pins defined.</p>
                          )}
                        </div>
                        <Button variant="outline" size="sm" onClick={handleAddPin} className="mt-4 w-full">
                          <PlusCircle className="h-4 w-4 mr-2" /> Add New Pin
                        </Button>
                      </div>

                      <div className="border rounded-md p-4 text-sm text-muted-foreground bg-blue-50 border-blue-200">
                        <h4 className="font-semibold text-primary mb-2">Coordinate System:</h4>
                        <ul className="list-disc list-inside space-y-1">
                          <li>The <span className="text-red-600 font-bold">red dot</span> marks the origin (0,0) at the top-left of the component.</li>
                          <li>All coordinates are relative to this origin point.</li>
                          <li>These exact coordinates will be used in the circuit editor.</li>
                          <li>Pin positions should align with the visible component terminals.</li>
                        </ul>
                      </div>

                      <div className="border rounded-md p-4 text-sm text-muted-foreground bg-green-50 border-green-200">
                        <h4 className="font-semibold text-primary mb-2">Controls:</h4>
                         <ul className="list-disc list-inside space-y-1">
                          <li>Drag existing pins to reposition.</li>
                          <li>Use the Pin Details section to add, delete, or edit pin names and signals.</li>
                        </ul>
                      </div>
                    </div> 
                  </div>
                </TabsContent>
                
                <TabsContent value="preview" className="mt-0 border-0 p-0">
                  <EnhancedComponentPreview component={editedComponent} />
                </TabsContent>
              </Tabs>
            </ScrollArea>
          </div>
        )}
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={onSave} 
            disabled={isLoadingDetails || !!detailsError}
          >
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditComponentDialog;
