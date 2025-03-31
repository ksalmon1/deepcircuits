
import React from "react";
import { ComponentLibraryItem } from "@/types/component";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import EnhancedComponentPreview from "@/components/CircuitEditor/EnhancedComponentPreview";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ViewComponentDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  component: ComponentLibraryItem;
}

const ViewComponentDialog = ({
  isOpen,
  onOpenChange,
  component
}: ViewComponentDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {component.name}
            {component.isOriginal && (
              <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">
                Original
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Component details and preview
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="h-full max-h-[60vh] pr-4">
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-lg font-medium mb-2">Details</h3>
                <div className="space-y-2">
                  <div>
                    <span className="font-medium">Type:</span> {component.type}
                  </div>
                  <div>
                    <span className="font-medium">Category:</span> 
                    <Badge className="ml-2">{component.category}</Badge>
                  </div>
                  <div>
                    <span className="font-medium">Status:</span> 
                    <Badge 
                      variant={component.enabled ? "default" : "outline"}
                      className={`ml-2 ${component.enabled ? "bg-green-500" : "text-red-500"}`}
                    >
                      {component.enabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-2">Description</h3>
                <p className="text-sm text-gray-700">
                  {component.description || "No description available"}
                </p>
              </div>
            </div>
            
            {component.type && (
              <div>
                <h3 className="text-lg font-medium mb-4">Preview</h3>
                <div className="border rounded-md p-4 bg-gray-50 flex justify-center items-center" style={{ minHeight: "200px" }}>
                  {component.type ? (
                    <EnhancedComponentPreview
                      componentType={component.type}
                      properties={component.properties || {}}
                      previewId={`view-${component.id}`}
                    />
                  ) : (
                    <p className="text-muted-foreground">No preview available</p>
                  )}
                </div>
              </div>
            )}
            
            {component.pins && component.pins.length > 0 && (
              <div>
                <h3 className="text-lg font-medium mb-2">Pins</h3>
                <div className="border rounded-md p-4 bg-gray-50">
                  <div className="grid grid-cols-3 gap-2">
                    {component.pins.map((pin, index) => (
                      <div key={index} className="border p-2 rounded bg-white text-sm">
                        <div><span className="font-medium">Name:</span> {pin.name}</div>
                        <div><span className="font-medium">Position:</span> x:{pin.x}, y:{pin.y}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            {component.properties && Object.keys(component.properties).length > 0 && (
              <div>
                <h3 className="text-lg font-medium mb-2">Properties</h3>
                <div className="border rounded-md p-4 bg-gray-50">
                  <pre className="text-xs overflow-auto max-h-40">
                    {JSON.stringify(component.properties, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
        
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ViewComponentDialog;
