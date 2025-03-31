
/**
 * Error handling utilities for CircuitSim
 */

// Base error class for application-wide errors
export class AppError extends Error {
  code: string;
  details?: any;

  constructor(message: string, code: string = 'UNKNOWN_ERROR', details?: any) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.details = details;
  }
}

// Specific error for component-related issues
export class ComponentError extends AppError {
  constructor(message: string, code: string = 'COMPONENT_ERROR', details?: any) {
    super(message, code, details);
    this.name = 'ComponentError';
  }
}

// Specific error for pin-related issues
export class PinError extends AppError {
  constructor(message: string, code: string = 'PIN_ERROR', details?: any) {
    super(message, code, details);
    this.name = 'PinError';
  }
}

// Specific error for circuit-related issues
export class CircuitError extends AppError {
  constructor(message: string, code: string = 'CIRCUIT_ERROR', details?: any) {
    super(message, code, details);
    this.name = 'CircuitError';
  }
}

// Specific error for simulation-related issues
export class SimulationError extends AppError {
  constructor(message: string, code: string = 'SIMULATION_ERROR', details?: any) {
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
  additionalInfo?: any
): void => {
  const errorMessage = formatErrorMessage(error);
  
  if (context) {
    console.error(`Error in ${context}:`, errorMessage, additionalInfo || '');
  } else {
    console.error(errorMessage, additionalInfo || '');
  }
};
