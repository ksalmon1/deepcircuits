import { Matrix } from 'mathjs';
const math = require('mathjs');

/**
 * Solves the linear system Ax = z using LU decomposition provided by math.js.
 * @param A - The coefficient matrix (square)
 * @param z - The constant vector (right-hand side)
 * @returns The solution vector x
 * @throws Error if the matrix is singular or inputs are invalid.
 */
export function solveLinearSystem(A: number[][], z: number[]): number[] {
    if (!A || A.length === 0 || !z || A.length !== z.length || A.length !== A[0]?.length) {
        throw new Error("Invalid matrix or vector dimensions provided to solveLinearSystem.");
    }

    try {
        // Use math.lusolve which performs LU decomposition and solves the system
        const solution = math.lusolve(A, z);

        // Check if the result is a math.js Matrix object before accessing .valueOf()
        let solutionArray: unknown;
        if (math.isMatrix(solution)) {
            // Explicitly type the result of valueOf(), which can be nested array or flat
            solutionArray = (solution as Matrix).valueOf();
        } else if (Array.isArray(solution)) {
            // Sometimes math.js might return a plain array directly
            solutionArray = solution;
        } else {
             throw new Error(`Solver returned an unexpected type: ${typeof solution}`);
        }

        // Defensive check: ensure we have an array structure
        if (!Array.isArray(solutionArray)) {
            console.error("Unexpected solver output format (not an array):", solutionArray);
            throw new Error("Solver did not return an array-like structure.");
        }

        // Check if it's already flat or nested like [[v1], [v2]]
        let flatSolution: number[];
        if (solutionArray.length > 0 && Array.isArray(solutionArray[0]) && solutionArray[0].length === 1) {
             // It's likely the nested [[v1], [v2], ...] format, flatten it
             flatSolution = solutionArray.flat() as number[];
        } else if (solutionArray.every(item => typeof item === 'number')) {
             // It might already be a flat array [v1, v2, ...]
             flatSolution = solutionArray as number[];
        } else {
             console.error("Unexpected solver output format (structure unknown):", solutionArray);
             throw new Error("Solver returned an array with unexpected structure.");
        }

        // Final validation of the flattened array
        if (flatSolution.length !== A.length) {
            throw new Error(`Solver returned a vector of unexpected length (${flatSolution.length} instead of ${A.length})`);
        }
        if (flatSolution.some(isNaN)) {
            console.error("Solver returned NaN values:", flatSolution);
            throw new Error("Numerical instability detected: Solver returned NaN.");
        }

        return flatSolution;

    } catch (error: any) {
        // Catch potential errors from math.lusolve (e.g., singular matrix)
        console.error("Error during math.lusolve:", error);
        if (error.message && error.message.toLowerCase().includes('matrix factorization') || error.message.toLowerCase().includes('singular')) {
            throw new Error("Circuit matrix is singular or ill-conditioned. Cannot solve.");
        }
        throw new Error(`Linear algebra solver failed: ${error.message}`);
    }
} 