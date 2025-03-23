
import React, { useState } from "react";
import PageLayout from "@/components/PageLayout";
import { useAuth } from "@/context/AuthContext";
import { Navigate } from "react-router-dom";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Database, 
  Search, 
  Filter, 
  Plus, 
  Edit, 
  Trash, 
  Eye, 
  Upload, 
  DownloadCloud, 
  Cpu, 
  AlertCircle 
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const mockComponents = [
  { 
    id: "1", 
    name: "LED", 
    type: "basic", 
    category: "output", 
    created_at: "2023-01-15", 
    last_updated: "2023-03-22", 
    pins: 2 
  },
  { 
    id: "2", 
    name: "Resistor", 
    type: "basic", 
    category: "passive", 
    created_at: "2023-01-15", 
    last_updated: "2023-04-10", 
    pins: 2 
  },
  { 
    id: "3", 
    name: "Capacitor", 
    type: "basic", 
    category: "passive", 
    created_at: "2023-01-16", 
    last_updated: "2023-02-28", 
    pins: 2 
  },
  { 
    id: "4", 
    name: "Arduino Uno", 
    type: "complex", 
    category: "microcontroller", 
    created_at: "2023-01-18", 
    last_updated: "2023-05-05", 
    pins: 28 
  },
  { 
    id: "5", 
    name: "ESP32", 
    type: "complex", 
    category: "microcontroller", 
    created_at: "2023-02-10", 
    last_updated: "2023-04-15", 
    pins: 36 
  },
  { 
    id: "6", 
    name: "Button", 
    type: "basic", 
    category: "input", 
    created_at: "2023-01-20", 
    last_updated: "2023-03-30", 
    pins: 2 
  },
  { 
    id: "7", 
    name: "Motor", 
    type: "complex", 
    category: "output", 
    created_at: "2023-02-05", 
    last_updated: "2023-03-15", 
    pins: 2 
  },
];

const ComponentLibrary = () => {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [selectedComponent, setSelectedComponent] = useState(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (!isAdmin()) {
    return <Navigate to="/dashboard" />;
  }

  const filteredComponents = mockComponents.filter(component => {
    const matchesSearch = component.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter ? component.category === categoryFilter : true;
    const matchesType = typeFilter ? component.type === typeFilter : true;
    return matchesSearch && matchesCategory && matchesType;
  });

  const handleAddComponent = () => {
    toast({
      title: "Component Added",
      description: "New component has been added to the library.",
    });
    setIsAddDialogOpen(false);
  };

  const handleEditComponent = (component) => {
    setSelectedComponent(component);
    setIsEditDialogOpen(true);
  };

  const handleViewComponent = (component) => {
    setSelectedComponent(component);
    setIsViewDialogOpen(true);
  };

  const handleDeleteComponent = (component) => {
    setSelectedComponent(component);
    setIsDeleteDialogOpen(true);
  };

  const handleSaveComponent = () => {
    toast({
      title: "Component Updated",
      description: `Component "${selectedComponent.name}" has been updated successfully.`,
    });
    setIsEditDialogOpen(false);
  };

  const handleConfirmDelete = () => {
    toast({
      title: "Component Deleted",
      description: `Component "${selectedComponent.name}" has been removed from the library.`,
    });
    setIsDeleteDialogOpen(false);
  };

  const handleExportLibrary = () => {
    toast({
      title: "Library Exported",
      description: "Component library has been exported successfully.",
    });
  };

  const handleImportLibrary = () => {
    toast({
      title: "Feature Not Implemented",
      description: "Library import is not yet implemented in this prototype.",
    });
  };

  return (
    <PageLayout>
      <div className="container py-12">
        <div className="mb-8 flex items-center gap-3">
          <Cpu className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Component Library</h1>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Circuit Components</CardTitle>
            <CardDescription>Manage the components available in the circuit editor</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4 mb-6 justify-between">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search components..."
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-[150px]">
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4" />
                      <span>{categoryFilter || "Category"}</span>
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="input">Input</SelectItem>
                    <SelectItem value="output">Output</SelectItem>
                    <SelectItem value="passive">Passive</SelectItem>
                    <SelectItem value="microcontroller">Microcontroller</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-[130px]">
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4" />
                      <span>{typeFilter || "Type"}</span>
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="basic">Basic</SelectItem>
                    <SelectItem value="complex">Complex</SelectItem>
                  </SelectContent>
                </Select>

                <Button className="whitespace-nowrap" onClick={() => setIsAddDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Component
                </Button>
              </div>
            </div>

            <div className="flex justify-end gap-2 mb-4">
              <Button variant="outline" size="sm" className="gap-1" onClick={handleExportLibrary}>
                <DownloadCloud className="h-4 w-4" />
                <span>Export Library</span>
              </Button>
              <Button variant="outline" size="sm" className="gap-1" onClick={handleImportLibrary}>
                <Upload className="h-4 w-4" />
                <span>Import Library</span>
              </Button>
            </div>

            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Pins</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredComponents.length > 0 ? (
                    filteredComponents.map((component) => (
                      <TableRow key={component.id}>
                        <TableCell className="font-medium">{component.name}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              component.category === "microcontroller" ? "default" : 
                              component.category === "input" ? "secondary" : 
                              component.category === "output" ? "outline" :
                              "outline"
                            }
                          >
                            {component.category}
                          </Badge>
                        </TableCell>
                        <TableCell>{component.type}</TableCell>
                        <TableCell>{component.pins}</TableCell>
                        <TableCell>{component.last_updated}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleViewComponent(component)}
                              title="View"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditComponent(component)}
                              title="Edit"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteComponent(component)}
                              title="Delete"
                            >
                              <Trash className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                        No components match your filters.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
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
                <Input id="name" placeholder="e.g. LED, Resistor, etc." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <label htmlFor="category">Category</label>
                  <Select defaultValue="input">
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="input">Input</SelectItem>
                      <SelectItem value="output">Output</SelectItem>
                      <SelectItem value="passive">Passive</SelectItem>
                      <SelectItem value="microcontroller">Microcontroller</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <label htmlFor="type">Type</label>
                  <Select defaultValue="basic">
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basic">Basic</SelectItem>
                      <SelectItem value="complex">Complex</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <label htmlFor="pins">Number of Pins</label>
                <Input id="pins" type="number" min="1" defaultValue="2" />
              </div>
              <div className="grid gap-2">
                <label htmlFor="description">Description</label>
                <Textarea 
                  id="description" 
                  placeholder="Describe this component and its functionality"
                  rows={3}
                />
              </div>
              <div className="grid gap-2">
                <label htmlFor="svgPath">SVG Path</label>
                <Input id="svgPath" placeholder="URL or path to SVG representation" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleAddComponent}>Add Component</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Component</DialogTitle>
              <DialogDescription>
                Update the component properties.
              </DialogDescription>
            </DialogHeader>
            {selectedComponent && (
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <label htmlFor="name">Component Name</label>
                  <Input id="name" defaultValue={selectedComponent.name} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <label htmlFor="category">Category</label>
                    <Select defaultValue={selectedComponent.category}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="input">Input</SelectItem>
                        <SelectItem value="output">Output</SelectItem>
                        <SelectItem value="passive">Passive</SelectItem>
                        <SelectItem value="microcontroller">Microcontroller</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <label htmlFor="type">Type</label>
                    <Select defaultValue={selectedComponent.type}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="basic">Basic</SelectItem>
                        <SelectItem value="complex">Complex</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-2">
                  <label htmlFor="pins">Number of Pins</label>
                  <Input id="pins" type="number" min="1" defaultValue={selectedComponent.pins} />
                </div>
                <div className="grid gap-2">
                  <label htmlFor="description">Description</label>
                  <Textarea 
                    id="description" 
                    placeholder="Describe this component and its functionality"
                    rows={3}
                    defaultValue="Component description..."
                  />
                </div>
                <div className="grid gap-2">
                  <label htmlFor="svgPath">SVG Path</label>
                  <Input id="svgPath" placeholder="URL or path to SVG representation" defaultValue="/components/svg/sample.svg" />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveComponent}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Component Details</DialogTitle>
              <DialogDescription>
                Technical information about this component.
              </DialogDescription>
            </DialogHeader>
            {selectedComponent && (
              <div className="grid gap-4 py-4">
                <div className="flex justify-center p-4 bg-muted/30 rounded-lg mb-4">
                  <Cpu className="h-24 w-24 text-primary" />
                </div>
                
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  <div className="font-medium">Name:</div>
                  <div>{selectedComponent.name}</div>
                  
                  <div className="font-medium">Category:</div>
                  <div>
                    <Badge>{selectedComponent.category}</Badge>
                  </div>
                  
                  <div className="font-medium">Type:</div>
                  <div>{selectedComponent.type}</div>
                  
                  <div className="font-medium">Pins:</div>
                  <div>{selectedComponent.pins}</div>
                  
                  <div className="font-medium">Created:</div>
                  <div>{selectedComponent.created_at}</div>
                  
                  <div className="font-medium">Last Updated:</div>
                  <div>{selectedComponent.last_updated}</div>
                </div>
                
                <div className="mt-2">
                  <div className="font-medium mb-1">Description:</div>
                  <div className="text-sm text-muted-foreground border rounded-md p-3">
                    This is a sample description for the {selectedComponent.name} component.
                    It explains how the component works and how it can be used in circuits.
                  </div>
                </div>
                
                <div>
                  <div className="font-medium mb-1">Pin Configuration:</div>
                  <div className="text-sm text-muted-foreground border rounded-md p-3">
                    <ul className="list-disc list-inside">
                      <li>Pin 1: VCC (Power)</li>
                      <li>Pin 2: GND (Ground)</li>
                      {selectedComponent.pins > 2 && <li>Pin 3: Data/Signal</li>}
                      {selectedComponent.pins > 3 && <li>Pin 4: Control</li>}
                      {selectedComponent.pins > 4 && <li>And {selectedComponent.pins - 4} more pins...</li>}
                    </ul>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button onClick={() => setIsViewDialogOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                Confirm Deletion
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this component? This action cannot be undone and may affect existing projects using this component.
              </DialogDescription>
            </DialogHeader>
            {selectedComponent && (
              <div className="border rounded-md p-4 bg-muted/50 my-4">
                <p><strong>Component:</strong> {selectedComponent.name}</p>
                <p><strong>Category:</strong> {selectedComponent.category}</p>
                <p><strong>Type:</strong> {selectedComponent.type}</p>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleConfirmDelete}>Delete Component</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageLayout>
  );
};

export default ComponentLibrary;
