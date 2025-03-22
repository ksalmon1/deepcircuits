
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { isWokwiLoaded, forceLoadWokwiElements } from '@/integrations/wokwi/WokwiIntegration';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

const CircuitCanvas = () => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isReady, setIsReady] = useState(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [loadingAttempts, setLoadingAttempts] = useState(0);
  const [manuallyLoaded, setManuallyLoaded] = useState(false);

  // Function to check if Wokwi is loaded
  const checkWokwiLoaded = useCallback(async () => {
    console.log('Checking if Wokwi is loaded, attempt:', loadingAttempts + 1);
    
    if (isWokwiLoaded()) {
      console.log('Wokwi components loaded successfully');
      setIsReady(true);
      return true;
    } 
    
    // After a few attempts, try to force load
    if (loadingAttempts >= 3 && !manuallyLoaded) {
      console.log('Attempting to manually load Wokwi components...');
      setManuallyLoaded(true);
      
      try {
        const success = await forceLoadWokwiElements();
        if (success) {
          console.log('Manual loading of Wokwi components succeeded');
          setIsReady(true);
          return true;
        } else {
          console.log('Manual loading of Wokwi components failed');
        }
      } catch (err) {
        console.error('Error during manual loading:', err);
      }
    }
    
    if (loadingAttempts > 10) {
      console.error('Failed to load Wokwi components after multiple attempts');
      setLoadingError('Failed to load circuit components. Please refresh the page or check your internet connection.');
      // Show a toast notification
      toast.error('Circuit components failed to load', {
        description: 'Please refresh the page or check your internet connection.',
        duration: 5000,
      });
      return false;
    }
    
    setLoadingAttempts(prev => prev + 1);
    return false;
  }, [loadingAttempts, manuallyLoaded]);

  // Initial load checking
  useEffect(() => {
    const attemptLoading = async () => {
      const success = await checkWokwiLoaded();
      
      if (!success) {
        // Schedule the next check
        const timer = setTimeout(attemptLoading, 1000);
        return () => clearTimeout(timer);
      }
    };
    
    attemptLoading();
  }, [checkWokwiLoaded]);

  // Backup timeout to show the UI even if components aren't fully loaded
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isReady && !loadingError) {
        console.log('Fallback: Forcing canvas to load after timeout');
        toast.warning('Loading components in fallback mode', {
          description: 'Some features may be limited.',
        });
        setIsReady(true);
      }
    }, 8000); // Increased from 5000 to 8000ms

    return () => clearTimeout(timer);
  }, [isReady, loadingError]);

  // Function to safely render Wokwi elements
  const renderWokwiElement = () => {
    if (!isReady) return null;
    
    // We need to use dangerouslySetInnerHTML because React doesn't know how to handle custom elements
    return (
      <div 
        className="col-start-5 col-span-4 row-start-5 row-span-4 flex items-center justify-center"
        dangerouslySetInnerHTML={{
          __html: '<wokwi-led color="red"></wokwi-led>'
        }}
      />
    );
  };

  const handleRetry = async () => {
    setLoadingError(null);
    setLoadingAttempts(0);
    setManuallyLoaded(false);
    const success = await checkWokwiLoaded();
    if (!success) {
      // Try to force load immediately on retry
      try {
        const manualSuccess = await forceLoadWokwiElements();
        if (manualSuccess) {
          setIsReady(true);
          toast.success('Components loaded successfully');
        }
      } catch (err) {
        console.error('Error during retry loading:', err);
      }
    }
  };

  return (
    <div className="h-full w-full bg-white relative">
      {!isReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 bg-opacity-80">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-gray-600">Loading circuit components...</p>
            {loadingError && (
              <div className="mt-4 text-red-500 max-w-md">
                {loadingError}
                <button 
                  onClick={handleRetry}
                  className="ml-2 text-blue-500 underline"
                >
                  Retry
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      
      <div 
        ref={canvasRef} 
        className="h-full w-full grid grid-cols-[repeat(40,25px)] grid-rows-[repeat(30,25px)] bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjUiIGhlaWdodD0iMjUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSIyNSIgaGVpZ2h0PSIyNSIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDAgTCAyNSAwIE0gMCAwIEwgMCAyNSIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZTJlOGYwIiBzdHJva2Utd2lkdGg9IjEiPjwvcGF0aD48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiPjwvcmVjdD48L3N2Zz4=')]"
      >
        {/* Render the Wokwi component using dangerouslySetInnerHTML */}
        {renderWokwiElement()}
      </div>
    </div>
  );
};

export default CircuitCanvas;
