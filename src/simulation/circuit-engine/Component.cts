import type { CircuitNode } from './types.cts';

/**
 * Base interface for all circuit components in the simulation engine.
 */
export interface Component {
    readonly id: string; // Unique ID matching the app's component ID
    readonly type: string;
    readonly nodes: number[]; // Internal node IDs this component connects to

    /**
     * Adds the component's contribution to the MNA matrix and vector.
     * Needs implementation in subclasses.
     * @param matrixA - The MNA matrix (conductance/incidence part)
     * @param vectorZ - The MNA source vector (right-hand side)
     * @param nodeIndexMap - Map from circuit node ID to matrix index (for node voltage unknowns)
     * @param voltageSourceIndexMap - Map from VSource ID to matrix index (for voltage source current unknowns)
     */
    stamp(
        matrixA: number[][],
        vectorZ: number[],
        nodeIndexMap: Map<number, number>,
        voltageSourceIndexMap?: Map<string, number> // Optional depending on component type
    ): void;
}

// --- Concrete DC Component Classes ---

export class Resistor implements Component {
    readonly id: string;
    readonly type = 'Resistor';
    readonly nodes: number[];
    readonly resistance: number;

    constructor(id: string, nodes: number[], resistance: number) {
        this.id = id;
        this.nodes = nodes;
        // Basic validation: Ensure resistance is positive, clamp if necessary
        // A more robust system might throw an error or handle differently.
        this.resistance = resistance > 0 ? resistance : 1e-9; // Avoid zero/negative resistance
        if (resistance <= 0) {
            console.warn(`Resistor ${id} has non-positive resistance: ${resistance}. Using ${this.resistance}.`);
        }
    }

    stamp(matrixA: number[][], vectorZ: number[], nodeIndexMap: Map<number, number>): void {
        const conductance = 1 / this.resistance;
        const n1 = this.nodes[0];
        const n2 = this.nodes[1];
        const idx1 = n1 === 0 ? -1 : nodeIndexMap.get(n1);
        const idx2 = n2 === 0 ? -1 : nodeIndexMap.get(n2);

        // Add conductance to the diagonal elements
        if (idx1 !== undefined && idx1 !== -1) {
            matrixA[idx1][idx1] += conductance;
        }
        if (idx2 !== undefined && idx2 !== -1) {
            matrixA[idx2][idx2] += conductance;
        }

        // Add negative conductance to the off-diagonal elements
        if (idx1 !== undefined && idx1 !== -1 && idx2 !== undefined && idx2 !== -1) {
            matrixA[idx1][idx2] -= conductance;
            matrixA[idx2][idx1] -= conductance;
        }
        // console.log(`Stamped Resistor ${this.id} (G=${conductance.toFixed(3)}) between nodes ${n1}(idx ${idx1}) and ${n2}(idx ${idx2})`);
    }
}

export class VoltageSource implements Component {
    readonly id: string;
    readonly type = 'VoltageSource';
    readonly nodes: number[]; // [positiveNode, negativeNode]
    readonly voltage: number;

    constructor(id: string, nodes: number[], voltage: number) {
        this.id = id;
        this.nodes = nodes;
        this.voltage = voltage;
    }

    stamp(matrixA: number[][], vectorZ: number[], nodeIndexMap: Map<number, number>, voltageSourceIndexMap: Map<string, number>): void {
        const n1 = this.nodes[0]; // Positive node
        const n2 = this.nodes[1]; // Negative node
        const idx1 = n1 === 0 ? -1 : nodeIndexMap.get(n1);
        const idx2 = n2 === 0 ? -1 : nodeIndexMap.get(n2);
        const vSourceMatrixIndex = voltageSourceIndexMap.get(this.id);

        if (vSourceMatrixIndex === undefined) {
            throw new Error(`Index mapping missing for VoltageSource ${this.id}.`);
        }

        // --- Voltage source contribution to MNA --- 
        // Adds a row/column for the current variable and modifies node rows.

        // Modify the row associated with this voltage source's current equation (Vn1 - Vn2 = Vsource)
        if (idx1 !== undefined && idx1 !== -1) {
            matrixA[vSourceMatrixIndex][idx1] = 1; // Coefficient for Vn1 in the voltage equation
        }
        if (idx2 !== undefined && idx2 !== -1) {
            matrixA[vSourceMatrixIndex][idx2] = -1; // Coefficient for Vn2 in the voltage equation
        }
        vectorZ[vSourceMatrixIndex] = this.voltage; // Set the source value on the RHS

        // Modify columns associated with node equations (KCL)
        if (idx1 !== undefined && idx1 !== -1) {
            matrixA[idx1][vSourceMatrixIndex] = 1; // Current from VSource *enters* node n1
        }
        if (idx2 !== undefined && idx2 !== -1) {
            matrixA[idx2][vSourceMatrixIndex] = -1; // Current from VSource *leaves* node n2
        }
        // console.log(`Stamped VoltageSource ${this.id} (V=${this.voltage}) between nodes ${n1}(idx ${idx1}) and ${n2}(idx ${idx2}) at VSource index ${vSourceMatrixIndex}`);
    }
}

export class CurrentSource implements Component {
    readonly id: string;
    readonly type = 'CurrentSource';
    readonly nodes: number[]; // [nodeFrom, nodeTo] (current flows from -> to)
    readonly current: number;

    constructor(id: string, nodes: number[], current: number) {
        this.id = id;
        this.nodes = nodes;
        this.current = current;
    }

    stamp(matrixA: number[][], vectorZ: number[], nodeIndexMap: Map<number, number>): void {
        const n_from = this.nodes[0];
        const n_to = this.nodes[1];
        const idx_from = n_from === 0 ? -1 : nodeIndexMap.get(n_from);
        const idx_to = n_to === 0 ? -1 : nodeIndexMap.get(n_to);

        // --- Current source contribution to MNA --- 
        // Affects only the RHS vector Z (source vector)

        // Current *leaves* the 'from' node
        if (idx_from !== undefined && idx_from !== -1) {
            vectorZ[idx_from] -= this.current;
        }
        // Current *enters* the 'to' node
        if (idx_to !== undefined && idx_to !== -1) {
            vectorZ[idx_to] += this.current;
        }
        // console.log(`Stamped CurrentSource ${this.id} (I=${this.current}) from node ${n_from}(idx ${idx_from}) to ${n_to}(idx ${idx_to})`);
    }
} 