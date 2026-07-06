import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { toast } from 'sonner';
import { useError } from './ErrorContext';
import { useProject } from './ProjectContext';
import { SimulationState, ComponentSimulationState, PinVoltages } from '@/utils/simulationUtils';
import type { AppComponentModel, AppConnectionModel } from '@/simulation/appStateTypes';
import { generateNetlist as realGenerateNetlist, formatSimulationResults } from '@/simulation/spiceService';

// This matches the type needed by our simulation engine

interface SimulationContextType {
  isSimulationRunning: boolean;
  setIsSimulationRunning: React.Dispatch<React.SetStateAction<boolean>>;
  toggleSimulation: () => void;
  simulationState: SimulationState | null;
  serialOutput: string[];
  addSerialOutput: (message: string) => void;
  clearSerialOutput: () => void;
  notifyCircuitChanged: () => void; // New: call this on relevant circuit changes
}

const SimulationContext = createContext<SimulationContextType | undefined>(undefined);

interface SimulationProviderProps {
  children: ReactNode;
}

// --- Node Mapping Helpers (from CircuitEditorLayout) ---
type PinToSpiceNodeMap = Map<string, string>; // Map<componentId_pinId, spiceNodeName>

function getSpiceNode(pinKey: string, component: AppComponentModel | undefined, pinToNodeMap: PinToSpiceNodeMap, nextNodeCounter: { value: number }): string {
  if (pinToNodeMap.has(pinKey)) {
    return pinToNodeMap.get(pinKey)!;
  }
  const pinId = pinKey.split('_')[1];
  const pinDefinition = component?.pins?.find(p => p.id === pinId);
  const pinName = pinDefinition?.name?.toUpperCase();
  if (pinName === 'GND' || pinName === 'GROUND') {
    pinToNodeMap.set(pinKey, '0');
    return '0';
  }
  if (component?.type?.toLowerCase() === 'voltagesource' || component?.type?.toLowerCase() === 'power') {
    if (component.pins && component.pins.length > 1 && pinId === component.pins[1]?.id) {
      if (pinName !== 'POSITIVE' && pinName !== '+') {
        pinToNodeMap.set(pinKey, '0');
        return '0';
      }
    }
  }
  const newNodeName = String(nextNodeCounter.value++);
  pinToNodeMap.set(pinKey, newNodeName);
  return newNodeName;
}

function mergeNodes(connections: AppConnectionModel[], pinToNodeMap: PinToSpiceNodeMap): void {
  let changed = true;
  let pass = 0;
  const MAX_PASSES = 20;
  while (changed && pass < MAX_PASSES) {
    pass++;
    changed = false;
    for (const conn of connections) {
      const fromKey = `${conn.from.componentId}_${conn.from.pinId}`;
      const toKey = `${conn.to.componentId}_${conn.to.pinId}`;
      if (!pinToNodeMap.has(fromKey) || !pinToNodeMap.has(toKey)) continue;
      const node1 = pinToNodeMap.get(fromKey)!;
      const node2 = pinToNodeMap.get(toKey)!;
      let representativeNode = node1;
      let nodeToMerge = node2;
      if (node1 === node2) continue;
      if (node1 === '0') {
        representativeNode = '0';
        nodeToMerge = node2;
      } else if (node2 === '0') {
        representativeNode = '0';
        nodeToMerge = node1;
      } else if (parseInt(node2, 10) < parseInt(node1, 10)) {
        representativeNode = node2;
        nodeToMerge = node1;
      }
      if (representativeNode === nodeToMerge) continue;
      pinToNodeMap.forEach((currentNodeName, pinKeyLoop) => {
        if (currentNodeName === nodeToMerge) {
          pinToNodeMap.set(pinKeyLoop, representativeNode);
          changed = true;
        }
      });
    }
  }
}

function findConnectedGroups(connections: AppConnectionModel[], components: AppComponentModel[]): Set<string>[] {
  const graph = new Map<string, Set<string>>();
  components.forEach(comp => {
    comp.pins?.forEach(pin => {
      const pinKey = `${comp.id}_${pin.id}`;
      if (!graph.has(pinKey)) {
        graph.set(pinKey, new Set<string>());
      }
    });
  });
  connections.forEach(conn => {
    const fromKey = `${conn.from.componentId}_${conn.from.pinId}`;
    const toKey = `${conn.to.componentId}_${conn.to.pinId}`;
    if (graph.has(fromKey) && graph.has(toKey)) {
      graph.get(fromKey)!.add(toKey);
      graph.get(toKey)!.add(fromKey);
    }
  });
  const visited = new Set<string>();
  const connectedGroups: Set<string>[] = [];
  graph.forEach((_, pinKey) => {
    if (visited.has(pinKey)) return;
    const group = new Set<string>();
    const queue = [pinKey];
    visited.add(pinKey);
    group.add(pinKey);
    while (queue.length > 0) {
      const current = queue.shift()!;
      graph.get(current)?.forEach(neighbor => {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          group.add(neighbor);
          queue.push(neighbor);
        }
      });
    }
    connectedGroups.push(group);
  });
  return connectedGroups;
}

/**
 * Build the pin -> SPICE-node assignment for the current circuit and the
 * component list augmented with per-pin node names. Shared by netlist
 * generation and by result mapping so both always agree.
 */
function buildSpiceMapping(components: CircuitComponentLike[], wires: WireLike[]) {
  const initialAppComponents: AppComponentModel[] = components.map((instance) => ({
    id: instance.id,
    type: instance.type,
    properties: { ...(instance.attributes || {}) },
    pins: (instance.pins || []).map(pin => ({ id: pin.handle_id || pin.id, name: pin.name })),
  }));
  const appConnections: AppConnectionModel[] = (wires || []).map((edge) => ({
    id: edge.id,
    from: { componentId: edge.source, pinId: edge.sourceHandle || '' },
    to: { componentId: edge.target, pinId: edge.targetHandle || '' },
  }));
  const pinToNodeMap: PinToSpiceNodeMap = new Map();
  const nextNodeCounter = { value: 1 };
  initialAppComponents.forEach(comp => {
    comp.pins?.forEach(pin => {
      const pinKey = `${comp.id}_${pin.id}`;
      getSpiceNode(pinKey, comp, pinToNodeMap, nextNodeCounter);
    });
  });
  const connectedGroups = findConnectedGroups(appConnections, initialAppComponents);
  connectedGroups.forEach(group => {
    let representativeNode: string | null = null;
    for (const pinKey of group) {
      if (pinToNodeMap.has(pinKey)) {
        const node = pinToNodeMap.get(pinKey)!;
        if (node === '0' || !representativeNode) {
          representativeNode = node;
          if (node === '0') break;
        } else if (representativeNode && parseInt(node, 10) < parseInt(representativeNode, 10)) {
          representativeNode = node;
        }
      }
    }
    if (!representativeNode) {
      representativeNode = String(nextNodeCounter.value++);
    }
    for (const pinKey of group) {
      pinToNodeMap.set(pinKey, representativeNode);
    }
  });
  mergeNodes(appConnections, pinToNodeMap);
  const componentsForSpice = initialAppComponents.map(comp => {
    const spiceConnections = comp.pins?.map(pin => {
      const pinKey = `${comp.id}_${pin.id}`;
      const nodeName = pinToNodeMap.get(pinKey);
      if (nodeName === undefined) {
        throw new Error(`Pin ${pin.id} ('${pin.name}') on component ${comp.id} (${comp.type}) could not be mapped to a SPICE node.`);
      }
      return nodeName;
    }) || [];
    return { ...comp, spiceConnections };
  });
  return { componentsForSpice, pinToNodeMap };
}

interface CircuitComponentLike {
  id: string;
  type: string;
  attributes?: Record<string, unknown>;
  pins?: Array<{ id: string; handle_id?: string; name?: string }>;
}

interface WireLike {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

export const SimulationProvider: React.FC<SimulationProviderProps> = ({ children }) => {
  const [isSimulationRunning, setIsSimulationRunning] = useState<boolean>(false);
  const [serialOutput, setSerialOutput] = useState<string[]>([]);
  const [simulationState, setSimulationState] = useState<SimulationState | null>(null);
  const { setError } = useError();
  const { components, updateComponent, wires } = useProject();

  // --- Worker and runId state ---
  const workerRef = useRef<Worker | null>(null);
  const runIdRef = useRef<number>(0);
  const latestRunIdRef = useRef<number>(0);
  const lastNetlistRef = useRef<string>('');
  const rerunPendingRef = useRef<boolean>(false);

  // --- Utility: Generate netlist for wired components only ---
  const generateNetlist = useCallback((): string => {
    const { componentsForSpice } = buildSpiceMapping(components, wires || []);
    return realGenerateNetlist(componentsForSpice);
  }, [components, wires]);

  // --- Serial Monitor helpers ---
  const addSerialOutput = useCallback((message: string) => {
    setSerialOutput(prev => [...prev, message]);
  }, []);
  const clearSerialOutput = useCallback(() => {
    setSerialOutput([]);
  }, []);

  // --- Worker message handler ---
  const handleWorkerMessage = useCallback((e: MessageEvent) => {
    const msg = e.data;
    console.log('[handleWorkerMessage] called with msg:', msg);
    if (msg.type === 'debug') {
      console.log('[SpiceWorker DEBUG] capturedStdout:', msg.capturedStdout);
      return;
    }
    if (msg.type === 'result') {
      if (msg.runId !== latestRunIdRef.current) return; // Ignore stale
      // Optionally clear Serial Monitor for each new result
      clearSerialOutput();
      console.log(`[SerialMonitor] [Simulation run ${msg.runId}]`);
      addSerialOutput(`[Simulation run ${msg.runId}]`);
      console.log(`[SerialMonitor] [Result] t: ${msg.data.t.length}, v: ${msg.data.v.length}, i: ${msg.data.i.length}`);
      addSerialOutput(`[Result] t: ${msg.data.t.length}, v: ${msg.data.v.length}, i: ${msg.data.i.length}`);
      // Print detailed voltages and currents
      const { t, v, i } = msg.data;
      // Voltages
      if (v && v.length > 0) {
        addSerialOutput('Node Voltages:');
        console.log('[SerialMonitor] Node Voltages:');
        v.forEach((voltage, idx) => {
          const line = `  Node ${idx + 1}: ${voltage.toFixed(4)} V`;
          addSerialOutput(line);
          console.log('[SerialMonitor]', line);
        });
      }
      // Currents
      if (i && i.length > 0) {
        addSerialOutput('Device Currents:');
        console.log('[SerialMonitor] Device Currents:');
        i.forEach((current, idx) => {
          const line = `  Device ${idx + 1}: ${current.toExponential(4)} A`;
          addSerialOutput(line);
          console.log('[SerialMonitor]', line);
        });
      }
      // --- User-friendly formatted output ---
      const { componentsForSpice, pinToNodeMap } = buildSpiceMapping(components, wires || []);
      // Format and add the user-friendly summary
      const formatted = formatSimulationResults(msg.data, componentsForSpice);
      addSerialOutput(formatted);
      // Map node voltages back onto each component pin using the same
      // pin -> node assignment that produced the netlist. Ground is 0V and
      // is never printed by ngspice.
      const nodeVoltages: { [node: string]: number } = msg.data.voltages || {};
      const simState: SimulationState = {};
      components.forEach(comp => {
        const pinVoltages: PinVoltages = {};
        (comp.pins || []).forEach((pin) => {
          const pinKey = `${comp.id}_${pin.handle_id || pin.id}`;
          const nodeName = pinToNodeMap.get(pinKey);
          if (nodeName === '0') {
            pinVoltages[pin.id] = 0;
          } else if (nodeName !== undefined && nodeVoltages[nodeName] !== undefined) {
            pinVoltages[pin.id] = nodeVoltages[nodeName];
          }
        });
        simState[comp.id] = { pinVoltages };
      });
      setSimulationState(simState);
    } else if (msg.type === 'error') {
      if (msg.runId !== latestRunIdRef.current) return;
      addSerialOutput(`[Error] ${msg.message}`);
      toast.error(`Simulation error: ${msg.message}`);
      setIsSimulationRunning(false);
      setSimulationState(null);
    }
  }, [addSerialOutput, clearSerialOutput, components, wires]);

  // --- Rerun simulation (send to worker) ---
  const rerunSimulation = useCallback(() => {
    if (!workerRef.current) return;
    const netlist = generateNetlist();
    lastNetlistRef.current = netlist;
    const runId = ++runIdRef.current;
    latestRunIdRef.current = runId;
    console.log('[SimulationContext] rerunSimulation called. Sending netlist for runId', runId, netlist);
    workerRef.current.postMessage({ type: 'run', runId, netlist });
  }, [generateNetlist]);

  // --- Notify circuit changed (from canvas) ---
  const notifyCircuitChanged = useCallback(() => {
    if (!isSimulationRunning) return;
    // Debounce: If a run is already pending, skip
    if (rerunPendingRef.current) return;
    rerunPendingRef.current = true;
    console.log('[SimulationContext] notifyCircuitChanged called. Will rerun simulation in 50ms.');
    setTimeout(() => {
      rerunPendingRef.current = false;
      rerunSimulation();
    }, 50); // Debounce rapid changes
  }, [isSimulationRunning, rerunSimulation]);

  // --- Start simulation ---
  const startSimulation = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
    // Use the correct path for your build system
    const worker = new Worker('/models/SpiceWorker.js', { type: 'module' });
    workerRef.current = worker;
    worker.onmessage = handleWorkerMessage;
    setIsSimulationRunning(true);
    clearSerialOutput();
  }, [handleWorkerMessage, clearSerialOutput]);

  // --- Stop simulation ---
  const stopSimulation = useCallback(() => {
    if (workerRef.current) {
      // Send stop message to worker for cleanup
      workerRef.current.postMessage({ type: 'stop' });
      workerRef.current.terminate();
      workerRef.current = null;
    }
    setIsSimulationRunning(false);
    setSimulationState(null);
    addSerialOutput('[Simulation stopped]');
  }, [addSerialOutput]);

  // --- Toggle simulation ---
  const toggleSimulation = useCallback(() => {
    if (isSimulationRunning) {
      stopSimulation();
    } else {
      startSimulation();
    }
  }, [isSimulationRunning, startSimulation, stopSimulation]);

  // --- Cleanup on unmount ---
  useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);

  // --- Context value ---
  const value: SimulationContextType = {
    isSimulationRunning,
    setIsSimulationRunning,
    toggleSimulation,
    simulationState,
    serialOutput,
    addSerialOutput,
    clearSerialOutput,
    notifyCircuitChanged, // Expose for canvas
  };

  // Ensure simulation run is triggered after isSimulationRunning is set to true
  useEffect(() => {
    if (isSimulationRunning) {
      notifyCircuitChanged();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSimulationRunning]);

  return (
    <SimulationContext.Provider value={value}>
      {children}
    </SimulationContext.Provider>
  );
};

export const useSimulation = (): SimulationContextType => {
  const context = useContext(SimulationContext);
  if (context === undefined) {
    throw new Error('useSimulation must be used within a SimulationProvider');
  }
  return context;
};
