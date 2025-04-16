import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
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
import { AlertCircle, Cpu, AlertTriangle, Trash2, PlusCircle, Check, X, Edit2, Plus } from "lucide-react";
import PinConfigCanvas from "@/components/admin/PinConfigCanvas";
import DynamicPropertyEditor from "@/components/CircuitEditor/DynamicPropertyEditor";
import EnhancedComponentPreview from "@/components/CircuitEditor/EnhancedComponentPreview";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import AnimationPropertiesEditor from "@/components/CircuitEditor/AnimationPropertiesEditor";

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
  
  // Function to handle save without closing the dialog
  const handleSave = () => {
    onSave();
    // We don't call onOpenChange(false) here, so the dialog stays open
  };
  
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
      <DialogContent className="sm:max-w-[1200px] max-h-[80vh] overflow-y-auto flex flex-col">
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
                <TabsList className="grid w-full grid-cols-6 mb-4">
                  <TabsTrigger value="details">Basic Details</TabsTrigger>
                  <TabsTrigger value="properties">Properties</TabsTrigger>
                  <TabsTrigger value="pins">Pin Configuration</TabsTrigger>
                  <TabsTrigger value="svg">SVG</TabsTrigger>
                  <TabsTrigger value="preview">Preview</TabsTrigger>
                  <TabsTrigger value="animation">Animation</TabsTrigger>
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
                
                <TabsContent value="svg" className="mt-0 border-0 p-0">
                  {editedComponent && (
                    <div className="space-y-6">
                      <h3 className="text-lg font-medium">SVG Configuration</h3>
                      <div className="grid gap-2">
                        <label htmlFor="svgPath">SVG Path</label>
                        <div className="flex gap-2">
                          <Input 
                            id="svgPath" 
                            value={editedComponent.svgPath || ''} 
                            onChange={(e) => updateComponentProperty('svgPath', e.target.value)}
                            placeholder="URL, data URI, or SVG content"
                            className="flex-1"
                          />
                          <Button
                            variant="outline"
                            onClick={() => {
                              // Create a file input element
                              const input = document.createElement('input');
                              input.type = 'file';
                              input.accept = '.svg';
                              
                              // Handle file selection
                              input.onchange = (e) => {
                                const file = (e.target as HTMLInputElement).files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onload = (e) => {
                                    const svgContent = e.target?.result as string;
                                    updateComponentProperty('svgPath', svgContent);
                                    
                                    // Show success message
                                    toast.success(`SVG file "${file.name}" loaded`, {
                                      description: "You can now configure animations for elements with IDs."
                                    });
                                  };
                                  reader.readAsText(file);
                                }
                              };
                              
                              // Trigger file selection dialog
                              input.click();
                            }}
                            title="Upload SVG File"
                          >
                            Upload SVG
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Upload an SVG file or paste SVG content directly. Elements must have ID attributes for animation.
                        </p>
                        
                        {/* SVG Preview Section */}
                        <div className="mt-3 border rounded-md p-2">
                          <h4 className="text-xs font-medium mb-1">SVG Preview</h4>
                          {editedComponent.svgPath ? (
                            <div className="flex flex-col">
                              <div 
                                className="bg-gray-50 border rounded-md overflow-hidden flex items-center justify-center p-2"
                                style={{ 
                                  height: "100px", 
                                  width: "100%"
                                }}
                              >
                                {editedComponent.svgPath.trim().startsWith('<svg') ? (
                                  <div 
                                    className="flex items-center justify-center h-full"
                                    style={{
                                      maxWidth: "100%",
                                      maxHeight: "100%"
                                    }}
                                    dangerouslySetInnerHTML={{ 
                                      __html: editedComponent.svgPath.replace(/<svg/, '<svg preserveAspectRatio="xMidYMid meet"') 
                                    }} 
                                  />
                                ) : editedComponent.svgPath.match(/^https?:\/\//) ? (
                                  <img 
                                    src={editedComponent.svgPath} 
                                    alt="Component SVG" 
                                    className="object-contain"
                                    style={{
                                      maxWidth: "100%",
                                      maxHeight: "100%"
                                    }}
                                    onError={(e) => {
                                      e.currentTarget.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="80" viewBox="0 0 100 80"><rect width="100" height="80" fill="#f8f9fa"/><text x="50%" y="50%" font-family="Arial" font-size="12" text-anchor="middle" dominant-baseline="middle" fill="#6c757d">Error loading SVG</text></svg>';
                                    }}
                                  />
                                ) : (
                                  <div className="text-xs text-gray-500">
                                    Invalid SVG content or URL
                                  </div>
                                )}
                              </div>
                              <div className="w-full mt-1 text-xs text-gray-500 flex items-center">
                                <div className="bg-gray-100 rounded-sm px-1.5 py-0.5 text-[10px] inline-flex items-center">
                                  <span className="font-medium mr-1">Format:</span> 
                                  {editedComponent.svgPath.trim().startsWith('<svg') ? 'SVG Content' : 
                                   editedComponent.svgPath.match(/^https?:\/\//) ? 'URL' : 'Unknown'}
                                </div>
                                <div className="flex-grow"></div>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-5 text-[10px] px-2"
                                  onClick={() => {
                                    // Open SVG in new tab if it's a URL, or create a data URL if it's content
                                    if (editedComponent.svgPath.match(/^https?:\/\//)) {
                                      window.open(editedComponent.svgPath, '_blank');
                                    } else if (editedComponent.svgPath.trim().startsWith('<svg')) {
                                      const blob = new Blob([editedComponent.svgPath], { type: 'image/svg+xml' });
                                      const url = URL.createObjectURL(blob);
                                      window.open(url, '_blank');
                                      setTimeout(() => URL.revokeObjectURL(url), 100);
                                    }
                                  }}
                                >
                                  View Full Size
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center bg-gray-50 border border-dashed rounded-md p-3 h-[80px] text-gray-400">
                              <div className="flex flex-col items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                  <circle cx="8.5" cy="8.5" r="1.5"></circle>
                                  <polyline points="21 15 16 10 5 21"></polyline>
                                </svg>
                                <p className="mt-1 text-xs">No SVG uploaded</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* SVG Validator & Element ID Manager */}
                      <div className="mt-8 border rounded-md p-4">
                        <h3 className="text-md font-medium mb-3">
                          SVG Validator & Element ID Manager
                        </h3>

                        {!editedComponent.svgPath ? (
                          <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                            <AlertCircle className="h-10 w-10 mb-2 text-gray-400" />
                            <p className="text-sm">Upload an SVG to analyze elements and IDs</p>
                          </div>
                        ) : (
                          <SVGElementManager 
                            svgContent={editedComponent.svgPath} 
                            onSVGUpdate={(newSvg) => updateComponentProperty('svgPath', newSvg)}
                          />
                        )}
                      </div>
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="preview" className="mt-0 border-0 p-0">
                  <EnhancedComponentPreview component={editedComponent} />
                </TabsContent>
                
                <TabsContent value="animation" className="mt-0 border-0 p-0">
                  {editedComponent && (
                    <AnimationPropertiesEditor 
                      properties={editedComponent.properties || {}}
                      onChange={onPropertyUpdate}
                      errorMessage={null}
                      setErrorMessage={(msg) => {
                        if (msg) toast.error(msg);
                      }}
                      svgPath={editedComponent.svgPath}
                    />
                  )}
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
            onClick={(e) => {
              e.preventDefault(); // Prevent any default behavior
              handleSave();
              // Dialog will stay open since we're not calling onOpenChange(false)
            }} 
            disabled={isLoadingDetails || !!detailsError}
          >
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const SVGElementManager = ({ svgContent, onSVGUpdate }) => {
  const [svgElements, setSvgElements] = useState([]);
  const [validationResults, setValidationResults] = useState({ valid: true, messages: [] });
  const [loading, setLoading] = useState(false);
  const [editingElement, setEditingElement] = useState(null);
  const [newElementId, setNewElementId] = useState('');
  
  // Function to parse SVG and extract elements
  const parseSVG = useCallback((svgContent) => {
    setLoading(true);
    
    try {
      // If svgContent is a URL, handle differently
      if (svgContent.match(/^https?:\/\//)) {
        setValidationResults({
          valid: false,
          messages: ["Cannot analyze remote SVG URLs. Please upload the SVG file directly."]
        });
        setSvgElements([]);
        setLoading(false);
        return;
      }
      
      // Parse SVG string to DOM
      const parser = new DOMParser();
      let svgDoc;
      
      try {
        svgDoc = parser.parseFromString(svgContent, "image/svg+xml");
      } catch (error) {
        setValidationResults({
          valid: false,
          messages: ["Failed to parse SVG: " + error.message]
        });
        setSvgElements([]);
        setLoading(false);
        return;
      }
      
      // Check for parsing errors
      const parserError = svgDoc.querySelector("parsererror");
      if (parserError) {
        setValidationResults({
          valid: false,
          messages: ["Invalid SVG format: " + parserError.textContent]
        });
        setSvgElements([]);
        setLoading(false);
        return;
      }
      
      // Collect elements that can be animated (exclude defs, metadata, etc.)
      const animatableElementTypes = [
        'circle', 'ellipse', 'line', 'path', 'polygon', 'polyline', 
        'rect', 'text', 'g', 'use'
      ];
      
      const elements = [];
      animatableElementTypes.forEach(type => {
        const elementsOfType = svgDoc.querySelectorAll(type);
        elementsOfType.forEach(element => {
          elements.push({
            type,
            id: element.id || '',
            hasId: !!element.id,
            element: element
          });
        });
      });
      
      setSvgElements(elements);
      
      // Validate the SVG
      const validationMessages = [];
      
      // Check if we have any elements
      if (elements.length === 0) {
        validationMessages.push("No animatable elements found in SVG");
      }
      
      // Check if any elements have IDs
      const elementsWithIds = elements.filter(el => el.hasId);
      if (elementsWithIds.length === 0 && elements.length > 0) {
        validationMessages.push("No elements have IDs. Elements need IDs for animation");
      }
      
      setValidationResults({
        valid: validationMessages.length === 0,
        messages: validationMessages
      });
      
    } catch (error) {
      setValidationResults({
        valid: false,
        messages: ["Error analyzing SVG: " + error.message]
      });
      setSvgElements([]);
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Initial parsing when component mounts or SVG changes
  useEffect(() => {
    if (svgContent) {
      parseSVG(svgContent);
    }
  }, [svgContent, parseSVG]);
  
  // Function to add or update element ID
  const updateElementId = (index) => {
    if (!newElementId.trim()) {
      toast.error("Please enter a valid ID");
      return;
    }
    
    try {
      // Create new DOM to modify
      const parser = new DOMParser();
      const svgDoc = parser.parseFromString(svgContent, "image/svg+xml");
      
      // Get all elements of the target type
      const elements = Array.from(svgDoc.querySelectorAll(svgElements[index].type));
      const targetElement = elements[svgElements.filter(e => e.type === svgElements[index].type).findIndex((_, i) => i === index)];
      
      if (targetElement) {
        // Set the new ID
        targetElement.setAttribute('id', newElementId.trim());
        
        // Get the updated SVG as string
        const serializer = new XMLSerializer();
        const updatedSvgString = serializer.serializeToString(svgDoc);
        
        // Update in parent component
        onSVGUpdate(updatedSvgString);
        
        // Update local state
        const updatedElements = [...svgElements];
        updatedElements[index] = {
          ...updatedElements[index],
          id: newElementId.trim(),
          hasId: true
        };
        setSvgElements(updatedElements);
        
        // Reset editing state
        setEditingElement(null);
        setNewElementId('');
        
        toast.success(`ID "${newElementId.trim()}" added to ${svgElements[index].type} element`);
      }
    } catch (error) {
      toast.error("Failed to update element ID: " + error.message);
    }
  };
  
  // Function to generate a suggested ID
  const suggestId = (type, index) => {
    const baseId = `${type}-${index + 1}`;
    setNewElementId(baseId);
  };
  
  // Function to add IDs to all elements without them
  const addMissingIds = () => {
    try {
      // Create new DOM to modify
      const parser = new DOMParser();
      const svgDoc = parser.parseFromString(svgContent, "image/svg+xml");
      
      // Track if we made any changes
      let changesCount = 0;
      
      // Process each element type
      const animatableElementTypes = [
        'circle', 'ellipse', 'line', 'path', 'polygon', 'polyline', 
        'rect', 'text', 'g', 'use'
      ];
      
      animatableElementTypes.forEach(type => {
        const elementsOfType = Array.from(svgDoc.querySelectorAll(type));
        elementsOfType.forEach((element, index) => {
          if (!element.id) {
            element.setAttribute('id', `${type}-${index + 1}`);
            changesCount++;
          }
        });
      });
      
      if (changesCount > 0) {
        // Get the updated SVG as string
        const serializer = new XMLSerializer();
        const updatedSvgString = serializer.serializeToString(svgDoc);
        
        // Update in parent component
        onSVGUpdate(updatedSvgString);
        
        // Refresh elements
        parseSVG(updatedSvgString);
        
        toast.success(`Added IDs to ${changesCount} elements`);
      } else {
        toast.info("All elements already have IDs");
      }
    } catch (error) {
      toast.error("Failed to add missing IDs: " + error.message);
    }
  };
  
  return (
    <div className="space-y-4">
      {/* Validation Results */}
      {validationResults.messages.length > 0 && (
        <Alert className={validationResults.valid ? "bg-blue-50" : "bg-amber-50 border-amber-200"}>
          <div className="flex">
            {validationResults.valid 
              ? <Check className="h-4 w-4 text-blue-600 mr-2" />
              : <AlertTriangle className="h-4 w-4 text-amber-600 mr-2" />
            }
            <div className="flex-1">
              <h4 className="text-sm font-medium">
                {validationResults.valid 
                  ? "SVG Validation Passed" 
                  : "SVG Validation Issues"
                }
              </h4>
              <ul className="mt-1 text-xs space-y-1">
                {validationResults.messages.map((msg, i) => (
                  <li key={i}>{msg}</li>
                ))}
              </ul>
            </div>
          </div>
        </Alert>
      )}
      
      {/* Elements table */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Cpu className="h-6 w-6 animate-spin mr-2" />
          <span>Analyzing SVG elements...</span>
        </div>
      ) : svgElements.length > 0 ? (
        <>
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-sm font-medium">SVG Elements ({svgElements.length})</h4>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => parseSVG(svgContent)}
              >
                Refresh Elements
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={addMissingIds}
                disabled={!svgElements.some(el => !el.hasId)}
              >
                Add Missing IDs
              </Button>
            </div>
          </div>
          
          <div className="border rounded-md overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Element</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {svgElements.map((element, index) => (
                  <tr key={index} className={!element.hasId ? "bg-amber-50" : ""}>
                    <td className="px-4 py-2">
                      <span className="font-mono bg-gray-100 px-1 rounded text-xs">
                        &lt;{element.type}&gt;
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      {editingElement === index ? (
                        <div className="flex items-center gap-1">
                          <Input 
                            value={newElementId} 
                            onChange={(e) => setNewElementId(e.target.value)}
                            className="h-7 text-xs"
                            placeholder="Enter element ID"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => suggestId(element.type, index)}
                            title="Suggest ID"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-sparkles"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
                          </Button>
                        </div>
                      ) : (
                        <span className={element.hasId ? "font-mono text-xs" : "text-gray-400 italic text-xs"}>
                          {element.hasId ? element.id : "No ID"}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {element.hasId ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-[10px]">
                          <Check className="h-3 w-3 mr-1" /> Ready for Animation
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]">
                          <AlertTriangle className="h-3 w-3 mr-1" /> Needs ID
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {editingElement === index ? (
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-green-600"
                            onClick={() => updateElementId(index)}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-gray-400"
                            onClick={() => {
                              setEditingElement(null);
                              setNewElementId('');
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => {
                            setEditingElement(index);
                            setNewElementId(element.id);
                          }}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="mt-3 text-xs text-gray-500">
            <p>
              <span className="font-medium">Note:</span> Elements must have ID attributes to be targeted by animations. 
              Click the edit button to add or change an ID.
            </p>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 text-gray-500 border rounded-md">
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <circle cx="8.5" cy="8.5" r="1.5"></circle>
            <polyline points="21 15 16 10 5 21"></polyline>
          </svg>
          <p className="mt-2">No SVG elements found to analyze</p>
        </div>
      )}
    </div>
  );
};

export default EditComponentDialog;
