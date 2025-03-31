import React, { Component, ErrorInfo, ReactNode } from 'react';
import { logError } from '@/utils/errorHandling';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { RefreshCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetKey?: any;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error boundary component to catch and handle errors in React component tree
 */
class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log the error
    logError(error, { componentStack: errorInfo.componentStack });
    
    // Call the onError callback if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }
  
  // Reset error state if resetKey changes
  public componentDidUpdate(prevProps: Props): void {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false, error: null });
    }
  }

  public render(): ReactNode {
    if (this.state.hasError) {
      // If a fallback UI is provided, render it
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      // Otherwise, render the default error UI
      return (
        <div className="p-6 h-full flex flex-col items-center justify-center">
          <Alert variant="destructive" className="mb-4 max-w-md mx-auto">
            <AlertTitle>Something went wrong</AlertTitle>
            <AlertDescription>
              {this.state.error?.message || 'An unexpected error occurred'}
            </AlertDescription>
          </Alert>
          
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            <RefreshCcw className="h-4 w-4 mr-2" />
            Try again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
