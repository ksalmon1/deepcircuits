
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { toast } from 'sonner';
import { AppError, formatErrorMessage, logError } from '@/utils/errorHandling';
import { CircuitEditorErrorState } from '@/types/circuit';

// Define the context shape
interface ErrorContextType {
  // Error state
  errorState: CircuitEditorErrorState;
  setError: (error: Error, context: string, code?: string) => void;
  clearError: () => void;
}

// Create the context with a default undefined value
const ErrorContext = createContext<ErrorContextType | undefined>(undefined);

// Provider component
interface ErrorProviderProps {
  children: ReactNode;
}

export const ErrorProvider: React.FC<ErrorProviderProps> = ({ children }) => {
  // Error state
  const [errorState, setErrorState] = useState<CircuitEditorErrorState>({
    hasError: false,
    error: null,
    errorInfo: null,
    errorCode: '',
    errorContext: '',
    errorTimestamp: 0
  });
  
  // Set error in the error state
  const setError = useCallback((error: Error, context: string, code: string = 'UNKNOWN_ERROR') => {
    setErrorState({
      hasError: true,
      error,
      errorInfo: null,
      errorCode: error instanceof AppError ? error.code : code,
      errorContext: context,
      errorTimestamp: Date.now()
    });
    
    logError(error, context);
    
    toast.error('An error occurred', {
      description: formatErrorMessage(error),
      duration: 5000,
    });
  }, []);
  
  // Clear the error state
  const clearError = useCallback(() => {
    setErrorState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorCode: '',
      errorContext: '',
      errorTimestamp: 0
    });
  }, []);
  
  const value = {
    errorState,
    setError,
    clearError
  };
  
  return (
    <ErrorContext.Provider value={value}>
      {children}
    </ErrorContext.Provider>
  );
};

// Hook to use the error context
export const useError = (): ErrorContextType => {
  const context = useContext(ErrorContext);
  if (context === undefined) {
    throw new Error('useError must be used within an ErrorProvider');
  }
  return context;
};
