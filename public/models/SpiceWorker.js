/// <reference lib="webworker" />
// SpiceWorker.ts - Web Worker for real-time SPICE simulation
//
// NOTE: /models/spice.mjs and /models/spice.wasm must be present in public/models/ for this worker to function.
// @ts-ignore
import Module from '/models/spice.mjs'; // Loads from public/models/

let netlist = '';
let runId = null;
let capturedStdout = [];
let capturedStderr = [];

// Add this function at the top level
function parseAndPostResult() {
  console.log('[SpiceWorker] Full capturedStdout:', capturedStdout, 'length:', capturedStdout.length);
  const lines = capturedStdout.slice();
  const t = [];
  const v = [];
  const i = [];
  let inVoltages = false;
  let inCurrents = false;
  
  // Track the node names and device names for proper mapping
  const voltageNodeNames = [];
  const currentDeviceNames = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    console.log('[SpiceWorker] Parsing line:', trimmed, 'inVoltages:', inVoltages, 'inCurrents:', inCurrents);
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
    if (inVoltages) {
      const m = trimmed.match(/v\(([^)]+)\)\s*=\s*([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?)/);
      if (m) {
        console.log('[SpiceWorker] Matched voltage:', m[1], m[2]);
        // Store the node name
        voltageNodeNames.push(m[1]);
        v.push(parseFloat(m[2]));
        t.push(v.length - 1);
      }
    }
    if (inCurrents) {
      const m = trimmed.match(/@([^\[]+)\[i\]\s*=\s*([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?)/);
      if (m) {
        console.log('[SpiceWorker] Matched current:', m[1], m[2]);
        // Store the device name
        currentDeviceNames.push(m[1]);
        i.push(parseFloat(m[2]));
      }
    }
  }
  
  // Create voltages and currents objects for compatibility with the SimulationResults interface
  const voltages = {};
  const currents = {};
  
  // Map node indices to voltages
  v.forEach((voltage, idx) => {
    // Use the actual node name if available, otherwise use the index+1
    const nodeName = voltageNodeNames[idx] || String(idx + 1);
    voltages[nodeName] = voltage;
  });
  
  // Map device indices to currents
  i.forEach((current, idx) => {
    // Use the actual device name if available, otherwise use a generic name
    const deviceName = currentDeviceNames[idx] || `device${idx + 1}`;
    currents[deviceName] = current;
  });
  
  const result = {
    t: new Float32Array(t),
    v: new Float32Array(v),
    i: new Float32Array(i),
    stdout: lines,
    // Add these for compatibility with SimulationResults
    voltages,
    currents,
    analysisType: 'op',
    rawOutput: lines.join('\n')
  };
  
  console.log('[SpiceWorker] Parsed result:', result);
  self.postMessage({ type: 'result', runId, data: result });
}

self.onmessage = async (e) => {
  const { type, runId: msgRunId, netlist: msgNetlist } = e.data;
  if (type === 'stop') return;
  if (type === 'run') {
    netlist = msgNetlist;
    runId = msgRunId;
    capturedStdout = [];
    capturedStderr = [];

    async function runSimulation() {
        // Set up the Module object for this run
    await Module ({
        arguments: ['-b', 'input.cir'],
        print: function(text) {
          text.split('\n').forEach(line => {
            if (line.trim() !== '') {
              capturedStdout.push(line);
              console.log('[SpiceWorker] print:', line);
              if (line.includes('--- END SIMULATION RESULTS ---')) {
                parseAndPostResult();
              }
            }
          });
        },
        printErr: function(text) {
          text.split('\n').forEach(line => {
            if (line.trim() !== '') {
              capturedStderr.push(line);
              console.error('[SpiceWorker] printErr:', line);
            }
          });
        },
        preRun: [function(mod) {
          mod.FS.writeFile('/input.cir', netlist);
          // Add model files here if needed
          console.log('[SpiceWorker] Netlist written to /input.cir');
        }],
        postRun: [],
        locateFile: (path) => path.endsWith('.wasm') ? '/models/spice.wasm' : path,
      });
    }
    

    // Start the simulation by loading the module
    try {
      await runSimulation();
    } catch (err) {
      console.error('[SpiceWorker] Error during simulation:', err);
      self.postMessage({ type: 'error', runId, message: err.message || String(err) });
    }
  }
};
