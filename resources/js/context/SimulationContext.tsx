import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { toast } from 'sonner';
import { useError } from './ErrorContext';
import { useProject } from './ProjectContext';
import { SimulationState, ComponentSimulationState, PinVoltages } from '@/utils/simulationUtils';
import { generateNetlist as realGenerateNetlist, formatSimulationResults } from '@/simulation/spiceService';
import { pinHandleId } from '@/utils/pinUtils';
import { buildSpiceMapping } from '@/simulation/netlist/buildMapping';
import { spiceIdLower } from '@/simulation/netlist/spiceId';
import { WorkerSolverAdapter } from '@/simulation/netlist/adapters/WorkerSolverAdapter';
import { verifyCircuit as runCircuitVerification, type VerificationResult } from '@/simulation/verify/circuitVerifier';
import { AVRRunner } from '@/simulation/avr/AVRRunner';
import { compileSketch, CompileError } from '@/simulation/avr/compile';
import { isBoardType, getBoardProfile, computeBoardDirectives } from '@/simulation/avr/boardModel';
import type { BoardProfile } from '@/simulation/avr/boardProfiles';
import { PinResolver } from '@/simulation/logic/logicFamilies';
import { connectAnalogInputsToMcu, connectDigitalInputsToMcu } from '@/simulation/mixedMode/mcuCoupling';
import { MixedModeScheduler } from '@/simulation/mixedMode/MixedModeScheduler';
import { attachBusDevices } from '@/simulation/bus/busHost';

// This matches the type needed by our simulation engine

// A single line in the Serial Monitor. `time` is the epoch-ms the line was
// logged so the monitor can render optional timestamps.
export interface SerialLine {
  id: number;
  time: number;
  text: string;
}

// Cap the serial buffer here (the single owner of the array) so the monitor
// never has to defensively re-slice on every render.
const MAX_SERIAL_LINES = 1000;

interface SimulationContextType {
  isSimulationRunning: boolean;
  setIsSimulationRunning: React.Dispatch<React.SetStateAction<boolean>>;
  toggleSimulation: () => void;
  simulationState: SimulationState | null;
  serialOutput: SerialLine[];
  addSerialOutput: (message: string | string[]) => void;
  clearSerialOutput: () => void;
  notifyCircuitChanged: () => void; // New: call this on relevant circuit changes
  /** True while a sketch is being compiled for an emulated board. */
  isCompiling: boolean;
  /** Compile the project's sketch and (re)start it on the board. */
  compileAndRun: () => Promise<void>;
  /** Send a line of text to the emulated board's serial input. */
  sendSerialInput: (text: string) => void;
  /**
   * One-shot pre-Run safety check of the current circuit (short circuits,
   * LED overcurrent, …). Solves on a dedicated worker so it never disturbs
   * the live simulation loop. Never throws.
   */
  verifyCircuit: () => Promise<VerificationResult>;
}

const SimulationContext = createContext<SimulationContextType | undefined>(undefined);

interface SimulationProviderProps {
  children: ReactNode;
}

// Pin -> SPICE-node mapping (buildSpiceMapping) now lives in
// '@/simulation/netlist/buildMapping' so it can be unit-tested in isolation
// and share one union-find net-merge with any future solver caller.

export const SimulationProvider: React.FC<SimulationProviderProps> = ({ children }) => {
  const [isSimulationRunning, setIsSimulationRunning] = useState<boolean>(false);
  const [serialOutput, setSerialOutput] = useState<SerialLine[]>([]);
  const [simulationState, setSimulationState] = useState<SimulationState | null>(null);
  const [isCompiling, setIsCompiling] = useState<boolean>(false);
  const { setError } = useError();
  const { components, updateComponent, wires, code } = useProject();

  // --- Worker and run sequencing ---
  const workerRef = useRef<Worker | null>(null);
  // Debounce, run-id issuance, and stale-result rejection all live in the
  // scheduler (see MixedModeScheduler for the sequencing rules).
  const schedulerRef = useRef<MixedModeScheduler>(new MixedModeScheduler(50));

  // --- Emulated control board (AVR) state ---
  const avrRunnerRef = useRef<AVRRunner | null>(null);
  const boardIdRef = useRef<string | null>(null);
  // Chip profile of the running board (Uno/Nano/Mega): drives its FQBN,
  // pin map, and analog-channel base for the co-simulation feedback.
  const boardProfileRef = useRef<BoardProfile | null>(null);
  // Digital-level resolver for the running board's inputs (holds per-pin
  // hysteresis state); recreated whenever the board profile changes.
  const pinResolverRef = useRef<PinResolver | null>(null);
  // Detaches display decoders (I2C/GPIO) bound to the running board.
  const detachDisplaysRef = useRef<(() => void) | null>(null);
  // Incremented whenever the board (re)starts or stops, so an in-flight
  // compile can detect it has been superseded.
  const boardSessionRef = useRef<number>(0);
  const serialLineBufferRef = useRef<string>('');
  const serialFlushTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notifyCircuitChangedRef = useRef<() => void>(() => {});
  const codeRef = useRef<string>(code);
  codeRef.current = code;
  // Latest components, for decoders that read attributes mid-run.
  const componentsRef = useRef(components);
  componentsRef.current = components;

  // Dedicated solver for the pre-Run verifier, created lazily and kept warm.
  const verifySolverRef = useRef<WorkerSolverAdapter | null>(null);

  const verifyCircuit = useCallback(async (): Promise<VerificationResult> => {
    if (components.length === 0) return { errors: [], warnings: [] };
    if (!verifySolverRef.current) verifySolverRef.current = new WorkerSolverAdapter();
    return runCircuitVerification(components, wires || [], verifySolverRef.current);
  }, [components, wires]);

  // --- Utility: Generate netlist for wired components only ---
  const generateNetlist = useCallback((): string => {
    const { componentsForSpice } = buildSpiceMapping(components, wires || []);
    // Inject the emulator's live pin report into board components so the
    // netlist reflects what the sketch is doing right now. Snapshotting
    // here (netlist-generation time) also closes each PWM duty window.
    const runner = avrRunnerRef.current;
    const snapshot = runner?.isRunning ? runner.snapshotPins() : null;
    const augmented = componentsForSpice.map((comp) => {
      const profile = getBoardProfile(comp.type);
      if (!profile) return comp;
      return {
        ...comp,
        properties: {
          ...comp.properties,
          __boardDirectives: computeBoardDirectives(
            comp.pins,
            comp.id === boardIdRef.current ? snapshot : null,
            profile,
          ),
        },
      };
    });
    return realGenerateNetlist(augmented);
  }, [components, wires]);

  // --- Serial Monitor helpers ---
  const serialLineIdRef = useRef<number>(0);
  const addSerialOutput = useCallback((message: string | string[]) => {
    // Accept batches and split embedded newlines so every array entry is
    // exactly one rendered line in the monitor.
    const texts = (Array.isArray(message) ? message : [message])
      .flatMap(m => String(m).split('\n'));
    if (texts.length === 0) return;
    const time = Date.now();
    const lines: SerialLine[] = texts.map(text => ({
      id: ++serialLineIdRef.current,
      time,
      text,
    }));
    setSerialOutput(prev => {
      const next = prev.concat(lines);
      return next.length > MAX_SERIAL_LINES ? next.slice(-MAX_SERIAL_LINES) : next;
    });
  }, []);
  const clearSerialOutput = useCallback(() => {
    setSerialOutput([]);
  }, []);

  // --- Emulated board: serial TX line buffering ---
  // Bytes arrive one at a time from the USART; group them into lines, and
  // flush a partial line after a short pause so Serial.print() without a
  // newline still shows up.
  const emitSerialByte = useCallback((byte: number) => {
    if (serialFlushTimeoutRef.current) {
      clearTimeout(serialFlushTimeoutRef.current);
      serialFlushTimeoutRef.current = null;
    }
    const char = String.fromCharCode(byte);
    if (char === '\n') {
      const line = serialLineBufferRef.current.replace(/\r$/, '');
      serialLineBufferRef.current = '';
      addSerialOutput(line);
      return;
    }
    serialLineBufferRef.current += char;
    serialFlushTimeoutRef.current = setTimeout(() => {
      if (serialLineBufferRef.current) {
        addSerialOutput(serialLineBufferRef.current);
        serialLineBufferRef.current = '';
      }
    }, 150);
  }, [addSerialOutput]);

  // --- Emulated board lifecycle ---
  const stopBoard = useCallback(() => {
    boardSessionRef.current++;
    detachDisplaysRef.current?.();
    detachDisplaysRef.current = null;
    avrRunnerRef.current?.stop();
    avrRunnerRef.current = null;
    boardProfileRef.current = null;
    pinResolverRef.current = null;
    serialLineBufferRef.current = '';
    if (serialFlushTimeoutRef.current) {
      clearTimeout(serialFlushTimeoutRef.current);
      serialFlushTimeoutRef.current = null;
    }
  }, []);

  /**
   * Compile the project sketch and boot it on the first board on the
   * canvas. No board or no code is not an error — the circuit still
   * simulates, and board power rails stay live via the netlist defaults.
   */
  const startBoard = useCallback(async (): Promise<void> => {
    stopBoard();
    const session = boardSessionRef.current;
    const board = components.find((comp) => isBoardType(comp.type));
    boardIdRef.current = board?.id ?? null;
    if (!board) return;
    const profile = getBoardProfile(board.type);
    boardProfileRef.current = profile;
    if (!profile) return;
    const sketch = codeRef.current;
    if (!sketch?.trim()) {
      addSerialOutput('[Board powered, but there is no sketch code to run]');
      return;
    }
    setIsCompiling(true);
    addSerialOutput('[Compiling sketch...]');
    let hex: string;
    try {
      const result = await compileSketch(sketch, profile.fqbn);
      hex = result.hex;
      const memoryLine = result.stdout
        .split('\n')
        .find((line) => line.includes('bytes of program storage'));
      if (memoryLine) addSerialOutput(`[${memoryLine.trim()}]`);
    } catch (err) {
      const message = err instanceof CompileError ? err.message : String(err);
      addSerialOutput(`[Error] ${message}`);
      if (err instanceof CompileError && err.output) {
        addSerialOutput(err.output);
      }
      toast.error(message);
      return;
    } finally {
      setIsCompiling(false);
    }
    if (session !== boardSessionRef.current) return; // stopped/restarted meanwhile
    const runner = new AVRRunner(hex, profile);
    runner.onSerialByte = emitSerialByte;
    // GPIO changes rerun SPICE through the existing debounced path.
    runner.onPinChange = () => notifyCircuitChangedRef.current();
    avrRunnerRef.current = runner;
    // Bind wired bus peripherals (displays, IMU, RTC, SD card) to the chip.
    // Attributes are read through a ref so Sensor-panel edits reach the
    // decoders mid-run without restarting the board.
    detachDisplaysRef.current = attachBusDevices(
      runner,
      components,
      wires || [],
      board.id,
      profile,
      (componentId) => componentsRef.current.find((comp) => comp.id === componentId)?.attributes,
    );
    runner.start();
    addSerialOutput('[Sketch running]');
    notifyCircuitChangedRef.current();
  }, [components, wires, stopBoard, addSerialOutput, emitSerialByte]);

  const sendSerialInput = useCallback((text: string) => {
    addSerialOutput(`> ${text}`);
    avrRunnerRef.current?.serialWrite(text + '\n');
  }, [addSerialOutput]);

  // --- Worker message handler ---
  const handleWorkerMessage = useCallback((e: MessageEvent) => {
    const msg = e.data;
    if (msg.type === 'ready') {
      console.log(`[SimulationContext] Simulation engine ready (fetched in ${msg.fetchMs}ms).`);
      return;
    }
    if (msg.type === 'debug') {
      console.log('[SpiceWorker DEBUG] capturedStdout:', msg.capturedStdout);
      return;
    }
    if (msg.type === 'result') {
      // Apply any result newer than the last one we applied; drop only truly
      // out-of-order or post-stop runs (see MixedModeScheduler.accept).
      if (!schedulerRef.current.accept(msg.runId)) return;
      const { componentsForSpice, pinToNodeMap } = buildSpiceMapping(components, wires || []);
      // With a board on the canvas the monitor belongs to the sketch: the
      // circuit re-solves continuously (every GPIO change), and compile /
      // runtime messages must survive, so don't wipe it or flood it with
      // per-run reports. Without a board, keep the classic behavior:
      // each result replaces the report.
      if (components.some((comp) => isBoardType(comp.type))) {
        // Still refresh the published results for renderer fallbacks.
        formatSimulationResults(msg.data, componentsForSpice);
      } else {
        clearSerialOutput();
        const { t, v, i } = msg.data;
        // Collect the whole report and append it in a single state update.
        const report: string[] = [
          `[Simulation run ${msg.runId}]`,
          `[Result] t: ${t.length}, v: ${v.length}, i: ${i.length}`,
        ];
        if (v && v.length > 0) {
          report.push('Node Voltages:');
          v.forEach((voltage, idx) => {
            report.push(`  Node ${idx + 1}: ${voltage.toFixed(4)} V`);
          });
        }
        if (i && i.length > 0) {
          report.push('Device Currents:');
          i.forEach((current, idx) => {
            report.push(`  Device ${idx + 1}: ${current.toExponential(4)} A`);
          });
        }
        report.push(formatSimulationResults(msg.data, componentsForSpice));
        addSerialOutput(report);
      }
      // Map node voltages back onto each component pin using the same
      // pin -> node assignment that produced the netlist. Ground is 0V and
      // is never printed by ngspice.
      const nodeVoltages: { [node: string]: number } = msg.data.voltages || {};
      const deviceCurrents: { [device: string]: number } = msg.data.currents || {};
      const simState: SimulationState = {};
      components.forEach((comp) => {
        const pinVoltages: PinVoltages = {};
        (comp.pins || []).forEach((pin, pinIndex) => {
          const pinKey = `${comp.id}_${pinHandleId(pin, pinIndex)}`;
          const nodeName = pinToNodeMap.get(pinKey);
          if (nodeName === '0') {
            pinVoltages[pin.id] = 0;
          } else if (nodeName !== undefined && nodeVoltages[nodeName] !== undefined) {
            pinVoltages[pin.id] = nodeVoltages[nodeName];
          }
        });
        // Per-pin entering currents from device branch currents (ngspice
        // lowercases device names in output). SPICE convention: positive
        // branch current enters the device's first node.
        const spiceId = spiceIdLower(comp.id);
        let pinCurrents: { [pinIndex: number]: number } | undefined;
        const branchCurrent =
          deviceCurrents[`r${spiceId}`] ??
          deviceCurrents[`d${spiceId}`] ??
          deviceCurrents[`l${spiceId}`] ??
          deviceCurrents[`v${spiceId}`];
        if (branchCurrent !== undefined && (comp.pins || []).length === 2) {
          pinCurrents = { 0: branchCurrent, 1: -branchCurrent };
        }
        // Potentiometer: two track halves A-W and W-B; KCL at the wiper
        // gives the current entering from the external wire.
        const trackAw = deviceCurrents[`r${spiceId}aw`];
        const trackWb = deviceCurrents[`r${spiceId}wb`];
        if (trackAw !== undefined && trackWb !== undefined) {
          pinCurrents = { 0: trackAw, 1: trackWb - trackAw, 2: -trackWb };
        }
        // Slide switch: same two-half topology around the common pin.
        const sideA = deviceCurrents[`r${spiceId}a`];
        const sideB = deviceCurrents[`r${spiceId}b`];
        if (sideA !== undefined && sideB !== undefined) {
          pinCurrents = { 0: sideA, 1: sideB - sideA, 2: -sideB };
        }
        // RGB LED: three diodes into the common cathode (pin 1).
        const chanR = deviceCurrents[`d${spiceId}r`];
        const chanG = deviceCurrents[`d${spiceId}g`];
        const chanB = deviceCurrents[`d${spiceId}b`];
        if (chanR !== undefined && chanG !== undefined && chanB !== undefined) {
          pinCurrents = { 0: chanR, 1: -(chanR + chanG + chanB), 2: chanG, 3: chanB };
        }
        // Current source: the netlist lists its nodes swapped (- then +) so
        // current flows out of the + pin; invert the convention to match.
        const sourceDc = deviceCurrents[`i${spiceId}`];
        if (sourceDc !== undefined && (comp.pins || []).length === 2) {
          pinCurrents = { 0: -sourceDc, 1: sourceDc };
        }
        simState[comp.id] = { pinVoltages, pinCurrents };
      });
      setSimulationState(simState);
      // Close the co-simulation loop: solved node voltages become the
      // chip's inputs, so digitalRead()/analogRead() see the real circuit.
      const runner = avrRunnerRef.current;
      const boardId = boardIdRef.current;
      const profile = boardProfileRef.current;
      if (runner?.isRunning && boardId && profile && simState[boardId]) {
        const board = components.find((comp) => comp.id === boardId);
        const pinVoltages = simState[boardId].pinVoltages;
        const pins = board?.pins || [];
        const resolver =
          pinResolverRef.current ?? (pinResolverRef.current = new PinResolver(profile.logicFamily));
        connectAnalogInputsToMcu(runner, profile, pins, pinVoltages);
        connectDigitalInputsToMcu(runner, profile, pins, pinVoltages, resolver);
      }
    } else if (msg.type === 'error') {
      if (!schedulerRef.current.accept(msg.runId)) return;
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
    const runId = schedulerRef.current.begin();
    workerRef.current.postMessage({ type: 'run', runId, netlist });
  }, [generateNetlist]);

  // --- Notify circuit changed (from canvas or the emulated board) ---
  // Debounced by the scheduler: rapid canvas edits and GPIO toggle bursts
  // from the board coalesce into one solve per window.
  const notifyCircuitChanged = useCallback(() => {
    if (!isSimulationRunning) return;
    schedulerRef.current.request(rerunSimulation);
  }, [isSimulationRunning, rerunSimulation]);

  // Board callbacks fire from timer slices; route them to the latest
  // notifyCircuitChanged without rebinding listeners.
  useEffect(() => {
    notifyCircuitChangedRef.current = notifyCircuitChanged;
  }, [notifyCircuitChanged]);

  // --- Persistent worker: created once, kept warm across Start/Stop ---
  // The worker compiles spice.wasm as soon as it boots, so the engine is
  // ready before the user ever presses Start.
  const ensureWorker = useCallback((): Worker => {
    if (!workerRef.current) {
      workerRef.current = new Worker('/models/SpiceWorker.js', { type: 'module' });
    }
    return workerRef.current;
  }, []);

  // Preload the engine on editor mount and keep the message handler current.
  useEffect(() => {
    const worker = ensureWorker();
    worker.onmessage = handleWorkerMessage;
  }, [ensureWorker, handleWorkerMessage]);

  // --- Start simulation ---
  const startSimulation = useCallback(() => {
    const worker = ensureWorker();
    worker.onmessage = handleWorkerMessage;
    setIsSimulationRunning(true);
    clearSerialOutput();
    // Boot the sketch on any board present (async: compiles first).
    void startBoard();
  }, [ensureWorker, handleWorkerMessage, clearSerialOutput, startBoard]);

  // --- Stop simulation ---
  const stopSimulation = useCallback(() => {
    stopBoard();
    // Keep the worker (and its compiled engine) alive for the next run;
    // just stop tracking results.
    workerRef.current?.postMessage({ type: 'stop' });
    // Invalidate in-flight runs and drop any pending debounced re-solve so
    // no straggler result (or ghost run) lands after stop.
    schedulerRef.current.invalidate();
    setIsSimulationRunning(false);
    setSimulationState(null);
    // Clear the result globals too: component renderers fall back to them
    // (e.g. the LED's circuit-summary check), so leaving them around keeps
    // parts lit after the simulation has stopped.
    window.simulationResults = undefined;
    window.lastCircuitSummary = undefined;
    addSerialOutput('[Simulation stopped]');
  }, [addSerialOutput, stopBoard]);

  // --- Toggle simulation ---
  const toggleSimulation = useCallback(() => {
    if (isSimulationRunning) {
      stopSimulation();
    } else {
      startSimulation();
    }
  }, [isSimulationRunning, startSimulation, stopSimulation]);

  // --- Compile & Run (from the code editor) ---
  const compileAndRun = useCallback(async (): Promise<void> => {
    if (!components.some((comp) => isBoardType(comp.type))) {
      toast.error('Add an Arduino board (Uno, Nano, or Mega) to the canvas to run code on it.');
      return;
    }
    if (!isSimulationRunning) {
      startSimulation(); // boots the board with the current sketch
      return;
    }
    await startBoard(); // recompile (cached when unchanged) and restart
  }, [components, isSimulationRunning, startSimulation, startBoard]);

  // --- Cleanup on unmount ---
  useEffect(() => {
    return () => {
      stopBoard();
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
      verifySolverRef.current?.dispose();
      verifySolverRef.current = null;
    };
  }, [stopBoard]);

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
    isCompiling,
    compileAndRun,
    sendSerialInput,
    verifyCircuit,
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
