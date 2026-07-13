/**
 * NodeSolverAdapter — runs the real ngspice WASM engine in Node, so netlist
 * accuracy can be unit-tested headlessly (no browser, no Web Worker). It loads
 * the same `public/models/spice.mjs` + `spice.wasm` the app ships, writes the
 * netlist to the Emscripten FS, runs batch mode, and parses the captured
 * stdout with the canonical `parseNgspiceResults`.
 *
 * Node-only (imports `node:fs`/`node:url`); never import from browser code.
 *
 * NOTE: the currently-shipped spice.wasm is an Emscripten *web* build whose
 * batch output does not reliably stream through Node's `print` hook, so the
 * headless accuracy path is best-effort until a Node-targeted wasm is built
 * (`solve()` may return empty maps in that case — callers should treat empty
 * as "engine unavailable" and fall back to the browser e2e suite for
 * accuracy). The SolverPort seam and FakeSolverAdapter cover unit testing
 * regardless.
 */
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { parseNgspiceResults } from '../parseResults';
import type { SolverPort, SolveResult } from '../SolverPort';

type EmscriptenFS = { writeFile: (p: string, data: string) => void };
type EmscriptenModule = { FS: EmscriptenFS; callMain?: (args: string[]) => number };
type ModuleFactory = (config: Record<string, unknown>) => Promise<EmscriptenModule>;

const MODELS_DIR = path.resolve(process.cwd(), 'public/models');

export class NodeSolverAdapter implements SolverPort {
  private factory: ModuleFactory | null = null;
  private wasmBinary: Uint8Array | null = null;

  constructor(private readonly modelsDir: string = MODELS_DIR) {}

  private async load(): Promise<{ factory: ModuleFactory; wasmBinary: Uint8Array }> {
    if (!this.factory || !this.wasmBinary) {
      const mjsUrl = pathToFileURL(path.join(this.modelsDir, 'spice.mjs')).href;
      const mod = (await import(/* @vite-ignore */ mjsUrl)) as { default: ModuleFactory };
      this.factory = mod.default;
      this.wasmBinary = readFileSync(path.join(this.modelsDir, 'spice.wasm'));
    }
    return { factory: this.factory, wasmBinary: this.wasmBinary };
  }

  async solve(netlist: string): Promise<SolveResult> {
    const { factory, wasmBinary } = await this.load();
    const stdout: string[] = [];
    await factory({
      wasmBinary,
      arguments: ['-b', 'input.cir'],
      print: (text: string) => {
        for (const line of String(text).split('\n')) {
          if (line.trim() !== '') stdout.push(line);
        }
      },
      printErr: () => {},
      preRun: [(m: EmscriptenModule) => m.FS.writeFile('/input.cir', netlist)],
      locateFile: (p: string) => (p.endsWith('.wasm') ? path.join(this.modelsDir, 'spice.wasm') : p),
    });
    const parsed = parseNgspiceResults(stdout);
    return { voltages: parsed.voltages, currents: parsed.currents, rawOutput: parsed.rawOutput };
  }
}
