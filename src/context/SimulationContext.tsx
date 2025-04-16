import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { toast } from 'sonner';
import { ComponentError, withErrorHandling } from '@/utils/errorHandling';
import { useError } from './ErrorContext';
import { useProject } from './ProjectContext';
import { SimulationState, ComponentSimulationState, PinVoltages } from '@/utils/simulationUtils';
import { runSpiceSimulation, SimulationResults } from '@/simulation/spiceService';
import { CircuitComponent } from '@/types/component';
import { ComponentPin } from '@/types/pin';
import type { AppComponentModel } from '@/simulation/appStateTypes';

// This matches the type needed by our simulation engine
interface ComponentWithSpiceConnections extends AppComponentModel {
  spiceConnections: string[];
  id: string;
  type: string;
  pins: { id: string; name?: string; type: string; signals: string[] }[];
  properties: Record<string, any>;
}

// Define the context shape
interface SimulationContextType {
  // Simulation state
  isSimulationRunning: boolean;
  setIsSimulationRunning: React.Dispatch<React.SetStateAction<boolean>>;
  toggleSimulation: () => void;
  
  // Simulation data: Now maps component ID to its state
  simulationState: SimulationState | null;
  // updateSimulationState remains internal, components get state via useEffect
  
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
  // Simulation state: Now maps component ID to its simulation results
  const [isSimulationRunning, setIsSimulationRunning] = useState<boolean>(false);
  const [serialOutput, setSerialOutput] = useState<string[]>([]);
  const [simulationState, setSimulationState] = useState<SimulationState | null>(null);
  
  // Get dependencies from other contexts
  const { setError } = useError();
  const { components, updateComponent } = useProject();
  
  // Internal function to update the simulation state map
  const updateSimulationStateMap = useCallback((stateMap: SimulationState | null) => {
    setSimulationState(stateMap);
  }, []);
  
  // Effect to update components when simulation state changes
  useEffect(() => {
    // If simulation stops or no components, ensure components have null state
    if (!simulationState || !components) {
      components?.forEach(component => {
        if (component.simulationState !== null) { // Only update if needed
          updateComponent({ ...component, simulationState: null });
        }
      });
      return;
    }

    // Update each component with its specific simulation state
    components.forEach(component => {
      const componentState = simulationState[component.id] || null;
      // Only update if the state has actually changed for this component
      if (component.simulationState !== componentState) { 
        updateComponent({
          ...component,
          simulationState: componentState // Pass the specific state or null
        });
      }
    });
    // Depend on the simulationState map directly
  }, [simulationState, components, updateComponent]);
  
  // Add output to serial monitor
  const addSerialOutput = useCallback((message: string) => {
    setSerialOutput(prev => [...prev, message]);
  }, []);
  
  // Clear serial monitor output
  const clearSerialOutput = useCallback(() => {
    setSerialOutput([]);
  }, []);

  // Function to map components to SPICE node model
  const prepareComponentsForSpice = useCallback((): ComponentWithSpiceConnections[] => {
    if (!components) return [];

    const pinToNodeMap = new Map<string, string>();
    let nextNodeId = 1;

    components.forEach(component => {
      if (component.type.toLowerCase() === 'ground') {
        component.pins?.forEach(pin => {
          pinToNodeMap.set(`${component.id}-${pin.id}`, '0');
        });
      }
    });

    const componentsWithConnections = components.map(component => {
      if (component.type.toLowerCase() === 'ground') return null;

      const spiceConnections: string[] = [];
      component.pins?.forEach(pin => {
        const pinKey = `${component.id}-${pin.id}`;
        if (pinToNodeMap.has(pinKey)) {
          spiceConnections.push(pinToNodeMap.get(pinKey)!);
        } else {
          const nodeId = String(nextNodeId++);
          pinToNodeMap.set(pinKey, nodeId);
          spiceConnections.push(nodeId);
        }
      });

      return {
        id: component.id,
        type: component.type,
        pins: component.pins?.map(pin => ({ 
          id: pin.id, 
          name: pin.name,
          type: pin.type,
          signals: pin.signals
        })) || [],
        properties: component.attributes || {},
        spiceConnections
      } as ComponentWithSpiceConnections;
    }).filter(Boolean) as ComponentWithSpiceConnections[];

    components.forEach(component => {
      if (component.type.toLowerCase() === 'wire') {
        const pin1 = component.pins?.[0];
        const pin2 = component.pins?.[1];
        if (pin1 && pin2) {
          const pin1Key = `${component.id}-${pin1.id}`;
          const pin2Key = `${component.id}-${pin2.id}`;
          const node1 = pinToNodeMap.get(pin1Key);
          const node2 = pinToNodeMap.get(pin2Key);
          if (node1 && node2 && node1 !== node2) {
            const targetNode = node1 < node2 ? node1 : node2;
            const sourceNode = node1 < node2 ? node2 : node1;
            pinToNodeMap.forEach((value, key) => {
              if (value === sourceNode) {
                pinToNodeMap.set(key, targetNode);
              }
            });
          }
        }
      }
    });

    return componentsWithConnections.map(component => {
      if (!component || component.type.toLowerCase() === 'wire') return null;
      const spiceConnections = component.pins?.map(pin => {
        const pinKey = `${component.id}-${pin.id}`;
        return pinToNodeMap.get(pinKey) || '0';
      }) || [];
      return { ...component, spiceConnections };
    }).filter(Boolean) as ComponentWithSpiceConnections[];
  }, [components]);
  
  // Core toggle simulation function without try/catch
  const coreToggleSimulation = async () => {
    const newState = !isSimulationRunning;
    setIsSimulationRunning(newState);
    
    if (newState) {
      clearSerialOutput();
      const spiceComponents = prepareComponentsForSpice();
      
      if (spiceComponents.length === 0) {
        toast.warning("No components to simulate");
        setIsSimulationRunning(false);
        updateSimulationStateMap(null); // Clear state if no components
        return;
      }
      
      try {
        const results = await runSpiceSimulation(spiceComponents, addSerialOutput);
        
        // --- Log the resolved results object --- 
        console.log("[SimCtx] DEBUG: runSpiceSimulation resolved. Results object:", results);
        // -------------------------------------

        if (results?.error) {
          toast.error("Simulation failed: " + results.error);
          setIsSimulationRunning(false);
          updateSimulationStateMap(null); // Clear state on error
          return;
        }
        
        if (results) {
          // --- Build the new component-specific simulation state map ---
          const newSimulationState: SimulationState = {};
          console.log("[SimCtx] Entered 'if (results)' block. Processing components..."); 

          spiceComponents.forEach(component => {
            const pinVoltages: PinVoltages = {};
            let componentIsOn = false; // Default state
            console.log(`[SimCtx] Processing component: ${component.id} (${component.type})`); // Log component start

            component.pins?.forEach((pin, index) => {
              const spiceNode = component.spiceConnections[index];
              pinVoltages[pin.id] = results.voltages[spiceNode] ?? 0;
            });
            
            // Log the pins being processed for this component
            console.log(`[SimCtx] Component ${component.id} pins:`, component.pins);
            console.log(`[SimCtx] Component ${component.id} calculated pinVoltages:`, pinVoltages);

            newSimulationState[component.id] = {
              pinVoltages,
              activeStates: [], // Initialize with empty array, will be populated later
            };
            // Log the state being set for this component
            console.log(`[SimCtx] Setting initial state for ${component.id}:`, newSimulationState[component.id]);
          });
          
          // Process animation state rules
          spiceComponents.forEach(component => {
            if (!component.properties) return;
            
            const stateRules = component.properties.stateRules as Record<string, string> | undefined;
            const componentState = newSimulationState[component.id];
            
            if (!stateRules || !componentState) return;
            
            // Calculate active states based on rules
            const activeStates: string[] = [];
            
            // --- Calculate overall component voltage --- START
            let calculatedVoltage = 0;
            let pin1Id: string | undefined = undefined;
            let pin2Id: string | undefined = undefined;

            // Basic logic to find primary pins (can be expanded)
            if (component.type.toLowerCase() === 'led') {
              pin1Id = component.pins?.find(p => p.name?.toLowerCase().includes('anode') || p.type === 'anode' || p.name?.includes('(+)'))?.id;
              pin2Id = component.pins?.find(p => p.name?.toLowerCase().includes('cathode') || p.type === 'cathode' || p.name?.includes('(-)'))?.id;
            } else if (component.pins?.length === 2) {
              // Assume first two pins for simple 2-terminal components
              pin1Id = component.pins[0]?.id;
              pin2Id = component.pins[1]?.id;
            }
            // Add more specific logic for other component types if needed

            if (pin1Id && pin2Id && componentState?.pinVoltages) {
              const v1 = componentState.pinVoltages[pin1Id] ?? 0;
              const v2 = componentState.pinVoltages[pin2Id] ?? 0;
              calculatedVoltage = v1 - v2;
              console.log(`[SimCtx] Component ${component.id} calculated overall voltage (${pin1Id} - ${pin2Id}): ${calculatedVoltage.toFixed(2)}V`);
            } else if (component.pins?.length === 1) {
              // For single pin components, maybe voltage is just the pin voltage relative to ground?
              pin1Id = component.pins[0]?.id;
              if (pin1Id && componentState?.pinVoltages) {
                calculatedVoltage = componentState.pinVoltages[pin1Id] ?? 0;
                console.log(`[SimCtx] Component ${component.id} calculated single pin voltage (${pin1Id}): ${calculatedVoltage.toFixed(2)}V`);
              }
            }
            // --- Calculate overall component voltage --- END
            
            Object.entries(stateRules).forEach(([stateName, ruleExpression]) => {
              try {
                // Create a context for evaluation with available variables
                const evalContext = {
                  voltage: calculatedVoltage, // Use calculated overall voltage
                  current: 0, // Default values (current/resistance not calculated here)
                  resistance: 0,
                  ...component.properties, // Component properties
                  
                  // Pin voltages accessible as pinVoltages.pin1, etc.
                  pinVoltages: componentState.pinVoltages,
                  
                  // Find voltage across pins
                  voltageDiff: (pin1Id: string, pin2Id: string) => {
                    const v1 = componentState.pinVoltages[pin1Id] || 0;
                    const v2 = componentState.pinVoltages[pin2Id] || 0;
                    return v1 - v2;
                  }
                };
                
                // Simple expression evaluator
                const isActive = new Function(
                  ...Object.keys(evalContext),
                  `return Boolean(${ruleExpression});`
                )(...Object.values(evalContext));
                
                if (isActive) {
                  activeStates.push(stateName);
                }
              } catch (error) {
                console.error(`Error evaluating rule for ${component.id}, state ${stateName}:`, error);
              }
            });
            
            // Add active states to simulation state
            newSimulationState[component.id] = {
              ...componentState,
              activeStates
            };
            
            if (activeStates.length > 0) {
              console.log(`[SimCtx] Component ${component.id} active states:`, activeStates);
            }
          });
          // -----------------------------------------------------------------
          
          // Update the context state with the new map
          updateSimulationStateMap(newSimulationState);
        }
      } catch (error) {
        console.error("Error running SPICE simulation:", error);
        toast.error("Simulation failed: " + (error instanceof Error ? error.message : String(error)));
        setIsSimulationRunning(false);
        updateSimulationStateMap(null); // Clear state on exception
      }
    } else {
      // When stopping the simulation, clear the state map
      updateSimulationStateMap(null);
    }
  };
  
  // Wrap core function with error handling
  const toggleSimulation = withErrorHandling(
    coreToggleSimulation,
    'toggleSimulation',
    setError
  );
  
  const value = {
    isSimulationRunning,
    setIsSimulationRunning,
    toggleSimulation,
    // Provide the state map
    simulationState,
    // updateSimulationState is no longer needed in the context value
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
