
import React from 'react';

interface LoadingOverlayProps {
  isReady: boolean;
  loadingError: string | null;
  onRetry: () => void;
}

/**
 * Component to display loading state and errors when initializing the canvas
 */
const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ isReady, loadingError, onRetry }) => {
  if (isReady) return null;
  
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-gray-50 bg-opacity-80 z-10">
      <div className="text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary mx-auto mb-2"></div>
        <p className="text-gray-600">Loading circuit components...</p>
        {loadingError && (
          <div className="mt-4 text-red-500 max-w-md">
            {loadingError}
            <button 
              onClick={onRetry}
              className="ml-2 text-blue-500 underline"
            >
              Retry
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoadingOverlay;
