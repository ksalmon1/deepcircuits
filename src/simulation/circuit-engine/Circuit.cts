import {
    AppComponentModel,
    AppConnectionModel,
    CircuitNode,
    DCSimulationResult
} from './types.cts';
import {
    Component,
    Resistor,
    VoltageSource,
    CurrentSource
} from './Component.cts';

// Import the actual solver function
import { solveLinearSystem } from './utils/MatrixSolver.cts';

export class Circuit {
    private components: Map<string, Component> = new Map();
    private nodes: Map<number, CircuitNode> = new Map(); // Map node ID -> Node object
    // Map "componentId_pinId" -> internal nodeId. Crucial for linking app state to engine model.
    private pinToNodeMap: Map<string, number> = new Map();
    private nextNodeId = 1; // Start node IDs from 1 (0 is conventionally ground)

    /**
     * Clears the current circuit model state.
     */
    clear(): void {
        this.components.clear();
        this.nodes.clear();
        this.pinToNodeMap.clear();
        this.nextNodeId = 1;
        // Ensure ground node (ID 0) always exists
        this.nodes.set(0, { id: 0 });
        // console.log("Circuit model cleared.");
    }

    /**
     * Builds the internal circuit model from the application's state representation.
     * This translates the visual graph (components, wires) into the engine's node/component structure.
     * @param appComponents - Array of components from the app's state.
     * @param appConnections - Array of connections/wires from the app's state.
     */
    buildModel(appComponents: AppComponentModel[], appConnections: AppConnectionModel[]): void {
        this.clear();
        // console.log(`Building model with ${appComponents.length} components and ${appConnections.length} connections.`);

        // 1. Create a map for quick component lookup by ID
        const appComponentMap = new Map(appComponents.map(c => [c.id, c]));

        // 2. Process connections to define nodes and merge connected pins
        //    This uses a simple union-find like approach: assign node IDs and merge sets.
        const getNodeForPin = (componentId: string, pinId: string): number => {
            const mapKey = `${componentId}_${pinId}`;
            if (this.pinToNodeMap.has(mapKey)) {
                return this.pinToNodeMap.get(mapKey)!;
            }

            // Special handling for Ground pins (case-insensitive check on pin name)
            const component = appComponentMap.get(componentId);
            // Ensure pin names exist if using them for ground detection
            const pinName = component?.pins?.find(p => p.id === pinId)?.name?.toUpperCase();
            if (pinName === 'GND' || pinName === 'GROUND') {
                this.pinToNodeMap.set(mapKey, 0); // Map to ground node (ID 0)
                return 0;
            }

            // Assign a new node ID for this pin if it hasn't been seen
            const newNodeId = this.nextNodeId++;
            this.nodes.set(newNodeId, { id: newNodeId });
            this.pinToNodeMap.set(mapKey, newNodeId);
            // console.log(`Assigned new Node ${newNodeId} to pin ${mapKey}`);
            return newNodeId;
        };

        // Iterate through connections to establish initial node assignments and perform merging
        for (const conn of appConnections) {
            const node1 = getNodeForPin(conn.from.componentId, conn.from.pinId);
            const node2 = getNodeForPin(conn.to.componentId, conn.to.pinId);

            // If the two connected pins belong to different nodes, merge them.
            // We make node1 the representative node.
            if (node1 !== node2) {
                const nodeToMerge = node2; // Node ID to be merged into node1
                const representativeNode = node1;
                // Find all pins currently mapped to nodeToMerge and remap them to representativeNode
                const pinsToRemap: string[] = [];
                this.pinToNodeMap.forEach((nodeId, pinKey) => {
                    if (nodeId === nodeToMerge) {
                        pinsToRemap.push(pinKey);
                    }
                });
                pinsToRemap.forEach(pinKey => this.pinToNodeMap.set(pinKey, representativeNode));

                // Remove the merged node ID from our active nodes list
                this.nodes.delete(nodeToMerge);
                // console.log(`Merged Node ${nodeToMerge} into Node ${representativeNode}`);
            }
        }
        // console.log("Node mapping complete:", this.pinToNodeMap);
        // console.log("Final Nodes:", Array.from(this.nodes.keys()));

        // 3. Instantiate engine Component objects using the final node mapping
        for (const appComp of appComponents) {
            const componentNodes: number[] = [];
            let pinsAreValid = true;

            // Find the internal node ID for each pin required by the component
            if (!appComp.pins) {
                console.warn(`Component ${appComp.id} (${appComp.type}) has no pins defined in AppComponentModel. Skipping.`);
                continue; // Skip components without pin definitions
            }

            for (const pin of appComp.pins) {
                const mapKey = `${appComp.id}_${pin.id}`;
                const nodeId = this.pinToNodeMap.get(mapKey);

                if (nodeId === undefined) {
                    // Handle unconnected pins - This logic might need refinement based on requirements.
                    // If a pin MUST be connected for the component to be valid, throw an error.
                    // If floating pins are okay, assign a unique floating node or handle differently.
                    const pinName = pin.name?.toUpperCase();
                    if (pinName !== 'NC' && pinName !== 'NOT CONNECTED') { // Allow explicit "No Connect" pins
                        console.warn(`Pin ${pin.id} (${pin.name || 'unnamed'}) on component ${appComp.id} is unconnected or improperly defined. Skipping component.`);
                        pinsAreValid = false;
                        break; // Stop processing pins for this invalid component
                    }
                    // Assign a special value or handle NC pins if needed by engine
                    componentNodes.push(-1); // Example: Use -1 for explicitly unconnected pins
                } else {
                    componentNodes.push(nodeId);
                }
            }

            if (!pinsAreValid) continue; // Skip this component if any required pin was invalid/unconnected

            // Create the corresponding engine component instance
            let engineComp: Component | null = null;
            try {
                switch (appComp.type) {
                    case 'Resistor':
                        if (componentNodes.length !== 2) throw new Error('Resistor needs exactly 2 nodes.');
                        engineComp = new Resistor(appComp.id, componentNodes, appComp.properties.resistance);
                        break;
                    case 'VoltageSource':
                        if (componentNodes.length !== 2) throw new Error('VoltageSource needs exactly 2 nodes.');
                        // Assuming pins[0] is positive, pins[1] is negative from AppComponentModel structure
                        engineComp = new VoltageSource(appComp.id, componentNodes, appComp.properties.voltage);
                        break;
                    case 'CurrentSource':
                        if (componentNodes.length !== 2) throw new Error('CurrentSource needs exactly 2 nodes.');
                        // Assuming pins[0] is 'from', pins[1] is 'to'
                        engineComp = new CurrentSource(appComp.id, componentNodes, appComp.properties.current);
                        break;
                    // Add cases for other component types here
                    default:
                        console.warn(`Unsupported component type encountered during model build: ${appComp.type}`);
                }
            } catch (e: any) {
                console.error(`Failed to instantiate engine component ${appComp.id} (${appComp.type}): ${e.message}`);
                // Optionally skip this component or re-throw depending on desired error handling
            }


            if (engineComp) {
                this.components.set(engineComp.id, engineComp);
                // console.log(`Created engine component: ${engineComp.type} ${engineComp.id} connecting nodes ${engineComp.nodes}`);
            }
        }
        // console.log("Engine components created:", this.components);
    }

    /**
     * Solves the circuit for DC operating point using Modified Nodal Analysis (MNA).
     * Assumes buildModel has been called successfully.
     * @returns {DCSimulationResult} The calculated node voltages and source currents.
     */
    solveDC(): DCSimulationResult {
        // console.log("Solving DC circuit...");
        if (this.components.size === 0) {
            console.warn("Cannot solve empty circuit.");
            return { nodeVoltages: { 0: 0 }, voltageSourceCurrents: {} };
        }

        // --- Identify unknowns and map to matrix indices --- 
        const nonGroundNodes = Array.from(this.nodes.values()).filter(n => n.id !== 0);
        const voltageSources = Array.from(this.components.values()).filter(c => c.type === 'VoltageSource') as VoltageSource[];

        const N = nonGroundNodes.length; // Number of unknown node voltages (excluding ground)
        const M = voltageSources.length; // Number of unknown currents through voltage sources
        const matrixSize = N + M;

        if (matrixSize === 0) {
             console.log("Circuit has no unknowns (only ground?). Returning trivial result.");
             return { nodeVoltages: { 0: 0 }, voltageSourceCurrents: {} };
        }
        // console.log(`Matrix size: ${matrixSize}x${matrixSize} (N=${N} unknown node voltages, M=${M} unknown VSource currents)`);

        // Map logical node IDs (from this.nodes) to matrix indices [0...N-1]
        const nodeIndexMap = new Map<number, number>();
        nonGroundNodes.forEach((node, i) => nodeIndexMap.set(node.id, i));
        // console.log("Node Index Map (NodeID -> Matrix Index):", nodeIndexMap);

        // Map voltage source IDs to matrix indices [N...N+M-1] for their current variables
        const voltageSourceIndexMap = new Map<string, number>();
        voltageSources.forEach((vs, i) => {
            const matrixIndex = N + i; // VSource current variables start after node voltages
            voltageSourceIndexMap.set(vs.id, matrixIndex);
        });
        // console.log("VSource Index Map (VSourceID -> Matrix Index):", voltageSourceIndexMap);

        // --- Initialize MNA Matrix (A) and Vector (Z) --- 
        const matrixA: number[][] = Array(matrixSize).fill(0).map(() => Array(matrixSize).fill(0));
        const vectorZ: number[] = Array(matrixSize).fill(0);

        // --- Stamp components onto the matrix/vector --- 
        // console.log("Stamping components...");
        this.components.forEach(component => {
            try {
                component.stamp(matrixA, vectorZ, nodeIndexMap, voltageSourceIndexMap);
            } catch (e: any) {
                console.error(`Error stamping component ${component.id} (${component.type}): ${e.message}`);
                throw new Error(`Stamping failed for ${component.id}: ${e.message}`); // Re-throw critical error
            }
        });
        // console.log("Matrix A after stamping:", matrixA.map(row => row.map(val => val.toFixed(3))));
        // console.log("Vector Z after stamping:", vectorZ.map(val => val.toFixed(3)));

        // --- Solve the linear system Ax = Z --- 
        let solutionVectorX: number[] = [];
        try {
            // Use the imported solver
            solutionVectorX = solveLinearSystem(matrixA, vectorZ);

            if (solutionVectorX.length !== matrixSize) {
                throw new Error(`Solver returned vector of incorrect size (${solutionVectorX.length} instead of ${matrixSize}).`);
            }
            if (solutionVectorX.some(isNaN)) {
                console.error("Solver returned NaN values:", solutionVectorX);
                throw new Error("Numerical instability detected: Solver returned NaN.");
            }
            // console.log("Solution Vector X:", solutionVectorX.map(val => val.toFixed(3)));

        } catch (error: any) {
            console.error("Error solving linear system:", error);
            // Add more specific error handling based on solver exceptions (e.g., singular matrix)
            throw new Error(`Failed to solve the circuit matrix: ${error.message}`);
        }

        // --- Extract results from the solution vector X --- 
        const nodeVoltages: Record<number, number> = { 0: 0 }; // Ground voltage is always 0
        nodeIndexMap.forEach((index, nodeId) => {
            nodeVoltages[nodeId] = solutionVectorX[index];
        });

        const voltageSourceCurrents: Record<string, number> = {};
        voltageSourceIndexMap.forEach((index, vsId) => {
            voltageSourceCurrents[vsId] = solutionVectorX[index]; // Current through the voltage source
        });

        const result: DCSimulationResult = {
            nodeVoltages,
            voltageSourceCurrents
        };

        // console.log("DC Simulation Complete. Results:", result);
        return result;
    }

    // --- Placeholder for future Transient Analysis --- 
    /*
    stepSimulation(timeStep: number): void {
        // 1. Update time-dependent sources
        // 2. Update dynamic component contributions (using previous state and timeStep)
        // 3. Build MNA matrix/vector for current time step
        // 4. Solve Ax = Z
        // 5. Update dynamic component internal states (voltages/currents)
        // 6. Store/report results for this step
    }
    */
} 