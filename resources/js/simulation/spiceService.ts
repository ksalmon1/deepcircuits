/**
 * Service module for interacting with the custom-compiled ngspice WASM.
 * Encapsulates netlist generation, simulation execution, and result parsing.
 * Uses the Emscripten Module factory config to run _main in batch mode (-b).
 */

import type { AppComponentModel } from './appStateTypes';
import { spiceId as toSpiceId } from './netlist/spiceId';
import { getSubckt } from './subckt/subcktLibrary';

interface SpiceFileSystem {
    mkdir: (path: string) => void;
    writeFile: (path: string, data: string) => void;
    readFile: (path: string, opts: { encoding: 'utf8' }) => string;
}

interface SpiceModuleInstance {
    FS: SpiceFileSystem;
    print?: (text: string) => void;
    printErr?: (text: string) => void;
    [key: string]: unknown;
}

type SpiceModuleFactoryFn = (config: Record<string, unknown>) => Promise<SpiceModuleInstance>;

// The Emscripten-compiled ngspice module lives in public/models and is not
// bundled with the app, so it is loaded lazily at runtime from its public URL.
const SPICE_MODULE_URL = '/models/spice.mjs';
let spiceModuleFactoryPromise: Promise<SpiceModuleFactoryFn> | null = null;

function loadSpiceModuleFactory(): Promise<SpiceModuleFactoryFn> {
    if (!spiceModuleFactoryPromise) {
        spiceModuleFactoryPromise = import(/* @vite-ignore */ SPICE_MODULE_URL)
            .then((mod) => mod.default as SpiceModuleFactoryFn)
            .catch((err) => {
                spiceModuleFactoryPromise = null;
                throw err;
            });
    }
    return spiceModuleFactoryPromise;
}

export interface SimulationResults {
    voltages: { [node: string]: number };
    currents: { [source: string]: number };
    analysisType: 'op';
    rawOutput: string;
    error?: string;
    formattedSummary?: string;
}

interface ComponentWithSpiceConnections extends AppComponentModel {
    spiceConnections: string[];
}

let currentSimulationPromise: Promise<SimulationResults | null> | null = null;
let simulationResolve: ((value: SimulationResults | null) => void) | null = null;
let capturedStdoutLines: string[] = [];
let capturedStderrLines: string[] = [];
let mainHasRun = false;
let outputEndMarkerSeen = false;
let outputComplete = false;

/**
 * Parse a SPICE-style number with magnitude suffix ('10k', '4.7meg', '100n').
 * Note SPICE conventions: m = milli, meg = mega.
 */
export function parseSpiceNumber(value: unknown, fallback = 0): number {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value !== 'string') return fallback;
    const match = value.trim().toLowerCase().match(/^([-+]?\d*\.?\d+(?:e[-+]?\d+)?)\s*(meg|[tgkmunpf])?/);
    if (!match || match[1] === undefined || match[1] === '') return fallback;
    const base = parseFloat(match[1]);
    const suffix = match[2];
    const scale: Record<string, number> = {
        t: 1e12, g: 1e9, meg: 1e6, k: 1e3, m: 1e-3, u: 1e-6, n: 1e-9, p: 1e-12, f: 1e-15,
    };
    return suffix ? base * scale[suffix] : base;
}

// Component types that behave as plain resistors at DC. Lamp, buzzer, fuse,
// photoresistor, and thermistor differ only in artwork and state rules.
const RESISTIVE_TYPES = new Set(['resistor', 'photoresistor', 'thermistor', 'lamp', 'buzzer', 'fuse']);

/**
 * Resolve the type used for SPICE modelling. Components whose visual type
 * differs from their electrical behaviour (e.g. Wokwi parts like
 * 'wokwi-pushbutton') carry a 'spiceType' property naming the model to use.
 */
function resolveSpiceType(comp: AppComponentModel): string {
    const spiceType = comp.properties?.spiceType;
    if (typeof spiceType === 'string' && spiceType) return spiceType.toLowerCase();
    return comp.type.toLowerCase();
}

export function generateNetlist(componentsWithNodes: ComponentWithSpiceConnections[]): string {
    // Remove verbose logging
    // console.log("Generating netlist using pre-mapped SPICE nodes:", JSON.stringify(componentsWithNodes, null, 2));
    let netlist = `* Auto-generated netlist for batch mode (-b)\n`;

    let modelStatements = `\n* Models\n`;
    const addedModels = new Set<string>();
    let deviceLines = `\n* Devices\n`;

    // How many pins across the whole circuit sit on each node. A node used by
    // only one pin is electrically dangling, so a board needn't emit a weak
    // pulldown to keep it solvable — which matters for the 85-pin Mega, whose
    // mostly-unconnected header would otherwise bloat the netlist and stall
    // ngspice. Ground (node 0) is always present and excluded.
    const nodeUsage = new Map<string, number>();
    componentsWithNodes.forEach((comp) => {
        (comp.spiceConnections || []).forEach((node) => {
            if (node !== '0') nodeUsage.set(node, (nodeUsage.get(node) || 0) + 1);
        });
    });

    componentsWithNodes.forEach((comp) => {
        const nodes = comp.spiceConnections?.join(' ') || '';
        if (!nodes) {
            console.warn(`Component ${comp.id} (${comp.type}) has no SPICE nodes. Skipping.`);
            return;
        }

        let valueString = '';
        let modelName = '';
        const props = comp.properties || {};
        const spiceId = toSpiceId(comp.id);
        let prefix = '?';

        const type = resolveSpiceType(comp);

        if (RESISTIVE_TYPES.has(type)) {
            deviceLines += `R${spiceId} ${nodes} ${props.resistance !== undefined ? props.resistance : '1k'}\n`;
            return;
        }

        switch (type) {
            case 'capacitor':
                prefix = 'C';
                valueString = props.capacitance !== undefined ? ` ${props.capacitance}` : ' 1u';
                break;
            case 'inductor':
                prefix = 'L';
                valueString = props.inductance !== undefined ? ` ${props.inductance}` : ' 1m';
                break;
            case 'switch': {
                // DC model of an ideal switch: near-zero ohms closed, 1G open.
                const closed = props.closed === true || props.closed === 'true';
                deviceLines += `R${spiceId} ${nodes} ${closed ? '1e-3' : '1e9'}\n`;
                return;
            }
            case 'potentiometer': {
                // Three pins: A (0), Wiper (1), B (2). Splits the track
                // resistance according to the wiper position (0 = at A).
                const total = parseSpiceNumber(props.resistance, 10000);
                const position = Math.min(Math.max(parseSpiceNumber(props.position, 0.5), 0), 1);
                const rAw = Math.max(total * position, 1e-3);
                const rWb = Math.max(total * (1 - position), 1e-3);
                const [nodeA, nodeW, nodeB] = comp.spiceConnections;
                if (nodeA === undefined || nodeW === undefined || nodeB === undefined) {
                    console.warn(`Potentiometer ${comp.id} needs 3 pins. Skipping.`);
                    return;
                }
                deviceLines += `R${spiceId}aw ${nodeA} ${nodeW} ${rAw}\n`;
                deviceLines += `R${spiceId}wb ${nodeW} ${nodeB} ${rWb}\n`;
                return;
            }
            case 'currentsource': {
                // Pins are (+ output, - return). SPICE drives current out of
                // the N- terminal, so swap the node order to make current
                // flow out of the '+' pin into the circuit.
                const amps = parseSpiceNumber(props.current, 0.01);
                const [nPlus, nMinus] = comp.spiceConnections;
                deviceLines += `I${spiceId} ${nMinus} ${nPlus} DC ${amps}\n`;
                return;
            }
            case 'voltagesource':
            case 'power': {
                prefix = 'V';
                let dcVal = '0';
                if (typeof props.voltage === 'number') dcVal = String(props.voltage);
                else if (typeof props.value === 'number') dcVal = String(props.value);
                else if (typeof props.dcValue === 'number') dcVal = String(props.dcValue);
                valueString = ` DC ${dcVal}`;
                break;
            }
            case 'led':
            case 'diode':
            case 'zener':
                prefix = 'D';
                // One model per device so differently-parameterized diodes
                // in the same circuit don't silently share the first model.
                // Use the resolved type: SPICE model names must not contain
                // hyphens (e.g. 'wokwi-led' models as LED).
                modelName = `${type.toUpperCase()}_${spiceId}`;
                valueString = ` ${modelName}`;
                if (!addedModels.has(modelName)) {
                    // Get the model parameters, using provided values or defaults
                    const Is = props.Is !== undefined ? `Is=${props.Is}` : 'Is=1e-9';
                    const n = props.n !== undefined ? `n=${props.n}` : 'n=1';
                    
                    // Add additional parameters if provided
                    let additionalParams = '';
                    // Series resistance (important for LED voltage drop)
                    if (props.Rs !== undefined) additionalParams += ` Rs=${props.Rs}`;
                    // Junction potential/forward voltage (allow both Vj and Vf naming)
                    if (props.Vj !== undefined) additionalParams += ` Vj=${props.Vj}`;
                    else if (props.Vf !== undefined) additionalParams += ` Vj=${props.Vf}`; // Use Vf value but in Vj parameter
                    // Junction capacitance
                    if (props.Cjo !== undefined) additionalParams += ` Cjo=${props.Cjo}`;
                    // Emission coefficient alternative naming
                    if (props.N !== undefined && props.n === undefined) additionalParams += ` n=${props.N}`;
                    // Zener/breakdown region
                    if (props.BV !== undefined) additionalParams += ` BV=${props.BV} IBV=${props.IBV !== undefined ? props.IBV : '1m'}`;
                    
                    modelStatements += `.model ${modelName} D(${Is} ${n}${additionalParams})\n`;
                    addedModels.add(modelName);
                }
                break;
            case 'slideswitch': {
                // SPDT slide switch, pins [1, Common, 2]: the common pin
                // connects to side 1 when open ('closed' false) or side 2
                // when toggled.
                const closed = props.closed === true || props.closed === 'true';
                const [n1, nCom, n2] = comp.spiceConnections;
                if (n1 === undefined || nCom === undefined || n2 === undefined) {
                    console.warn(`Slide switch ${comp.id} needs 3 pins. Skipping.`);
                    return;
                }
                deviceLines += `R${spiceId}a ${n1} ${nCom} ${closed ? '1e9' : '1e-3'}\n`;
                deviceLines += `R${spiceId}b ${nCom} ${n2} ${closed ? '1e-3' : '1e9'}\n`;
                return;
            }
            case 'rgbled': {
                // Common-cathode RGB LED, pins [R, Common, G, B]: three
                // diodes sharing one model.
                const [nR, nCom, nG, nB] = comp.spiceConnections;
                if (nR === undefined || nCom === undefined || nG === undefined || nB === undefined) {
                    console.warn(`RGB LED ${comp.id} needs 4 pins. Skipping.`);
                    return;
                }
                modelName = `RGBLED_${spiceId}`;
                if (!addedModels.has(modelName)) {
                    const Is = props.Is !== undefined ? `Is=${props.Is}` : 'Is=1e-18';
                    const n = props.n !== undefined ? `n=${props.n}` : 'n=1.8';
                    const Vj = props.Vf !== undefined ? ` Vj=${props.Vf}` : '';
                    modelStatements += `.model ${modelName} D(${Is} ${n}${Vj})\n`;
                    addedModels.add(modelName);
                }
                deviceLines += `D${spiceId}r ${nR} ${nCom} ${modelName}\n`;
                deviceLines += `D${spiceId}g ${nG} ${nCom} ${modelName}\n`;
                deviceLines += `D${spiceId}b ${nB} ${nCom} ${modelName}\n`;
                return;
            }
            case 'ground':
                return;
            case 'subckt': {
                // Analog IC backed by a built-in .subckt macromodel (op-amp,
                // comparator, 555 — see subckt/subcktLibrary.ts). One block
                // per used model, one X instance per part; the part's pin
                // order must match the subckt's port order.
                const def = getSubckt(props.subckt);
                if (!def) {
                    console.warn(`Component ${comp.id}: unknown subckt '${props.subckt}'. Skipping.`);
                    return;
                }
                if (comp.spiceConnections.length !== def.ports) {
                    console.warn(`Component ${comp.id}: ${def.name} needs ${def.ports} pins, got ${comp.spiceConnections.length}. Skipping.`);
                    return;
                }
                if (!addedModels.has(def.name)) {
                    modelStatements += `${def.body}\n`;
                    addedModels.add(def.name);
                }
                deviceLines += `X${spiceId} ${nodes} ${def.name}\n`;
                return;
            }
            case 'arduino-uno':
            case 'arduino-nano':
            case 'arduino-mega': {
                // Emulated control board: the AVR emulator's pin report is
                // injected as __boardDirectives (see simulation/avr/
                // boardModel.ts). Driven pins and power rails become DC
                // sources and INPUT_PULLUP pins a resistor to an internal 5V
                // rail; a connected but otherwise-floating pin gets a weak
                // pulldown so its node stays solvable. Unconnected header pins
                // (common on the 54-pin Mega) are dropped — their dangling
                // node needs nothing.
                const directives = props.__boardDirectives as
                    | Array<{ volts?: number; pullup?: boolean } | null>
                    | undefined;
                let railNode = '';
                comp.spiceConnections.forEach((node, pinIndex) => {
                    if (node === '0') return;
                    const directive = directives?.[pinIndex];
                    if (directive?.volts !== undefined) {
                        deviceLines += `V${spiceId}p${pinIndex} ${node} 0 DC ${directive.volts}\n`;
                    } else if (directive?.pullup) {
                        if (!railNode) {
                            railNode = `rail${spiceId}`;
                            deviceLines += `V${spiceId}rail ${railNode} 0 DC 5\n`;
                        }
                        deviceLines += `R${spiceId}p${pinIndex} ${railNode} ${node} 35k\n`;
                    } else if ((nodeUsage.get(node) || 0) > 1) {
                        deviceLines += `R${spiceId}p${pinIndex} ${node} 0 10meg\n`;
                    }
                });
                return;
            }
            default:
                // Visual-only parts (displays, boards, sensor modules, ...)
                // have no electrical model yet: leave them out of the
                // netlist rather than emitting a bogus device line.
                console.warn(`Netlist generation: no SPICE model for type '${comp.type}'. Skipping.`);
                return;
        }
                deviceLines += `${prefix}${spiceId} ${nodes}${valueString}\n`;
    });

    if (addedModels.size > 0) {
        netlist += modelStatements;
    }
    netlist += deviceLines;

    netlist += "\n* Analysis commands using .control block\n";
    netlist += ".control\n";
    netlist += "set noaskquit\n";
    netlist += "set filetype=ascii\n";
    
    // Run the operating point analysis
    netlist += "op\n";
    
    // Begin output section
    netlist += "echo \"--- BEGIN SIMULATION RESULTS ---\"\n";
    
    // Print node voltages, but skip node 0 (reference/ground)
    netlist += "echo \"NODE VOLTAGES:\"\n";

    // Print every non-ground node that an emitted device actually references.
    // Deriving this from the device lines (not from pin counts) keeps nodes
    // that are internal to a multi-terminal model — e.g. a potentiometer's
    // wiper, real even when nothing is wired to it — while still dropping the
    // dozens of dangling header pins skipped for a board like the 85-pin Mega
    // (printing those just makes ngspice churn through non-existent nodes).
    const allNodes = new Set<string>();
    deviceLines.split('\n').forEach(line => {
        const tokens = line.trim().split(/\s+/);
        if (tokens.length < 3 || !/^[A-Za-z]/.test(tokens[0])) return;
        // Subckt instances connect every token between the name and the
        // model: "X<name> <n1> ... <nN> <subckt>". Everything else here is
        // two-terminal: "<name> <n1> <n2> <value>".
        const nodeTokens = /^[Xx]/.test(tokens[0]) ? tokens.slice(1, -1) : tokens.slice(1, 3);
        nodeTokens.forEach(node => {
            if (node && node !== '0') allNodes.add(node);
        });
    });

    Array.from(allNodes).sort().forEach(node => {
        netlist += `print v(${node})\n`;
    });

    // Print device currents - use specific device names without wildcards
    netlist += "echo \"DEVICE CURRENTS:\"\n";
    // This assumes the voltage source has a specific ID from above
    const vsrcIds = componentsWithNodes
        .filter(comp => resolveSpiceType(comp) === 'voltagesource' || resolveSpiceType(comp) === 'power')
        .map(comp => {
            const prefix = 'V';
            const spiceId = toSpiceId(comp.id);
            return `${prefix}${spiceId}`;  // Just use the correct device name pattern from above
        });
    
    if (vsrcIds.length > 0) {
        // Print current for each specific voltage source
        vsrcIds.forEach(id => {
            netlist += `print @${id}[i]\n`;  // Use @device[i] syntax for device current
        });
    }

    // Branch currents for two-terminal devices (after the sources, so the
    // first parsed current stays the source current). These drive the
    // energy-flow direction shown on wires.
    componentsWithNodes.forEach(comp => {
        const type = resolveSpiceType(comp);
        const spiceId = toSpiceId(comp.id);
        if (RESISTIVE_TYPES.has(type) || type === 'switch') {
            netlist += `print @R${spiceId}[i]\n`;
        } else if (type === 'led' || type === 'diode' || type === 'zener') {
            netlist += `print @D${spiceId}[id]\n`;
        } else if (type === 'potentiometer') {
            // Both halves of the track, so each of the three pins gets a current.
            netlist += `print @R${spiceId}aw[i]\n`;
            netlist += `print @R${spiceId}wb[i]\n`;
        } else if (type === 'slideswitch') {
            netlist += `print @R${spiceId}a[i]\n`;
            netlist += `print @R${spiceId}b[i]\n`;
        } else if (type === 'rgbled') {
            netlist += `print @D${spiceId}r[id]\n`;
            netlist += `print @D${spiceId}g[id]\n`;
            netlist += `print @D${spiceId}b[id]\n`;
        } else if (type === 'inductor') {
            // Inductors get an MNA branch vector, printable via i().
            netlist += `print i(L${spiceId})\n`;
        } else if (type === 'currentsource') {
            netlist += `print @I${spiceId}[dc]\n`;
        }
    });

    // End output section
    netlist += "echo \"--- END SIMULATION RESULTS ---\"\n";
    netlist += ".endc\n";
    netlist += ".end\n";

    // Keep this log as requested by the user
    console.log("Final generated netlist (Updated Control Block):\n" + netlist);
    return netlist;
}

function parseSimulationResults(stdout: string, stderr: string): SimulationResults {
    // Remove excessive logging
    // console.log("Parsing simulation output...");
    // console.log("Raw stdout (first 300 chars):", stdout.substring(0, 300));
    
    const results: SimulationResults = {
        voltages: {},
        currents: {},
        analysisType: 'op',
        rawOutput: stdout + '\n' + stderr,
    };

    // Perform basic error check first before attempting to parse
    if (!stdout || stdout.trim() === '') {
        // console.warn("Empty stdout received from simulation");
        results.error = "No simulation output received.";
        if (stderr && stderr.trim() !== '') {
            results.error += `\nError output: ${stderr}`;
        }
        return results;
    }
    
    // Look for results between markers
    let processOutput = stdout;
    const beginMarker = "--- BEGIN SIMULATION RESULTS ---";
    const endMarker = "--- END SIMULATION RESULTS ---";
    
    const beginIndex = stdout.indexOf(beginMarker);
    const endIndex = stdout.indexOf(endMarker);
    
    if (beginIndex !== -1 && endIndex !== -1) {
        processOutput = stdout.substring(beginIndex + beginMarker.length, endIndex).trim();
        // console.log("Found marked results section. Length:", processOutput.length);
        // console.log("Results section sample:", processOutput.substring(0, 300));
    } else {
        // console.warn("Could not find result markers in output. Using full stdout.");
    }

    // We'll use a simpler approach: scan line by line and examine each line directly
    const lines = processOutput.split('\n');
    let currentSection = '';
    let matchedLines = 0;
    
    lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed) return;
        
        // Check for section headers
        if (trimmed.toLowerCase().includes("node voltages")) {
            currentSection = 'voltages';
            return;
        } else if (trimmed.toLowerCase().includes("device currents")) {
            currentSection = 'currents';
            return;
        }
        
        // Skip comments and headers
        if (trimmed.startsWith('*') || trimmed.startsWith('#')) return;
        
        // Parse voltages
        if (currentSection === 'voltages') {
            // Match v(node) = value pattern
            const voltagePart = trimmed.match(/v\(([^)]+)\)\s*=\s*([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?)/i);
            if (voltagePart) {
                const node = voltagePart[1].trim();
                const value = parseFloat(voltagePart[2]);
                if (!isNaN(value)) {
                    results.voltages[node] = value;
                    // console.log(`Found voltage: Node=${node}, Value=${value}`);
                    matchedLines++;
                }
            }
        }
        // Parse currents
        else if (currentSection === 'currents') {
            // Match device current patterns
            // Handle both i(device) and @device[i] syntax
            let currentPart = trimmed.match(/i\(([^)]+)\)\s*=\s*([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?)/i);
            if (!currentPart) {
                // @dev[i] for R/V devices, @dev[id] for diodes, @dev[dc] for current sources
                currentPart = trimmed.match(/@([^[]+)\[(?:id?|dc)\]\s*=\s*([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?)/i);
            }
            
            if (currentPart) {
                const device = currentPart[1].trim();
                const value = parseFloat(currentPart[2]);
                if (!isNaN(value)) {
                    results.currents[device] = value;
                    // console.log(`Found current: Device=${device}, Value=${value}`);
                    matchedLines++;
                }
            }
        }
    });

    // Check for specific error messages in stderr
    const errorMessages = [];
    if (stderr && stderr.trim().length > 0) {
        const stderrLines = stderr.split('\n');
        for (const line of stderrLines) {
            const trimmed = line.trim();
            // Skip warnings about vector availability and function errors that we expect
            if (trimmed.includes("vector") && trimmed.includes("not available")) {
                continue;
            }
            if (trimmed.includes("no such function as") && 
                (trimmed.includes("i,") || trimmed.includes("i("))) {
                continue;
            }
            // Skip known harmless errors
            if (trimmed.includes("no such device or model name") && 
                (trimmed.includes("*") || trimmed.includes("@"))) {
                continue;
            }
            // Collect real errors
            if (/(error|failed|fatal|cannot|invalid)/i.test(trimmed) && 
                !trimmed.includes("fopen(\"/proc/meminfo\")")) {
                errorMessages.push(trimmed);
            }
        }
    }
    
    // Add error if found
    if (errorMessages.length > 0) {
        results.error = `Simulation errors:\n${errorMessages.join('\n')}`;
        console.error(results.error);
    }
    
    // If we found no values at all and no specific error, something went wrong
    if (matchedLines === 0 && !results.error) {
        results.error = "Simulation produced no parsable results. Check circuit connectivity.";
    }

    // Keep this log since it's requested by the user
    console.log("Simulation Results:", {
        voltages: results.voltages,
        currents: results.currents,
        error: results.error || null
    });
    
    return results;
}

/**
 * Formats simulation results in a sequential order for better debugging
 * @param results The raw simulation results
 * @param componentsWithNodes The circuit components with their node connections
 * @returns A formatted string with circuit path information
 */
export function formatSimulationResults(results: SimulationResults, componentsWithNodes: ComponentWithSpiceConnections[]): string {
    if (results.error) {
        return `Simulation Error: ${results.error}`;
    }

    // Publish the raw results immediately so component renderers (and
    // tests) can read them even when the summary below bails out early
    // (e.g. a circuit powered only by a current source).
    if (typeof window !== 'undefined') {
        window.simulationResults = {
            voltages: results.voltages,
            currents: results.currents
        };
    }
    
    // Create a mapping of nodes to components for easier lookup
    const nodeToComponentMap = new Map<string, {
        componentId: string,
        componentType: string,
        pinIndex: number
    }[]>();
    
    // Build the node-to-component mapping
    componentsWithNodes.forEach(comp => {
        comp.spiceConnections?.forEach((node, pinIndex) => {
            if (!nodeToComponentMap.has(node)) {
                nodeToComponentMap.set(node, []);
            }
            nodeToComponentMap.get(node)?.push({
                componentId: comp.id,
                componentType: comp.type,
                pinIndex: pinIndex
            });
        });
    });
    
    // Find a source as the starting point for the walk-through summary.
    // An emulated control board powers the circuit too, but a conventional
    // source makes for a more readable walk-through, so prefer those.
    let voltageSources = componentsWithNodes.filter(
        comp => ['voltagesource', 'power', 'currentsource'].includes(resolveSpiceType(comp))
    );
    if (voltageSources.length === 0) {
        voltageSources = componentsWithNodes.filter(comp => ['arduino-uno', 'arduino-nano', 'arduino-mega'].includes(resolveSpiceType(comp)));
    }

    if (voltageSources.length === 0) {
        return "Cannot create analysis: No source found in circuit.";
    }
    
    const source = voltageSources[0];
    
    // Try different possible key formats with proper case (lowercase v)
    const sourceId = toSpiceId(source.id);
    // Log available current keys for debugging
    console.log('Available current keys:', Object.keys(results.currents));
    // Try to find a current key that matches the voltage source
    let sourceCurrent = results.currents[`vpower${sourceId}`] || results.currents[`v${sourceId}`];
    // If not found, fallback to the first available current value
    if (sourceCurrent === undefined) {
        sourceCurrent = Object.values(results.currents)[0] || 0;
    }
    
    // Calculate current value in mA
    const currentValue = Math.abs(sourceCurrent || 0) * 1000;
    
    // Get voltage nodes sorted by voltage (descending)
    const sortedNodes = Object.entries(results.voltages)
        .sort(([, valueA], [, valueB]) => valueB - valueA);
    
    // Calculate component voltage drops
    const componentDrops = componentsWithNodes.map(comp => {
        if (comp.spiceConnections?.length === 2) {
            const node1 = comp.spiceConnections[0];
            const node2 = comp.spiceConnections[1];
            const voltage1 = results.voltages[node1] || 0;
            const voltage2 = results.voltages[node2] || 0;
            const voltageDrop = Math.abs(voltage1 - voltage2);
            
            // Get a readable component name
            const componentName = comp.type.charAt(0).toUpperCase() + comp.type.slice(1);
            const shortId = comp.id.split('-')[1]?.substring(0, 6) || '';
            
            return {
                name: `${componentName} ${shortId}`,
                type: comp.type,
                id: comp.id,
                node1,
                node2,
                voltageDrop,
                percentage: (voltageDrop / (results.voltages["1"] || 9)) * 100
            };
        }
        return null;
    }).filter(Boolean);
    
    // Build a structured output
    let output = "";
    
    // 1. Summary section
    output += "\nCircuit Summary\n";
    output += "---------------------\n";
    output += `Source Voltage: ${results.voltages["1"] || 9} V\n`;
    output += `Total Current: ${currentValue.toFixed(2)} mA\n`;
    output += `Components: ${componentsWithNodes.length}\n\n`;
    
    // Add a Circuit Connections subsection - visual representation
    output += "Circuit Connections:\n";
    output += "---------------------\n";
    
    // First identify the path through the circuit from source to ground
    const circuitPath: ComponentWithSpiceConnections[] = [];
    const processedComponents = new Set<string>();
    
    // Start with voltage source
    const sourceComp = voltageSources[0];
    let currentNode = sourceComp.spiceConnections?.[1] || '1'; // Output node of source
    circuitPath.push(sourceComp);
    processedComponents.add(sourceComp.id);
    
    // Follow the circuit path until we reach ground or can't find more components
    while (currentNode !== '0' && circuitPath.length < componentsWithNodes.length) {
        // Find components connected to the current node (excluding already processed ones)
        const nodesComponents = nodeToComponentMap.get(currentNode) || [];
        const nextCompInfo = nodesComponents.find(c => !processedComponents.has(c.componentId));
        
        if (!nextCompInfo) break; // No more connections found
        
        // Get the next component
        const nextComp = componentsWithNodes.find(c => c.id === nextCompInfo.componentId);
        if (!nextComp) break;
        
        circuitPath.push(nextComp);
        processedComponents.add(nextComp.id);
        
        // Find the other node of this component (the one we're not currently at)
        const pinIndex = nextComp.spiceConnections.findIndex(n => n === currentNode);
        const otherPinIndex = pinIndex === 0 ? 1 : 0;
        currentNode = nextComp.spiceConnections[otherPinIndex];
    }
    
    // Add any remaining components that weren't in the main path
    componentsWithNodes.forEach(comp => {
        if (!processedComponents.has(comp.id)) {
            circuitPath.push(comp);
            processedComponents.add(comp.id);
        }
    });
    
    // Create a visual representation of the circuit path
    let circuitString = "";
    
    circuitPath.forEach((comp, index) => {
        const compType = comp.type.charAt(0).toUpperCase() + comp.type.slice(1);
        const compShortId = comp.id.split('-')[1]?.substring(0, 6) || '';
        const displayName = `${compType} ${compShortId}`;
        
        // Add component to the circuit string
        circuitString += displayName;
        
        // Add voltage levels between components
        if (index < circuitPath.length - 1) {
            // Find the shared node between this component and the next
            const thisComp = circuitPath[index];
            const nextComp = circuitPath[index + 1];
            
            // Find the connecting node
            let connectingNode = null;
            for (const node of thisComp.spiceConnections) {
                if (nextComp.spiceConnections.includes(node)) {
                    connectingNode = node;
                    break;
                }
            }
            
            // If we found a connecting node, show its voltage
            if (connectingNode) {
                const nodeVoltage = results.voltages[connectingNode];
                const voltageText = nodeVoltage !== undefined ? 
                    ` [${nodeVoltage.toFixed(2)}V] ` : ' → ';
                circuitString += ` →${voltageText}→ `;
            } else {
                circuitString += ' → ';
            }
        }
    });
    
    // Add circuit flow diagram (as text)
    output += circuitString + "\n\n";
    
    // Show components in detail with voltages
    output += "Component Details:\n";
    output += "---------------------\n";
    
    circuitPath.forEach((comp) => {
        const compType = comp.type.charAt(0).toUpperCase() + comp.type.slice(1);
        const compShortId = comp.id.split('-')[1]?.substring(0, 6) || '';
        const displayName = `${compType} ${compShortId}`;
        
        output += `${displayName}\n`;
        
        // Show pins and voltages
        comp.spiceConnections?.forEach((node, index) => {
            const pinName = comp.pins?.[index]?.name || `Pin ${index}`;
            const nodeVoltage = results.voltages[node];
            const voltageText = node === '0' ? '0V' : 
                (nodeVoltage !== undefined ? `${nodeVoltage.toFixed(2)}V` : '?V');
            
            output += `  ${pinName}: ${voltageText}\n`;
        });
        
        // Show voltage drop if it's a two-pin component
        if (comp.spiceConnections?.length === 2) {
            const node1 = comp.spiceConnections[0];
            const node2 = comp.spiceConnections[1];
            const v1 = results.voltages[node1] || 0;
            const v2 = results.voltages[node2] || 0;
            const voltageDrop = Math.abs(v1 - v2);
            
            output += `  Voltage Drop: ${voltageDrop.toFixed(2)}V\n`;
        }
        
        output += '\n';
    });
    
    // Remove trailing newlines to ensure consistent formatting
    output = output.trimEnd();
    
    // ADD: Save the formatted results to window for component renderers to access
    if (typeof window !== 'undefined') {
        window.lastCircuitSummary = output;
        window.simulationResults = {
            voltages: results.voltages,
            currents: results.currents
        };
    }
    
    return output;
}

export function runSpiceSimulation(
  componentsWithNodes: ComponentWithSpiceConnections[],
  addToSerialOutput?: (message: string) => void
): Promise<SimulationResults | null> {
    // console.log('runSpiceSimulation called (using Module config)...');

    if (currentSimulationPromise) {
        console.warn("Simulation already in progress. Ignoring new request.");
        return currentSimulationPromise;
    }

    capturedStdoutLines = [];
    capturedStderrLines = [];
    mainHasRun = false;
    outputEndMarkerSeen = false;
    outputComplete = false;

    currentSimulationPromise = new Promise((resolve) => {
        simulationResolve = resolve;
        const inputFilename = '/input.cir';
        
        const config = {
            arguments: ['-b', inputFilename],
            preRun: [
                (instance: SpiceModuleInstance) => {
                    // Remove this log
                    // console.log("Preparing SPICE simulation...");
                    try {
                        // Create necessary directories to avoid file system errors
                        try {
                            instance.FS.mkdir('/tmp');
                        } catch (e) {
                            // Silent error
                        }

                        // Create an empty spinit file to avoid initialization warnings
                        try {
                            instance.FS.writeFile('/spinit', '* Empty initialization file');
                        } catch (e) {
                            // Silent error
                        }

                        const netlistString = generateNetlist(componentsWithNodes);
                        instance.FS.writeFile(inputFilename, netlistString);
                        // console.log(`Netlist written to ${inputFilename}`);
                        
                        // Check that the netlist was written correctly
                        const readBack = instance.FS.readFile(inputFilename, { encoding: 'utf8' });
                        // console.log("Netlist content verification:", readBack.substring(0, 100) + "...");
                    } catch (e) {
                        console.error("Error during Module.preRun:", e);
                        simulationResolve?.({ voltages: {}, currents: {}, analysisType: 'op', rawOutput: '', error: `preRun failed: ${e}` });
                    }
                }
            ],
            print: (text: string) => {
                // Remove verbose WASM stdout logging
                // console.log("[WASM STDOUT]:", text);
                capturedStdoutLines.push(text);
                
                // Check if this is the end marker for results
                if (text.includes("--- END SIMULATION RESULTS ---")) {
                    outputEndMarkerSeen = true;
                    // Wait a bit to ensure all output is captured
                    setTimeout(() => {
                        outputComplete = true;
                    }, 200); // Increased timeout for more safety
                }
            },
            printErr: (text: string) => {
                // Only log actual errors, not expected filesystem warnings
                if (!text.includes("/proc/meminfo") && !text.includes("spinit")) {
                    // Comment out stderr logging to reduce noise
                    // console.error('[WASM STDERR]:', text);
                }
                capturedStderrLines.push(text);
            },
            postRun: [
                (instance: SpiceModuleInstance) => {
                    // console.log("Module.postRun: _main has finished.");
                    mainHasRun = true;
                    
                    // Function to process results once complete
                    const processResults = () => {
                        // Get the stdout and stderr outputs
                        const stdout = capturedStdoutLines.join('\n');
                        const stderr = capturedStderrLines.join('\n');
                        
                        //console.log("Simulation completed.");
                        
                        // Parse the simulation results
                        const results = parseSimulationResults(stdout, stderr);
                        
                        // Check if any results were found
                        if (Object.keys(results.voltages).length === 0 && 
                            Object.keys(results.currents).length === 0 && 
                            !results.error) {
                            results.error = "No voltage or current values were found in the simulation output.";
                        }
                        
                        // Format results in a sequential order for debugging
                        if (Object.keys(results.voltages).length > 0) {
                            const formattedResults = formatSimulationResults(results, componentsWithNodes);
                            
                            // Store formatted results in the results object for UI display
                            results.formattedSummary = formattedResults;
                            
                            // Log the results to the console as before
                            console.log("\n" + formattedResults + "\n");
                            
                            // If a callback was provided, send the formatted results to the serial output
                            if (addToSerialOutput) {
                                // Split by newlines and send each line separately
                                formattedResults.split('\n').forEach(line => {
                                    addToSerialOutput(line);
                                });
                            }
                        }
                        
                        simulationResolve?.(results);
                        currentSimulationPromise = null;
                        simulationResolve = null;
                    };
                    
                    // If output is complete, process immediately
                    if (outputComplete) {
                        processResults();
                        return;
                    }
                    
                    // Wait for the output to complete with timeout
                    let waitTime = 0;
                    const maxWaitTime = 2000; // 2 seconds max wait
                    const checkInterval = 100;  // Check every 100ms
                    
                    const checkOutputComplete = () => {
                        if (outputComplete) {
                            processResults();
                        } else if (waitTime >= maxWaitTime) {
                            // Timeout reached, process anyway
                            console.warn("Timeout reached waiting for simulation output. Processing available data.");
                            processResults();
                        } else {
                            waitTime += checkInterval;
                            setTimeout(checkOutputComplete, checkInterval);
                        }
                    };
                    
                    // Start the wait loop
                    setTimeout(checkOutputComplete, checkInterval);
                }
            ],
            onAbort: (reason: unknown) => {
                console.error("WASM Module aborted! Reason:", reason);
                if (!mainHasRun && simulationResolve) {
                    simulationResolve({ voltages: {}, currents: {}, analysisType: 'op', rawOutput: capturedStdoutLines.join('\n') + '\n' + capturedStderrLines.join('\n'), error: `WASM aborted: ${reason}` });
                }
                currentSimulationPromise = null;
                simulationResolve = null;
            },
            // Add memory configuration to avoid memory issues
            TOTAL_MEMORY: 16 * 1024 * 1024, // 16MB
            noInitialRun: false,
            noExitRuntime: true
        };

        (async () => {
        try {
            // console.log("Initializing Spice WASM module with config...");
            const spiceModuleFactory = await loadSpiceModuleFactory();
            await spiceModuleFactory(config);
            // console.log("SpiceModuleFactory call completed. Waiting for postRun to resolve promise...");
        } catch (rawError) {
            const error = rawError as { name?: string; status?: number; errno?: number } | null;
            console.error('Error during SpiceModuleFactory execution:', rawError);
            let errorMessage = 'Module factory/execution failed.';

            // Handle specific error types
            if (error?.name === 'ExitStatus') {
                errorMessage = `ngspice exited unexpectedly with status ${error.status}.`;
            } else if (error?.name === 'ErrnoError') {
                // Handle specific errno values with more descriptive messages
                switch (error.errno) {
                    case 44:
                        errorMessage = 'WASM module failed with socket operation error. This may be due to filesystem access restrictions in the browser.';
                        break;
                    case 2:
                        errorMessage = 'WASM module could not find a required file.';
                        break;
                    case 1:
                        errorMessage = 'WASM module encountered a permission denied error.';
                        break;
                    case 13:
                        errorMessage = 'WASM module experienced a permission denied error accessing a file or directory.';
                        break;
                    case 30:
                        errorMessage = 'WASM module attempted to read from a file that is a directory.';
                        break;
                    default:
                        errorMessage = `WASM module failed with error code ${error.errno}.`;
                }
                
                // Add suggestions for resolving common errors
                errorMessage += ' Try simplifying your circuit or refreshing the page.';
            }
            
            simulationResolve?.({
                voltages: {},
                currents: {},
                analysisType: 'op',
                rawOutput: capturedStdoutLines.join('\n') + '\n' + capturedStderrLines.join('\n'),
                error: `${errorMessage}\n${rawError}`
            });
            currentSimulationPromise = null;
            simulationResolve = null;
        }
        })();
    });

    return currentSimulationPromise;
}
