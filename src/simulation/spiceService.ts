/**
 * Service module for interacting with the custom-compiled ngspice WASM.
 * Encapsulates netlist generation, simulation execution, and result parsing.
 * Uses the Emscripten Module factory config to run _main in batch mode (-b).
 */

import SpiceModuleFactory from './spice.mjs';
import type { AppComponentModel } from './appStateTypes';

interface SpiceModuleInstance {
    FS: any;
    print?: (text: string) => void;
    printErr?: (text: string) => void;
    [key: string]: any;
}

export interface SimulationResults {
    voltages: { [node: string]: number };
    currents: { [source: string]: number };
    analysisType: 'op';
    rawOutput: string;
    error?: string;
}

interface ComponentWithSpiceConnections extends AppComponentModel {
    spiceConnections: string[];
}

let currentSimulationPromise: Promise<SimulationResults | null> | null = null;
let simulationResolve: ((result: SimulationResults | null) => void) | null = null;
let capturedStdoutLines: string[] = [];
let capturedStderrLines: string[] = [];
let mainHasRun = false;
let outputEndMarkerSeen = false;
let outputComplete = false;

function generateNetlist(componentsWithNodes: ComponentWithSpiceConnections[]): string {
    console.log("Generating netlist using pre-mapped SPICE nodes:", JSON.stringify(componentsWithNodes, null, 2));
    let netlist = `* Auto-generated netlist for batch mode (-b)\n`;

    let modelStatements = `\n* Models\n`;
    const addedModels = new Set<string>();
    let deviceLines = `\n* Devices\n`;

    componentsWithNodes.forEach((comp) => {
        const nodes = comp.spiceConnections?.join(' ') || '';
        if (!nodes) {
            console.warn(`Component ${comp.id} (${comp.type}) has no SPICE nodes. Skipping.`);
            return;
        }

        let valueString = '';
        let modelName = '';
        const props = comp.properties || {};
        const spiceId = comp.id.replace(/-/g, '');
        let prefix = '?';

        switch (comp.type.toLowerCase()) {
            case 'resistor':
                prefix = 'R';
                valueString = props.resistance !== undefined ? ` ${props.resistance}` : ' 1k';
                break;
            case 'capacitor':
                prefix = 'C';
                valueString = props.capacitance !== undefined ? ` ${props.capacitance}` : ' 1u';
                break;
            case 'inductor':
                prefix = 'L';
                valueString = props.inductance !== undefined ? ` ${props.inductance}` : ' 1m';
                break;
            case 'voltagesource':
            case 'power':
                prefix = 'V';
                let dcVal = '0';
                if (typeof props.voltage === 'number') dcVal = String(props.voltage);
                else if (typeof props.value === 'number') dcVal = String(props.value);
                else if (typeof props.dcValue === 'number') dcVal = String(props.dcValue);
                valueString = ` DC ${dcVal}`;
                break;
            case 'led':
            case 'diode':
                prefix = 'D';
                modelName = `${comp.type.toUpperCase()}_MODEL`;
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
                    
                    modelStatements += `.model ${modelName} D(${Is} ${n}${additionalParams})\n`;
                    addedModels.add(modelName);
                }
                break;
            case 'ground':
                return;
            default:
                prefix = comp.type.charAt(0).toUpperCase();
                console.warn(`Netlist generation: Unhandled type '${comp.type}'. Using prefix '${prefix}'.`);
                valueString = props.value !== undefined && props.value !== null ? ` ${props.value}` : '';
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

    // Get all unique node numbers from all component connections
    const allNodes = new Set<string>();
    componentsWithNodes.forEach(comp => {
        if (comp.spiceConnections) {
            comp.spiceConnections.forEach(node => {
                if (node !== '0') { // Skip node 0 (ground)
                    allNodes.add(node);
                }
            });
        }
    });

    // Print each non-ground node voltage
    Array.from(allNodes).sort().forEach(node => {
        netlist += `print v(${node})\n`;
    });

    // Print device currents - use specific device names without wildcards
    netlist += "echo \"DEVICE CURRENTS:\"\n";
    // This assumes the voltage source has a specific ID from above
    const vsrcIds = componentsWithNodes
        .filter(comp => comp.type.toLowerCase() === 'voltagesource' || comp.type.toLowerCase() === 'power')
        .map(comp => {
            const prefix = 'V';
            const spiceId = comp.id.replace(/-/g, '');
            return `${prefix}${spiceId}`;  // Just use the correct device name pattern from above
        });
    
    if (vsrcIds.length > 0) {
        // Print current for each specific voltage source
        vsrcIds.forEach(id => {
            netlist += `print @${id}[i]\n`;  // Use @device[i] syntax for device current
        });
    }
    
    // End output section
    netlist += "echo \"--- END SIMULATION RESULTS ---\"\n";
    netlist += ".endc\n";
    netlist += ".end\n";

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
        console.warn("Empty stdout received from simulation");
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
        console.warn("Could not find result markers in output. Using full stdout.");
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
                currentPart = trimmed.match(/@([^\[]+)\[i\]\s*=\s*([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?)/i);
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

    console.log(`Parsed ${matchedLines} values from simulation output`);

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

    console.log("Simulation Results:", {
        voltages: results.voltages,
        currents: results.currents,
        error: results.error || null
    });
    
    return results;
}

export function runSpiceSimulation(componentsWithNodes: ComponentWithSpiceConnections[]): Promise<SimulationResults | null> {
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

    currentSimulationPromise = new Promise(async (resolve) => {
        simulationResolve = resolve;
        const inputFilename = '/input.cir';
        
        const config = {
            arguments: ['-b', inputFilename],
            preRun: [
                (instance: SpiceModuleInstance) => {
                    console.log("Preparing SPICE simulation...");
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
                        
                        console.log("Simulation completed.");
                        
                        // Parse the simulation results
                        const results = parseSimulationResults(stdout, stderr);
                        
                        // Check if any results were found
                        if (Object.keys(results.voltages).length === 0 && 
                            Object.keys(results.currents).length === 0 && 
                            !results.error) {
                            results.error = "No voltage or current values were found in the simulation output.";
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
            onAbort: (reason: any) => {
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

        try {
            // console.log("Initializing Spice WASM module with config...");
            await SpiceModuleFactory(config);
            // console.log("SpiceModuleFactory call completed. Waiting for postRun to resolve promise...");
        } catch (error: any) {
            console.error('Error during SpiceModuleFactory execution:', error);
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
                error: `${errorMessage}\n${error}` 
            });
            currentSimulationPromise = null;
            simulationResolve = null;
        }
    });

    return currentSimulationPromise;
}
