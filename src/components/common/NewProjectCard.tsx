import React from 'react';
import { 
  Card, 
  CardContent,
  CardFooter
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface NewProjectCardProps {
  onCreateProject: (name: string, description: string) => void;
}

const NewProjectCard = ({ onCreateProject }: NewProjectCardProps) => {
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onCreateProject(name.trim(), description.trim());
      setName('');
      setDescription('');
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Card className="h-full border-dashed flex flex-col cursor-pointer shadow-sm hover:shadow-md transition-shadow hover:border-primary/50 hover:bg-primary/5">
          <CardContent className="flex-grow flex flex-col items-center justify-center pt-6">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-3">
              <Plus className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-medium text-primary mb-1">Create New Project</h3>
            <p className="text-sm text-center text-muted-foreground">
              Start designing a new circuit
            </p>
          </CardContent>
          <CardFooter className="justify-center pt-0 pb-6">
            <Button variant="outline">
              <Plus className="h-4 w-4 mr-1" />
              New Project
            </Button>
          </CardFooter>
        </Card>
      </DialogTrigger>
      
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>
              Enter the details for your new circuit project.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Project Name</Label>
              <Input 
                id="name" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                placeholder="My Amazing Circuit"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea 
                id="description" 
                value={description} 
                onChange={(e) => setDescription(e.target.value)} 
                placeholder="Describe what your circuit does..."
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim()}>
              Create Project
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default NewProjectCard;
