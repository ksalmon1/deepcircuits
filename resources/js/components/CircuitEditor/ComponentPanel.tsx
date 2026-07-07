import React, { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { useComponentLibrary } from '@/hooks/useComponentLibrary';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { ComponentLibraryItem } from '@/types/component';
import { useCircuitEditor } from '@/context/CircuitEditorContext';
import PartPreview from './PartPreview';

/** Display order for library categories; unknown ones sort last. */
const CATEGORY_ORDER = [
  'Basic',
  'Power',
  'Passive',
  'Input Controls',
  'Output & Actuators',
  'Displays',
  'Sensors',
  'Boards',
];

const categoryRank = (category: string): number => {
  const index = CATEGORY_ORDER.indexOf(category);
  return index === -1 ? CATEGORY_ORDER.length : index;
};

const ComponentPanel: React.FC = () => {
  const { components, isLoadingComponents } = useComponentLibrary();
  const { setDraggingComponentType } = useCircuitEditor();
  const [search, setSearch] = useState('');

  const categorized = useMemo(() => {
    const enabled = (components ?? []).filter((comp) => comp.enabled);
    const needle = search.trim().toLowerCase();
    const visible = needle
      ? enabled.filter(
          (comp) =>
            comp.name.toLowerCase().includes(needle) ||
            comp.type.toLowerCase().includes(needle) ||
            (comp.description ?? '').toLowerCase().includes(needle) ||
            (comp.category ?? '').toLowerCase().includes(needle),
        )
      : enabled;

    const groups = new Map<string, ComponentLibraryItem[]>();
    for (const comp of visible) {
      const category = comp.category || 'Other';
      if (!groups.has(category)) groups.set(category, []);
      groups.get(category)!.push(comp);
    }
    return [...groups.entries()]
      .sort(([a], [b]) => categoryRank(a) - categoryRank(b) || a.localeCompare(b))
      .map(([category, items]) => [category, items.sort((a, b) => a.name.localeCompare(b.name))] as const);
  }, [components, search]);

  const handleDragStart = (e: React.DragEvent, component: ComponentLibraryItem) => {
    e.dataTransfer.effectAllowed = 'copy';
    setDraggingComponentType(component.type);
  };

  const handleDragEnd = () => {
    setDraggingComponentType(null);
  };

  if (isLoadingComponents) {
    return (
      <div className="h-full flex flex-col p-4">
        <h2 className="text-lg font-semibold mb-4">Components</h2>
        <div className="flex-1 overflow-auto">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2 mb-6">
              <Skeleton className="h-4 w-24" />
              <div className="grid grid-cols-2 gap-2">
                {Array.from({ length: 4 }).map((_, j) => (
                  <Skeleton key={j} className="h-20 w-full" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 pb-2 space-y-2">
        <h2 className="text-lg font-semibold">Components</h2>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search parts..."
            className="pl-8 h-9"
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto px-4 pb-4">
        {categorized.map(([category, items]) => (
          <div key={category} className="mb-5">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2 sticky top-0 bg-gray-50 py-1 -my-1 z-10">
              {category}
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {items.map((component) => (
                <div
                  key={component.id}
                  className="group bg-white border rounded-lg p-2 cursor-grab select-none
                             hover:border-blue-400 hover:shadow-sm transition-all
                             flex flex-col items-center gap-1.5"
                  draggable
                  onDragStart={(e) => handleDragStart(e, component)}
                  onDragEnd={handleDragEnd}
                  title={component.description || component.name}
                >
                  <div className="flex items-center justify-center rounded bg-gray-50 group-hover:bg-blue-50/60 transition-colors p-1.5">
                    <PartPreview type={component.type} svgPath={component.svgPath} size={44} />
                  </div>
                  <div className="text-[11px] font-medium text-center leading-tight text-gray-700">
                    {component.name}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {categorized.length === 0 && (
          <div className="text-center text-gray-500 mt-8 text-sm">
            {search ? `No parts match "${search}".` : 'No components available.'}
          </div>
        )}
      </div>
    </div>
  );
};

export default ComponentPanel;
