// src/simulation/circuit-engine/test-dc.cts
import { Circuit } from './Circuit.cts';
import { AppComponentModel, AppConnectionModel, DCSimulationResult } from './types.cts';
import { VoltageSource, Resistor } from './Component.cts';

console.log("--- Starting DC Solver Test --- ");

// --- Define a simple voltage divider circuit ---
// App state representation:
// V1 (5V): Pin 'p' (+), Pin 'n' (-)
// R1 (1k): Pin 'p1', Pin 'p2'
// R2 (1k): Pin 'p1', Pin 'p2'
// Connections:
// V1:+ (p) -> R1:1 (p1)
// R1:2 (p2) -> R2:1 (p1)  (This is the node we expect to be 2.5V)
// R2:2 (p2) -> V1:- (n)   (This node should connect to ground)

const components: AppComponentModel[] = [
    {
        id: 'V1', type: 'VoltageSource', properties: { voltage: 5 },
        // Define the pins used by connections. Names help with ground detection.
        pins: [{ id: 'p', name: '+' }, { id: 'n', name: '-' }]
    },
    {
        id: 'R1', type: 'Resistor', properties: { resistance: 1000 },
        pins: [{ id: 'p1', name: '1' }, { id: 'p2', name: '2' }]
    },
    {
        id: 'R2', type: 'Resistor', properties: { resistance: 1000 },
        pins: [{ id: 'p1', name: '1' }, { id: 'p2', name: '2' }]
    }
];

const connections: AppConnectionModel[] = [
    // V1 positive to R1 pin 1
    { id: 'w1', from: { componentId: 'V1', pinId: 'p' }, to: { componentId: 'R1', pinId: 'p1' } },
    // R1 pin 2 to R2 pin 1 (this defines the middle node)
    { id: 'w2', from: { componentId: 'R1', pinId: 'p2' }, to: { componentId: 'R2', pinId: 'p1' } },
    // R2 pin 2 to V1 negative (this should define the ground connection implicitly if V1.n is ground, or explicitly)
    // To ensure V1.n is ground, let's add an explicit ground connection simulation or ensure the pin name is recognized
    // For robustness, let's assume V1.n needs to connect to an explicit ground concept if not named 'GND'
    // Let's modify V1 pins slightly for clarity assuming pin 'n' is ground implicitly by name or later logic
    { id: 'w3', from: { componentId: 'R2', pinId: 'p2' }, to: { componentId: 'V1', pinId: 'n' } }
    // If V1 pin 'n' wasn't reliably ground, we'd need a Ground component and connect both R2.p2 and V1.n to it.
    // Let's modify V1 pin name to 'GND' to rely on the ground detection in buildModel
    // components[0].pins = [{ id: 'p', name: '+' }, { id: 'n', name: 'GND' }]; // Re-assigning like this isn't ideal, better to define correctly initially.
];
// Correct definition for V1 assuming pin 'n' IS the ground reference for this source:
components[0].pins = [{ id: 'p', name: '+' }, { id: 'n', name: 'GND' }];


// --- Instantiate and Run --- 
let testPassed = false;
try {
    const circuit = new Circuit();

    console.log("\n1. Building Model...");
    circuit.buildModel(components, connections);
    console.log("Model built successfully.");

    console.log("\n2. Solving DC...");
    const results: DCSimulationResult = circuit.solveDC();
    console.log("DC solve completed.");

    console.log("\n--- Final Simulation Results --- ");
    console.log("Node Voltages:", results.nodeVoltages);
    console.log("VSource Currents:", results.voltageSourceCurrents);

    // --- Verification --- 
    // Find the node ID corresponding to the connection between R1 and R2
    // @ts-ignore - Accessing private members for test verification
    const pinMap = circuit.pinToNodeMap; // NOTE: Accessing private member for test!
    const nodeR1P2 = pinMap.get('R1_p2');
    const nodeR2P1 = pinMap.get('R2_p1');

    console.log(`\nVerification: Node for R1_p2: ${nodeR1P2}, Node for R2_p1: ${nodeR2P1}`);

    if (nodeR1P2 === undefined || nodeR1P2 !== nodeR2P1) {
        throw new Error("Test Verification Failed: R1 pin 2 and R2 pin 1 did not merge to the same node.");
    }

    const middleNodeVoltage = results.nodeVoltages[nodeR1P2];
    const expectedVoltage = 2.5;
    const tolerance = 1e-6; // Tolerance for floating point comparison

    console.log(`Voltage at Node ${nodeR1P2} (junction R1-R2): ${middleNodeVoltage?.toFixed(6)} V`);
    console.log(`Expected Voltage: ${expectedVoltage} V`);

    if (middleNodeVoltage === undefined) {
         throw new Error(`Test Verification Failed: Voltage for Node ${nodeR1P2} is undefined.`);
    }

    if (Math.abs(middleNodeVoltage - expectedVoltage) < tolerance) {
        console.log("Verification PASSED!");
        testPassed = true;
    } else {
        throw new Error(`Test Verification Failed: Expected ${expectedVoltage}V, got ${middleNodeVoltage}V`);
    }

} catch (error) {
    console.error("\n--- Simulation Test Failed --- ");
    console.error(error);
}

console.log(`\n--- DC Solver Test Complete --- (${testPassed ? 'PASSED' : 'FAILED'})`); 