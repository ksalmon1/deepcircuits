
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { toast } from 'sonner';
import { ComponentError } from '@/utils/errorHandling';
import { useError } from './ErrorContext';
import { useProject } from './ProjectContext';

// Define the context shape
interface SimulationContextType {
  // Simulation state
  isSimulationRunning: boolean;
  setIsSimulationRunning: React.Dispatch<React.SetStateAction<boolean>>;
  toggleSimulation: () => void;
  
  // Serial Monitor
  serialOutput: string[];
  addSerialOutput: (message: string) => void;
  clearSerialOutput: () => void;
}

// Create the context with a default undefined value
const SimulationContext = createContext<SimulationContextType | undefined>(undefined);

// Provider component
interface SimulationProviderProps {
  children: ReactNode;
}

export const SimulationProvider: React.FC<SimulationProviderProps> = ({ children }) => {
  // Simulation state
  const [isSimulationRunning, setIsSimulationRunning] = useState<boolean>(false);
  const [serialOutput, setSerialOutput] = useState<string[]>([]);
  
  // Get dependencies from other contexts
  const { setError } = useError();
  const { components } = useProject();
  
  // Add output to serial monitor
  const addSerialOutput = useCallback((message: string) => {
    setSerialOutput(prev => [...prev, message]);
  }, []);
  
  // Clear serial monitor output
  const clearSerialOutput = useCallback(() => {
    setSerialOutput([]);
  }, []);
  
  // Toggle simulation
  const toggleSimulation = useCallback(() => {
    try {
      setIsSimulationRunning(prev => !prev);
      
      if (!isSimulationRunning) {
        // Starting simulation
        setSerialOutput(prev => [
          ...prev, 
          '--- Simulation started ---',
          'Compiling code...',
          'Uploading to virtual microcontroller...'
        ]);
        
        // Simulate some output after a delay
        setTimeout(() => {
          setSerialOutput(prev => [
            ...prev,
            'Program running...',
            'LED ON'
          ]);
        }, 1500);
      } else {
        // Stopping simulation
        setSerialOutput(prev => [
          ...prev, 
          '--- Simulation stopped ---'
        ]);
      }
    } catch (error) {
      setError(
        error instanceof Error 
          ? error 
          : new ComponentError('Failed to toggle simulation', 'SIMULATION_TOGGLE_ERROR'),
        'toggleSimulation'
      );
    }
  }, [isSimulationRunning, setError]);
  
  const value = {
    isSimulationRunning,
    setIsSimulationRunning,
    toggleSimulation,
    serialOutput,
    addSerialOutput,
    clearSerialOutput
  };
  
  return (
    <SimulationContext.Provider value={value}>
      {children}
    </SimulationContext.Provider>
  );
};

// Hook to use the simulation context
export const useSimulation = (): SimulationContextType => {
  const context = useContext(SimulationContext);
  if (context === undefined) {
    throw new Error('useSimulation must be used within a SimulationProvider');
  }
  return context;
};
