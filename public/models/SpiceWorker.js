/// <reference lib="webworker" />
// SpiceWorker.js - Web Worker for real-time SPICE simulation.
//
// The worker is created once per editor session and immediately fetches and
// compiles /models/spice.wasm. The compiled WebAssembly.Module is cached for
// the lifetime of the worker, so every simulation run only pays for
// instantiation (milliseconds) instead of download + compile (seconds).
//
// Runs are serialized: ngspice batch main() is one-shot and the Emscripten
// print callback streams stdout, so two overlapping Module() instances would
// interleave their output. An emulated board re-solves on every GPIO change
// (tens of times per second), so overlap is the common case, not the
// exception. We therefore run one solve at a time and coalesce queued runs to
// the latest pending netlist (older ones are stale by the time we're free).
//
// NOTE: /models/spice.mjs and /models/spice.wasm must be present in
// public/models/ for this worker to function (npm run fetch:spice).
import Module from '/models/spice.mjs';

let wasmBytesPromise = null;
let isRunning = false;
// The most recent run requested while a solve is in progress. Only the
// latest matters; intermediate circuit states are already superseded.
let pendingRun = null;

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

/** Parse one run's captured stdout into the SimulationResults shape. */
function parseResult(capturedStdout) {
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
      // Match any bracketed measurement — [i] (R/V), [id] (diodes),
      // [dc] (current sources) — plus inductor i(Ldev). Kept behavior-in-sync
      // with resources/js/simulation/netlist/parseResults.ts (the worker is
      // served un-bundled and can't import app modules).
      const m =
        trimmed.match(/@([^[]+)\[[a-z]+\]\s*=\s*([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?)/) ||
        trimmed.match(/^i\(([^)]+)\)\s*=\s*([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?)/);
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

  return {
    t: new Float32Array(t),
    v: new Float32Array(v),
    i: new Float32Array(i),
    stdout: lines,
    voltages,
    currents,
    analysisType: 'op',
    rawOutput: lines.join('\n'),
  };
}

/**
 * Execute a single ngspice solve to completion. All capture state is local
 * to this call so concurrent invocations can never corrupt one another (and
 * the serialization below ensures there aren't any).
 */
async function runSolve(runId, netlist) {
  const capturedStdout = [];
  let posted = false;
  const runStarted = performance.now();

  const wasmBytes = await getWasmBytes();
  // A fresh ngspice runtime per run (batch-mode main() is one-shot),
  // instantiated from the cached in-memory binary. Compilation from bytes
  // takes ~tens of milliseconds; the expensive part (network fetch of the
  // 6MB binary) happens only once per session.
  await Module({
    wasmBinary: wasmBytes,
    arguments: ['-b', 'input.cir'],
    print: (text) => {
      text.split('\n').forEach((line) => {
        if (line.trim() !== '') {
          capturedStdout.push(line);
          if (line.includes('--- END SIMULATION RESULTS ---') && !posted) {
            posted = true;
            console.log(`[SpiceWorker] run ${runId} finished in ${Math.round(performance.now() - runStarted)}ms`);
            self.postMessage({ type: 'result', runId, data: parseResult(capturedStdout) });
          }
        }
      });
    },
    printErr: () => {},
    preRun: [
      (mod) => {
        mod.FS.writeFile('/input.cir', netlist);
      },
    ],
    postRun: [],
    locateFile: (path) => (path.endsWith('.wasm') ? '/models/spice.wasm' : path),
  });
}

/**
 * Run `next`, then drain whatever run was queued while it executed. Only the
 * newest queued run survives; the circuit has moved on from the rest.
 */
async function processRun(next) {
  isRunning = true;
  try {
    await runSolve(next.runId, next.netlist);
  } catch (err) {
    console.error('[SpiceWorker] Error during simulation:', err);
    self.postMessage({ type: 'error', runId: next.runId, message: err.message || String(err) });
  } finally {
    isRunning = false;
    const queued = pendingRun;
    pendingRun = null;
    if (queued) {
      void processRun(queued);
    }
  }
}

self.onmessage = (e) => {
  const { type, runId, netlist } = e.data;
  if (type === 'stop') {
    // Drop any queued run; the in-flight solve finishes but its result will
    // be ignored by the main thread (stale runId).
    pendingRun = null;
    return;
  }
  if (type === 'run') {
    if (isRunning) {
      pendingRun = { runId, netlist }; // coalesce to the latest request
    } else {
      void processRun({ runId, netlist });
    }
  }
};
