
/**
 * Custom error types for the application
 */

// Base error class for all application errors
export class AppError extends Error {
  public readonly code: string;
  public readonly isOperational: boolean;
  
  constructor(message: string, code: string = 'APP_ERROR', isOperational: boolean = true) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.isOperational = isOperational;
    
    // Capture stack trace, excluding constructor call from it
    Error.captureStackTrace(this, this.constructor);
  }
}

// API errors
export class ApiError extends AppError {
  constructor(message: string, code: string = 'API_ERROR') {
    super(message, code);
  }
}

// Authentication errors
export class AuthError extends AppError {
  constructor(message: string, code: string = 'AUTH_ERROR') {
    super(message, code);
  }
}

// Component errors
export class ComponentError extends AppError {
  constructor(message: string, code: string = 'COMPONENT_ERROR') {
    super(message, code);
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
