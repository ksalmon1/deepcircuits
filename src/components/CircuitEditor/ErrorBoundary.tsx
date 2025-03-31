
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AppError, formatErrorMessage, logError } from '@/utils/errorHandling';
import { toast } from 'sonner';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetKey?: any; // When this key changes, the error boundary will reset
  context?: string; // Context information for better error logging
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * ErrorBoundary component that catches errors in its child components
 * and displays a fallback UI instead of crashing the entire application.
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }
  
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error, errorInfo: null };
  }
  
  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log the error to console
    const context = this.props.context || 'ErrorBoundary';
    logError(error, context, { errorInfo });
    
    // Set error info in state
    this.setState({ errorInfo });
    
    // Call onError prop if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
    
    // Show a toast notification for non-critical errors
    toast.error('An error occurred', {
      description: formatErrorMessage(error),
      duration: 5000,
    });
  }
  
  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    // Reset the error state if resetKey changed
    if (this.props.resetKey !== prevProps.resetKey && this.state.hasError) {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null
      });
    }
  }
  
  resetErrorBoundary = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };
  
  render(): ReactNode {
    if (this.state.hasError) {
      // If a custom fallback is provided, use it
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      // Default fallback UI
      return (
        <div className="p-4 border border-red-300 rounded bg-red-50 text-red-800 my-4">
          <Alert variant="destructive">
            <AlertTitle>Something went wrong</AlertTitle>
            <AlertDescription className="mt-2">
              {this.state.error ? (
                <div>
                  <p className="mb-2 font-mono text-sm bg-red-100 p-2 rounded">
                    {formatErrorMessage(this.state.error)}
                  </p>
                  {this.state.errorInfo && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-sm">Stack trace</summary>
                      <pre className="mt-2 text-xs overflow-auto p-2 bg-red-100 rounded">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </details>
                  )}
                </div>
              ) : (
                <p>An unknown error occurred.</p>
              )}
              <div className="mt-4">
                <Button 
                  variant="outline" 
                  onClick={this.resetErrorBoundary}
                  className="mr-2"
                >
                  Try Again
                </Button>
                <Button 
                  variant="default" 
                  onClick={() => window.location.reload()}
                >
                  Reload Page
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      );
    }
    
    // If there's no error, render children normally
    return this.props.children;
  }
}

export default ErrorBoundary;
