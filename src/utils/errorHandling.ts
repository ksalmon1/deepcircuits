
/**
 * Custom error types for the application
 */

// Base error class for all application errors
export class AppError extends Error {
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly details?: Record<string, any>;
  
  constructor(
    message: string, 
    code: string = 'APP_ERROR', 
    isOperational: boolean = true,
    details?: Record<string, any>
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.isOperational = isOperational;
    this.details = details;
    
    // Capture stack trace, excluding constructor call from it
    Error.captureStackTrace(this, this.constructor);
  }
}

// API errors
export class ApiError extends AppError {
  constructor(message: string, code: string = 'API_ERROR', details?: Record<string, any>) {
    super(message, code, true, details);
  }
}

// Authentication errors
export class AuthError extends AppError {
  constructor(message: string, code: string = 'AUTH_ERROR', details?: Record<string, any>) {
    super(message, code, true, details);
  }
}

// Component errors
export class ComponentError extends AppError {
  constructor(message: string, code: string = 'COMPONENT_ERROR', details?: Record<string, any>) {
    super(message, code, true, details);
  }
}

// Simulation errors
export class SimulationError extends AppError {
  constructor(message: string, code: string = 'SIMULATION_ERROR', details?: Record<string, any>) {
    super(message, code, true, details);
  }
}

// Wire connection errors
export class ConnectionError extends AppError {
  constructor(message: string, code: string = 'CONNECTION_ERROR', details?: Record<string, any>) {
    super(message, code, true, details);
  }
}

// Error handler for async functions
export function asyncErrorHandler<T>(fn: () => Promise<T>, fallbackValue?: T): Promise<T> {
  return fn().catch(error => {
    console.error('Async operation failed:', error);
    
    if (fallbackValue !== undefined) {
      return fallbackValue;
    }
    
    throw error;
  });
}

// Format error for display to the user
export function formatErrorMessage(error: any): string {
  if (error instanceof AppError) {
    return error.message;
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  return 'An unknown error occurred';
}

// Log errors to console or external service
export function logError(error: any, context?: Record<string, any>): void {
  // In production, this would send to a logging service
  console.error('Application Error:', error);
  
  if (context) {
    console.error('Error Context:', context);
  }
  
  // Log to external monitoring service in production
  // Example: Sentry.captureException(error);
}

// Extract validation errors from a Zod validation result
export function extractValidationErrors(validationResult: any): string[] {
  if (!validationResult || !validationResult.error || !validationResult.error.errors) {
    return ['Validation failed'];
  }
  
  return validationResult.error.errors.map((err: any) => {
    const path = err.path.join('.');
    return `${path}: ${err.message}`;
  });
}

// Create an error handler wrapper for components
export function withErrorHandling<T extends (...args: any[]) => any>(
  fn: T,
  errorHandler?: (error: any) => void
): (...args: Parameters<T>) => ReturnType<T> | undefined {
  return (...args: Parameters<T>): ReturnType<T> | undefined => {
    try {
      return fn(...args);
    } catch (error) {
      console.error('Error in component function:', error);
      
      if (errorHandler) {
        errorHandler(error);
      }
      
      return undefined;
    }
  };
}
