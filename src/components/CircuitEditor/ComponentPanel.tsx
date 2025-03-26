
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ORIGINAL_WOKWI_COMPONENTS } from '@/integrations/wokwi/WokwiIntegration';
import { Input } from '@/components/ui/input';
import { 
  Search, 
  ChevronDown, 
  ChevronRight, 
  Cpu, 
  Lightbulb, 
  Workflow, 
  Monitor, 
  Gauge, 
  AppWindow,
  History,
  SlidersHorizontal,
  Loader2
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useComponentLibrary } from '@/hooks/useComponentLibrary';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { debugDragAndDrop } from '@/utils/componentUtils';

interface ComponentCategory {
  id: string;
  label: string;
  icon: React.ReactNode;
  components: ComponentItem[];
}

interface ComponentItem {
  id: string;
  name: string;
  type: string;
  description: string;
}

const ComponentPanel = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({
    'controllers': true,
    'basic': true
  });

  const [categories, setCategories] = useState<ComponentCategory[]>([]);
  const { components, isLoadingComponents, componentsError } = useComponentLibrary();

  useEffect(() => {
    if (!components || components.length === 0) return;

    const categoryMap: Record<string, ComponentItem[]> = {};
    
    components.forEach(component => {
      if (!component.enabled) return;
      
      const category = component.category || 'other';
      
      if (!categoryMap[category]) {
        categoryMap[category] = [];
      }
      
      categoryMap[category].push({
        id: component.id || `${component.type}-${Date.now()}`,
        name: component.name,
        type: component.type,
        description: component.description || component.name
      });
    });
    
    const getCategoryIcon = (categoryId: string) => {
      switch(categoryId) {
        case 'microcontroller':
          return <Cpu className="h-4 w-4 mr-2" />;
        case 'input':
          return <SlidersHorizontal className="h-4 w-4 mr-2" />;
        case 'output':
          return <Lightbulb className="h-4 w-4 mr-2" />;
        case 'display':
          return <Monitor className="h-4 w-4 mr-2" />;
        case 'sensor':
          return <Gauge className="h-4 w-4 mr-2" />;
        case 'passive':
          return <Workflow className="h-4 w-4 mr-2" />;
        case 'basic':
          return <Workflow className="h-4 w-4 mr-2" />;
        case 'other':
        default:
          return <AppWindow className="h-4 w-4 mr-2" />;
      }
    };
    
    const categoriesArray: ComponentCategory[] = Object.keys(categoryMap).map(categoryId => ({
      id: categoryId,
      label: categoryId.charAt(0).toUpperCase() + categoryId.slice(1),
      icon: getCategoryIcon(categoryId),
      components: categoryMap[categoryId].sort((a, b) => a.name.localeCompare(b.name))
    }));
    
    categoriesArray.sort((a, b) => a.label.localeCompare(b.label));
    
    setCategories(categoriesArray);
  }, [components]);

  const handleDragStart = (e: React.DragEvent, component: ComponentItem) => {
    debugDragAndDrop('Started dragging component', component);
    
    // Set the drag data with stringified component info
    const componentData = JSON.stringify(component);
    e.dataTransfer.setData('application/json', componentData);
    e.dataTransfer.setData('component', componentData); // Keep for compatibility
    e.dataTransfer.effectAllowed = 'copy';
    
    // Create a visual drag image
    const dragImage = document.createElement('div');
    dragImage.innerHTML = `<div class="bg-primary text-white px-2 py-1 rounded text-xs">${component.name}</div>`;
    document.body.appendChild(dragImage);
    dragImage.style.position = 'absolute';
    dragImage.style.top = '-1000px';
    e.dataTransfer.setDragImage(dragImage, 25, 25);
    
    // Add custom cursor styles during drag
    document.body.classList.add('dragging-component');
    
    // Clean up after drag start
    setTimeout(() => {
      document.body.removeChild(dragImage);
    }, 0);
    
    debugDragAndDrop('Drag data set', { 
      componentName: component.name, 
      componentType: component.type 
    });
  };

  const handleDragEnd = (e: React.DragEvent) => {
    document.body.classList.remove('dragging-component');
    debugDragAndDrop('Drag ended');
  };

  const toggleCategory = (categoryId: string) => {
    setOpenCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }));
  };

  const filteredCategories = searchTerm 
    ? categories.map(category => ({
        ...category,
        components: category.components.filter(comp => 
          comp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          comp.description.toLowerCase().includes(searchTerm.toLowerCase())
        )
      })).filter(category => category.components.length > 0)
    : categories;

  return (
    <div className="h-full flex flex-col">
      <div className="relative mb-3">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search components..."
          className="pl-8 text-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {searchTerm && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="absolute right-1 top-1 h-6 w-6 p-0" 
            onClick={() => setSearchTerm('')}
          >
            <span className="sr-only">Clear search</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>
      
      <ScrollArea className="flex-1 pr-3">
        {isLoadingComponents ? (
          <div className="flex flex-col items-center justify-center p-4 text-center text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mb-2 text-primary" />
            <p>Loading components...</p>
          </div>
        ) : componentsError ? (
          <Alert variant="destructive" className="mb-2">
            <AlertDescription>
              Error loading components. Please try refreshing the page.
            </AlertDescription>
          </Alert>
        ) : filteredCategories.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            {searchTerm ? "No components found matching your search" : "No components available"}
          </div>
        ) : (
          <div className="space-y-1">
            {filteredCategories.map(category => (
              <Collapsible 
                key={category.id} 
                open={searchTerm ? true : openCategories[category.id]} 
                className="mb-1"
              >
                <CollapsibleTrigger asChild onClick={() => toggleCategory(category.id)}>
                  <div className="flex items-center justify-between py-2 px-1 hover:bg-accent rounded-md cursor-pointer">
                    <div className="flex items-center text-sm font-medium">
                      {category.icon}
                      {category.label}
                    </div>
                    {searchTerm ? null : (
                      openCategories[category.id] ? 
                        <ChevronDown className="h-4 w-4" /> : 
                        <ChevronRight className="h-4 w-4" />
                    )}
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="pl-4 pr-1">
                  <div className="grid grid-cols-1 gap-1 py-1">
                    {category.components.map(component => (
                      <TooltipProvider key={component.id}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="justify-start h-auto py-1.5 text-sm w-full cursor-grab"
                              draggable={true}
                              onDragStart={(e) => handleDragStart(e, component)}
                              onDragEnd={handleDragEnd}
                              data-component-type={component.type}
                              data-component-name={component.name}
                            >
                              <span className="truncate">{component.name}</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="right">
                            <p>{component.description}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        )}
      </ScrollArea>
      
      <div className="mt-auto pt-2 text-xs text-muted-foreground border-t">
        Drag components to the canvas
      </div>
    </div>
  );
};

export default ComponentPanel;
