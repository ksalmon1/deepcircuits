
/**
 * Error handling utilities for CircuitSim
 */

// Base error class for application-wide errors
export class AppError extends Error {
  code: string;
  details?: unknown;

  constructor(message: string, code: string = 'UNKNOWN_ERROR', details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.details = details;
  }
}

// Specific error for component-related issues
export class ComponentError extends AppError {
  constructor(message: string, code: string = 'COMPONENT_ERROR', details?: unknown) {
    super(message, code, details);
    this.name = 'ComponentError';
  }
}

// Specific error for pin-related issues
export class PinError extends AppError {
  constructor(message: string, code: string = 'PIN_ERROR', details?: unknown) {
    super(message, code, details);
    this.name = 'PinError';
  }
}

// Specific error for circuit-related issues
export class CircuitError extends AppError {
  constructor(message: string, code: string = 'CIRCUIT_ERROR', details?: unknown) {
    super(message, code, details);
    this.name = 'CircuitError';
  }
}

// Specific error for simulation-related issues
export class SimulationError extends AppError {
  constructor(message: string, code: string = 'SIMULATION_ERROR', details?: unknown) {
    super(message, code, details);
    this.name = 'SimulationError';
  }
}

// Helper function to safely handle async operations
export const safeAsyncOperation = async <T>(
  operation: () => Promise<T>,
  errorMessage: string = 'Operation failed',
  errorCode: string = 'ASYNC_OPERATION_ERROR'
): Promise<T> => {
  try {
    return await operation();
  } catch (error) {
    console.error(`${errorMessage}:`, error);
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(
      error instanceof Error ? error.message : errorMessage,
      errorCode,
      error
    );
  }
};

// Helper to format error messages for display
export const formatErrorMessage = (error: unknown): string => {
  if (error instanceof AppError) {
    return `${error.name} (${error.code}): ${error.message}`;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
};

// Helper to log errors to the console with additional context
export const logError = (
  error: unknown,
  context?: string,
  additionalInfo?: unknown
): void => {
  const errorMessage = formatErrorMessage(error);
  
  if (context) {
    console.error(`Error in ${context}:`, errorMessage, additionalInfo || '');
  } else {
    console.error(errorMessage, additionalInfo || '');
  }
};

/**
 * Higher-order function to wrap operations with try/catch error handling
 * @param operation The function to execute
 * @param context A string identifier for the operation context (for error reporting)
 * @param setErrorFn The function to call when an error occurs
 * @returns A wrapped function that handles errors
 */
export function withErrorHandling<Args extends unknown[], Result>(
  operation: (...args: Args) => Result,
  context: string,
  setErrorFn: (error: Error, context: string, code?: string) => void
): (...args: Args) => Result | undefined {
  return (...args: Args) => {
    try {
      return operation(...args);
    } catch (error) {
      const errorObj = error instanceof Error 
        ? error 
        : new AppError(String(error), 'UNKNOWN_ERROR');
      
      logError(errorObj, context);
      setErrorFn(errorObj, context);
      
      // Return undefined to indicate error
      return undefined;
    }
  };
}

/**
 * Higher-order function to wrap async operations with try/catch error handling
 * @param asyncOperation The async function to execute
 * @param context A string identifier for the operation context (for error reporting)
 * @param setErrorFn The function to call when an error occurs
 * @returns A wrapped async function that handles errors
 */
export function withAsyncErrorHandling<Args extends unknown[], Result>(
  asyncOperation: (...args: Args) => Promise<Result>,
  context: string,
  setErrorFn: (error: Error, context: string, code?: string) => void
): (...args: Args) => Promise<Result | undefined> {
  return async (...args: Args) => {
    try {
      return await asyncOperation(...args);
    } catch (error) {
      const errorObj = error instanceof Error 
        ? error 
        : new AppError(String(error), 'UNKNOWN_ERROR');
      
      logError(errorObj, context);
      setErrorFn(errorObj, context);
      
      // Return undefined to indicate error
      return undefined;
    }
  };
}
