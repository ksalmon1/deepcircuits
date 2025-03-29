import React, { useEffect, useState } from 'react';
import { WokwiComponent } from '@/integrations/wokwi/WokwiIntegration';
import { useComponentLibrary } from '@/hooks/useComponentLibrary';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronDown, ChevronRight, Folder } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Card } from '@/components/ui/card';
export interface ComponentPanelProps {
  onComponentSelect: (component: WokwiComponent) => void;
}
const ComponentPanel: React.FC<ComponentPanelProps> = ({
  onComponentSelect
}) => {
  const {
    components,
    isLoadingComponents,
    componentsDetailsMap
  } = useComponentLibrary();
  const [categorizedComponents, setCategorizedComponents] = useState<Record<string, any[]>>({});
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({});
  useEffect(() => {
    if (components && components.length > 0) {
      // Filter enabled components and group them by category
      const enabledComponents = components.filter(comp => comp.enabled);

      // Group components by category
      const grouped = enabledComponents.reduce((acc, component) => {
        const category = component.category || 'Uncategorized';
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(component);
        return acc;
      }, {} as Record<string, any[]>);
      setCategorizedComponents(grouped);

      // Initialize open states for all categories (default open)
      const initialOpenState = Object.keys(grouped).reduce((acc, category) => {
        acc[category] = true; // Default all categories to open
        return acc;
      }, {} as Record<string, boolean>);
      setOpenCategories(initialOpenState);
    }
  }, [components]);
  const handleDragStart = (e: React.DragEvent, component: any) => {
    // Create a WokwiComponent object from the component library item
    const wokwiComponent: WokwiComponent = {
      id: crypto.randomUUID(),
      type: component.type,
      attributes: {},
      top: 0,
      left: 0,
      pins: [],
      // Include the SVG path from the component
      svgPath: component.svgPath,
      isOriginal: component.isOriginal
    };
    console.log(`Drag start for component: ${component.name} (${component.type})`);
    console.log(`SVG path included: ${component.svgPath ? 'Yes' : 'No'}`);
    e.dataTransfer.setData('component', JSON.stringify(wokwiComponent));
    e.dataTransfer.effectAllowed = 'copy';
  };
  const toggleCategory = (category: string) => {
    setOpenCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };
  if (isLoadingComponents) {
    return <div className="h-full flex flex-col p-4">
        <h2 className="text-lg font-semibold mb-4">Components</h2>
        <div className="flex-1 overflow-auto">
          {Array.from({
          length: 4
        }).map((_, i) => <div key={i} className="space-y-2 mb-6">
              <Skeleton className="h-4 w-24" />
              <div className="grid grid-cols-1 gap-2">
                {Array.from({
              length: 3
            }).map((_, j) => <Skeleton key={j} className="h-16 w-full" />)}
              </div>
            </div>)}
        </div>
      </div>;
  }
  return <div className="h-full flex flex-col">
      <h2 className="text-lg font-semibold p-4 pb-2 border-b px-[17px] py-0 text-left">Components</h2>
      
      <div className="flex-1 overflow-auto p-2">
        {Object.entries(categorizedComponents).map(([category, categoryComponents]) => <Collapsible key={category} open={openCategories[category]} onOpenChange={() => toggleCategory(category)} className="mb-2">
            <Card className="border-0 shadow-none">
              <CollapsibleTrigger className="w-full flex items-center p-2 hover:bg-gray-100 rounded-md cursor-pointer transition-colors">
                {openCategories[category] ? <ChevronDown className="h-4 w-4 mr-2 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 mr-2 text-muted-foreground" />}
                <Folder className="h-4 w-4 mr-2 text-primary" />
                <span className="text-sm font-medium">{category}</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  ({categoryComponents.length})
                </span>
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <div className="pl-8 pr-2 pt-1 space-y-1">
                  {categoryComponents.map(component => <div key={component.id} className="bg-white hover:bg-blue-50 border border-gray-100 rounded-md p-2 cursor-grab hover:border-blue-200 transition-colors" draggable onDragStart={e => handleDragStart(e, component)}>
                      <div className="text-sm">{component.name}</div>
                    </div>)}
                </div>
              </CollapsibleContent>
            </Card>
          </Collapsible>)}
        
        {Object.keys(categorizedComponents).length === 0 && !isLoadingComponents && <div className="text-center text-gray-500 mt-8">
            No components available. Please contact an administrator.
          </div>}
      </div>
    </div>;
};
export default ComponentPanel;