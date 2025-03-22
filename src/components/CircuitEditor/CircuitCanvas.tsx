
import React, { useRef, useEffect, useState } from 'react';
import { isWokwiLoaded } from '@/integrations/wokwi/WokwiIntegration';
import { Skeleton } from '@/components/ui/skeleton';

const CircuitCanvas = () => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isReady, setIsReady] = useState(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [loadingAttempts, setLoadingAttempts] = useState(0);

  useEffect(() => {
    // Check if Wokwi components are loaded
    const checkWokwiLoaded = () => {
      console.log('Checking if Wokwi is loaded, attempt:', loadingAttempts + 1);
      
      if (isWokwiLoaded()) {
        console.log('Wokwi components loaded successfully');
        setIsReady(true);
      } else {
        if (loadingAttempts > 10) {
          console.error('Failed to load Wokwi components after multiple attempts');
          setLoadingError('Failed to load circuit components. Please refresh the page.');
          return;
        }
        
        setLoadingAttempts(prev => prev + 1);
        setTimeout(checkWokwiLoaded, 1000); // Increased timeout for better chances of loading
      }
    };

    checkWokwiLoaded();
  }, [loadingAttempts]);

  // For demo purposes, let's make the canvas load after a few seconds even if Wokwi isn't ready
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isReady && !loadingError) {
        console.log('Forcing canvas to load after timeout');
        setIsReady(true);
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, [isReady, loadingError]);

  // This function safely renders Wokwi elements
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
