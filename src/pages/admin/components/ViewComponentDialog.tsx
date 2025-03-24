
import React from "react";
import { ComponentLibraryItem } from "@/services/componentLibraryService";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertCircle, Cpu } from "lucide-react";

interface ViewComponentDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedComponent: ComponentLibraryItem | null;
  isLoadingComponentDetails: boolean;
  componentDetailsError: Error | null;
  onEditClick: () => void;
}

const ViewComponentDialog = ({
  isOpen,
  onOpenChange,
  selectedComponent,
  isLoadingComponentDetails,
  componentDetailsError,
  onEditClick
}: ViewComponentDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Component Details</DialogTitle>
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
          </div>
        ) : selectedComponent && (
          <div className="py-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <div>
                <h4 className="text-sm font-medium mb-1">Component Name</h4>
                <p>{selectedComponent.name}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium mb-1">Type</h4>
                <p>{selectedComponent.type}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium mb-1">Category</h4>
                <Badge 
                  variant={
                    selectedComponent.category === "microcontroller" ? "default" : 
                    selectedComponent.category === "input" ? "secondary" : 
                    "outline"
                  }
                >
                  {selectedComponent.category}
                </Badge>
              </div>
            </div>
            
            <div className="mb-4">
              <h4 className="text-sm font-medium mb-1">Description</h4>
              <p className="text-sm text-muted-foreground">
                {selectedComponent.description || "No description provided."}
              </p>
            </div>
            
            <div className="mb-4">
              <h4 className="text-sm font-medium mb-1">Status</h4>
              <Badge 
                variant={selectedComponent.enabled ? "default" : "outline"}
                className={selectedComponent.enabled ? "bg-green-500" : "text-red-500"}
              >
                {selectedComponent.enabled ? "Enabled" : "Disabled"}
              </Badge>
            </div>
            
            <div className="mb-4">
              <h4 className="text-sm font-medium mb-1">Properties</h4>
              {selectedComponent.properties && Object.keys(selectedComponent.properties).length > 0 ? (
                <div className="bg-gray-100 p-3 rounded-md">
                  <pre className="text-xs overflow-auto max-h-40">
                    {JSON.stringify(selectedComponent.properties, null, 2)}
                  </pre>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No properties defined.</p>
              )}
            </div>
            
            <div>
              <h4 className="text-sm font-medium mb-2">Pin Configuration</h4>
              {selectedComponent.pins && selectedComponent.pins.length > 0 ? (
                <div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Position X</TableHead>
                        <TableHead>Position Y</TableHead>
                        <TableHead>Signals</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedComponent.pins.map((pin, index) => (
                        <TableRow key={index}>
                          <TableCell>{pin.name}</TableCell>
                          <TableCell>{pin.x}</TableCell>
                          <TableCell>{pin.y}</TableCell>
                          <TableCell>
                            {pin.signals && pin.signals.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {pin.signals.map((signal, idx) => (
                                  <Badge key={idx} variant="outline">{signal}</Badge>
                                ))}
                              </div>
                            ) : (
                              "None"
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No pin configuration defined.</p>
              )}
            </div>
          </div>
        )}
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          <Button onClick={onEditClick}>
            Edit Component
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ViewComponentDialog;
