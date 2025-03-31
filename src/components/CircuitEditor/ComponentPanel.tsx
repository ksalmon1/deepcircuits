
import React, { useState, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { WokwiComponent } from '@/integrations/wokwi/WokwiIntegration';
import { ComponentLibraryItem } from '@/services/componentLibrary/types';
import { useComponentLibrary } from '@/hooks/useComponentLibrary';
import { convertLibraryItemToWokwiComponent } from '@/services/componentLibraryService';
import EnhancedComponentPreview from './EnhancedComponentPreview';

interface ComponentPanelProps {
  onComponentSelect?: (component: WokwiComponent) => void;
}

const ComponentPanel = ({ onComponentSelect }: ComponentPanelProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredComponents, setFilteredComponents] = useState<ComponentLibraryItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  
  const { 
    components, 
    isLoadingComponents, 
    componentsDetailsMap, 
    isLoadingDetails,
    getComponentDetailsWithPins
  } = useComponentLibrary();
  
  // Generate list of categories from components
  useEffect(() => {
    if (components && components.length > 0) {
      const uniqueCategories = Array.from(
        new Set(components.map((comp) => comp.category))
      );
      setCategories(['All', ...uniqueCategories.filter(Boolean)]);
    }
  }, [components]);
  
  // Filter components based on search query and active category
  useEffect(() => {
    if (!components) return;
    
    let filtered = [...components];
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (comp) => 
          comp.name.toLowerCase().includes(query) || 
          comp.type.toLowerCase().includes(query) ||
          (comp.description && comp.description.toLowerCase().includes(query))
      );
    }
    
    // Filter by category
    if (activeCategory !== 'All') {
      filtered = filtered.filter((comp) => comp.category === activeCategory);
    }
    
    // Filter out disabled components
    filtered = filtered.filter((comp) => comp.enabled);
    
    setFilteredComponents(filtered);
  }, [searchQuery, activeCategory, components]);
  
  const handleDragStart = (event: React.DragEvent, component: ComponentLibraryItem) => {
    // Get component details including pins and properties from Supabase
    let pins = component.pins || [];
    let properties = component.properties || {};
    
    // Check if we have detailed data in the cache
    if (component.id && componentsDetailsMap && componentsDetailsMap[component.id]) {
      const details = componentsDetailsMap[component.id];
      if (details) {
        pins = details.pins || [];
        properties = details.properties || {};
      }
    }
    
    // Create data for the drag operation
    const dragData = {
      id: component.id,
      type: component.type,
      name: component.name,
      svgPath: component.svgPath,
      isOriginal: component.isOriginal,
      pins: pins,
      properties: properties
    };
    
    event.dataTransfer.setData('component', JSON.stringify(dragData));
    event.dataTransfer.effectAllowed = 'copy';
  };

  const handleComponentClick = (component: ComponentLibraryItem) => {
    if (onComponentSelect) {
      // Convert to WokwiComponent for compatibility with circuit editor
      const wokwiComponent = convertLibraryItemToWokwiComponent(component);
      
      // Apply pins and properties from the details map
      if (component.id && componentsDetailsMap && componentsDetailsMap[component.id]) {
        const details = componentsDetailsMap[component.id];
        if (details) {
          wokwiComponent.pins = details.pins || [];
          wokwiComponent.attributes = details.properties || {};
        }
      }
      
      onComponentSelect(wokwiComponent);
    }
  };
  
  if (isLoadingComponents) {
    return (
      <div className="p-4">
        <p className="text-sm text-center text-gray-500">Loading components...</p>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="p-3 border-b">
        <h3 className="text-lg font-medium mb-2">Components</h3>
        <Input
          type="text"
          placeholder="Search components..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="mb-2"
        />
        
        <div className="flex flex-wrap gap-1 mt-2">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`text-xs px-2 py-1 rounded-md ${
                activeCategory === category
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>
      
      <ScrollArea className="flex-1 p-2">
        <div className="grid grid-cols-2 gap-2">
          {filteredComponents.length > 0 ? (
            filteredComponents.map((component) => (
              <div
                key={component.id || component.type}
                className="border rounded-md p-2 cursor-grab hover:bg-gray-50 transition-colors"
                draggable
                onDragStart={(e) => handleDragStart(e, component)}
                onClick={() => handleComponentClick(component)}
              >
                <div className="h-20 flex items-center justify-center p-1 mb-1">
                  <EnhancedComponentPreview
                    componentType={component.type}
                    svgPath={component.svgPath}
                    isOriginal={component.isOriginal}
                    className="max-h-full"
                  />
                </div>
                <div className="text-xs font-medium text-center truncate" title={component.name}>
                  {component.name}
                </div>
                <div className="text-[10px] text-gray-500 text-center truncate" title={component.type}>
                  {component.type}
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-2 text-center p-4 text-gray-500">
              No components found
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default ComponentPanel;
