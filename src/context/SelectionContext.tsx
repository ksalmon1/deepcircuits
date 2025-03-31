
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { CircuitComponent } from '@/types/component';
import { useProject } from './ProjectContext';

// Define the context shape
interface SelectionContextType {
  // Selected component
  selectedComponent: CircuitComponent | null;
  selectComponent: (component: CircuitComponent | null) => void;
}

// Create the context with a default undefined value
const SelectionContext = createContext<SelectionContextType | undefined>(undefined);

// Provider component
interface SelectionProviderProps {
  children: ReactNode;
}

export const SelectionProvider: React.FC<SelectionProviderProps> = ({ children }) => {
  // Selection state
  const [selectedComponent, setSelectedComponent] = useState<CircuitComponent | null>(null);
  const { components } = useProject();
  
  // Select a component
  const selectComponent = useCallback((component: CircuitComponent | null) => {
    setSelectedComponent(component);
  }, []);
  
  // Update selected component if modified in the components array
  React.useEffect(() => {
    if (selectedComponent) {
      const updatedComponent = components.find(comp => comp.id === selectedComponent.id);
      
      if (updatedComponent) {
        setSelectedComponent(updatedComponent);
      } else {
        // If selected component was removed, clear selection
        setSelectedComponent(null);
      }
    }
  }, [components, selectedComponent]);
  
  const value = {
    selectedComponent,
    selectComponent
  };
  
  return (
    <SelectionContext.Provider value={value}>
      {children}
    </SelectionContext.Provider>
  );
};

// Hook to use the selection context
export const useSelection = (): SelectionContextType => {
  const context = useContext(SelectionContext);
  if (context === undefined) {
    throw new Error('useSelection must be used within a SelectionProvider');
  }
  return context;
};
