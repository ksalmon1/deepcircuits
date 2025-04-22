/// <reference lib="webworker" />
// This worker must be loaded with { type: 'module' }
// @ts-ignore
import Module from '/models/spice.mjs';

let Module: any = null;
let isInitialized = false;
let globalRunCounter = 0;
let capturedStdout = [];
let capturedStderr = [];

// Helper: Load and initialize the WASM SPICE engine
async function initSpice() {
  if (isInitialized) return;
  Module = await Module({
    locateFile: (path: string) => {
      if (path.endsWith('.wasm')) {
        return '/models/spice.wasm';
      }
      return path;
    },
    print: (text: string) => {
      capturedStdout.push(text);
    },
    printErr: (text: string) => {
      capturedStderr.push(text);
    },
  });
  isInitialized = true;
}

// Helper: Write netlist to FS
function writeNetlist(netlist: string) {
  Module.FS.writeFile('/input.cir', netlist);
}

// Helper: Clean up output file
function cleanupOutput() {
  try {
    Module.FS.unlink('/input.raw');
  } catch (e) {
    // Ignore if file doesn't exist
  }
}

// Helper: Parse voltages/currents from captured stdout
function parseResultsFromStdout(stdoutLines: string[]) {
  // Find the simulation results section
  const t = [];
  const v = [];
  const i = [];
  let inVoltages = false;
  let inCurrents = false;
  for (const line of stdoutLines) {
    const trimmed = line.trim();
    if (trimmed.includes('NODE VOLTAGES')) {
      inVoltages = true;
      inCurrents = false;
      continue;
    }
    if (trimmed.includes('DEVICE CURRENTS')) {
      inVoltages = false;
      inCurrents = true;
      continue;
    }
    if (trimmed.startsWith('--- END SIMULATION RESULTS ---')) {
      break;
    }
    // Parse voltages: v(node) = value
    if (inVoltages) {
      const m = trimmed.match(/v\(([^)]+)\)\s*=\s*([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?)/);
      if (m) {
        // Use node as t, value as v (for demo; real t should come from transient analysis)
        v.push(parseFloat(m[2]));
        t.push(v.length - 1); // Dummy time axis
      }
    }
    // Parse currents: @device[i] = value
    if (inCurrents) {
      const m = trimmed.match(/@([^\[]+)\[i\]\s*=\s*([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?)/);
      if (m) {
        i.push(parseFloat(m[2]));
      }
    }
  }
  return {
    t: new Float32Array(t),
    v: new Float32Array(v),
    i: new Float32Array(i),
  };
}

self.onmessage = async (e) => {
  console.log('[SpiceWorker] onmessage received:', e.data);
  const { type, runId, netlist } = e.data;
  // --- Handle cleanup when user clicks Stop ---
  if (type === 'stop') {
    cleanupOutput();
    // Optionally, close the worker if you want to fully terminate it
    // self.close();
    return;
  }
  if (type === 'run') {
    await initSpice();
    try {
      writeNetlist(netlist);
      cleanupOutput();
      capturedStdout = [];
      capturedStderr = [];
      try {
        Module.callMain(['/input.cir']);
      } catch (err) {
        self.postMessage({ type: 'error', runId, message: err.message || String(err) });
        return;
      }
      // Parse results from captured stdout
      const data = parseResultsFromStdout(capturedStdout);
      self.postMessage(
        { type: 'result', runId, data }
      );
    } catch (err) {
      self.postMessage({ type: 'error', runId, message: err.message || String(err) });
    }
  }
};