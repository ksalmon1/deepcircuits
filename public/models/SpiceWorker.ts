/// <reference lib="webworker" />
// SpiceWorker.ts - Web Worker for real-time SPICE simulation.
//
// The worker is created once per editor session and immediately fetches and
// compiles /models/spice.wasm. The compiled WebAssembly.Module is cached for
// the lifetime of the worker, so every simulation run only pays for
// instantiation (milliseconds) instead of download + compile (seconds).
//
// NOTE: /models/spice.mjs and /models/spice.wasm must be present in
// public/models/ for this worker to function (npm run fetch:spice).
// @ts-expect-error - resolved at runtime from the public directory
import Module from '/models/spice.mjs';

let wasmBytesPromise = null;
let netlist = '';
let runId = null;
let capturedStdout = [];
let capturedStderr = [];

/** Fetch the wasm binary exactly once and keep the bytes in memory. */
function getWasmBytes() {
  if (!wasmBytesPromise) {
    const started = performance.now();
    wasmBytesPromise = fetch('/models/spice.wasm')
      .then((res) => {
        if (!res.ok) throw new Error(`spice.wasm fetch failed: ${res.status}`);
        return res.arrayBuffer();
      })
      .then((bytes) => {
        const ms = Math.round(performance.now() - started);
        console.log(`[SpiceWorker] spice.wasm fetched in ${ms}ms (${bytes.byteLength} bytes, cached for this session)`);
        self.postMessage({ type: 'ready', fetchMs: ms });
        return bytes;
      })
      .catch((err) => {
        wasmBytesPromise = null; // allow retry on next run
        throw err;
      });
  }
  return wasmBytesPromise;
}

// Start fetching as soon as the worker boots so the engine is warm before
// the user presses Start.
getWasmBytes().catch((err) => {
  console.error('[SpiceWorker] Failed to preload spice.wasm:', err);
  self.postMessage({ type: 'error', runId: null, message: `Failed to load simulation engine: ${err.message || err}` });
});

function parseAndPostResult() {
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
        voltageNodeNames.push(m[1]);
        v.push(parseFloat(m[2]));
        t.push(v.length - 1);
      }
    }
    if (inCurrents) {
      const m = trimmed.match(/@([^[]+)\[i\]\s*=\s*([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?)/);
      if (m) {
        currentDeviceNames.push(m[1]);
        i.push(parseFloat(m[2]));
      }
    }
  }

  // Create voltages and currents objects for compatibility with the SimulationResults interface
  const voltages = {};
  const currents = {};
  v.forEach((voltage, idx) => {
    voltages[voltageNodeNames[idx] || String(idx + 1)] = voltage;
  });
  i.forEach((current, idx) => {
    currents[currentDeviceNames[idx] || `device${idx + 1}`] = current;
  });

  const result = {
    t: new Float32Array(t),
    v: new Float32Array(v),
    i: new Float32Array(i),
    stdout: lines,
    voltages,
    currents,
    analysisType: 'op',
    rawOutput: lines.join('\n'),
  };

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
    const runStarted = performance.now();

    try {
      const wasmBytes = await getWasmBytes();
      // A fresh ngspice runtime per run (batch-mode main() is one-shot),
      // instantiated from the cached in-memory binary. Compilation from
      // bytes takes ~tens of milliseconds; the expensive part (network
      // fetch of the 6MB binary) happens only once per session.
      await Module({
        wasmBinary: wasmBytes,
        arguments: ['-b', 'input.cir'],
        print: (text) => {
          text.split('\n').forEach((line) => {
            if (line.trim() !== '') {
              capturedStdout.push(line);
              if (line.includes('--- END SIMULATION RESULTS ---')) {
                console.log(`[SpiceWorker] run ${runId} finished in ${Math.round(performance.now() - runStarted)}ms`);
                parseAndPostResult();
              }
            }
          });
        },
        printErr: (text) => {
          text.split('\n').forEach((line) => {
            if (line.trim() !== '') {
              capturedStderr.push(line);
            }
          });
        },
        preRun: [
          (mod) => {
            mod.FS.writeFile('/input.cir', netlist);
          },
        ],
        postRun: [],
        locateFile: (path) => (path.endsWith('.wasm') ? '/models/spice.wasm' : path),
      });
    } catch (err) {
      console.error('[SpiceWorker] Error during simulation:', err);
      self.postMessage({ type: 'error', runId, message: err.message || String(err) });
    }
  }
};
