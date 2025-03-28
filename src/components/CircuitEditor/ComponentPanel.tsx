
import React, { useEffect, useState } from 'react';
import { WokwiComponent } from '@/integrations/wokwi/WokwiIntegration';
import { useComponentLibrary } from '@/hooks/useComponentLibrary';
import { Skeleton } from '@/components/ui/skeleton';

export interface ComponentPanelProps {
  onComponentSelect: (component: WokwiComponent) => void;
}

const ComponentPanel: React.FC<ComponentPanelProps> = ({ onComponentSelect }) => {
  const { components, isLoadingComponents } = useComponentLibrary();
  const [categorizedComponents, setCategorizedComponents] = useState<Record<string, any[]>>({});
  
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
    }
  }, [components]);

  const handleDragStart = (e: React.DragEvent, component: any) => {
    // Create a WokwiComponent object from the component library item
    const wokwiComponent: WokwiComponent = {
      id: crypto.randomUUID(),
      type: component.type,
      name: component.name,
      attributes: {},
      position: { x: 0, y: 0 },
      pins: []
    };
    
    e.dataTransfer.setData('component', JSON.stringify(wokwiComponent));
    e.dataTransfer.effectAllowed = 'copy';
  };

  if (isLoadingComponents) {
    return (
      <div className="h-full overflow-auto p-4 space-y-6">
        <h2 className="text-lg font-semibold mb-4">Components</h2>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <div className="grid grid-cols-1 gap-2">
              {Array.from({ length: 3 }).map((_, j) => (
                <Skeleton key={j} className="h-16 w-full" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-2">
      <h2 className="text-lg font-semibold mb-4">Components</h2>
      
      {Object.entries(categorizedComponents).map(([category, categoryComponents]) => (
        <div key={category} className="mb-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">{category}</h3>
          <div className="grid grid-cols-1 gap-2">
            {categoryComponents.map((component) => (
              <div
                key={component.id}
                className="bg-white border rounded p-2 cursor-grab hover:bg-blue-50 hover:border-blue-300 transition-colors"
                draggable
                onDragStart={(e) => handleDragStart(e, component)}
              >
                <div className="text-sm font-medium">{component.name}</div>
                <div className="text-xs text-gray-500">{component.type}</div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {Object.keys(categorizedComponents).length === 0 && !isLoadingComponents && (
        <div className="text-center text-gray-500 mt-8">
          No components available. Please contact an administrator.
        </div>
      )}
    </div>
  );
};

export default ComponentPanel;
