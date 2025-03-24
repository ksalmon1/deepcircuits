
import React, { useEffect, useRef, useState } from 'react';
import { Cpu, ExternalLink, RefreshCw, EyeIcon, EyeOffIcon } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  isWokwiLoaded, 
  renderWokwiElement 
} from '@/integrations/wokwi/WokwiIntegration';

interface EnhancedComponentPreviewProps {
  componentType: string;
  properties: Record<string, any>;
  customSvgPath?: string;
  previewId: string;
  showPins?: boolean;
  onShowPinsChange?: (showPins: boolean) => void;
  onSizeChange?: (width: number, height: number) => void;
  isOriginalComponent?: boolean;
}

const EnhancedComponentPreview: React.FC<EnhancedComponentPreviewProps> = ({
  componentType,
  properties,
  customSvgPath,
  previewId,
  showPins = true,
  onShowPinsChange,
  onSizeChange,
  isOriginalComponent = true
}) => {
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [elementSize, setElementSize] = useState({ width: 0, height: 0 });
  const [showPinsState, setShowPinsState] = useState(showPins);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  
  // Handler for toggling pin visibility
  const handleTogglePins = () => {
    const newState = !showPinsState;
    setShowPinsState(newState);
    if (onShowPinsChange) {
      onShowPinsChange(newState);
    }
  };
  
  useEffect(() => {
    const checkWokwiReady = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Check if wokwi is loaded
        if (isWokwiLoaded()) {
          setIsReady(true);
          setIsLoading(false);
        } else {
          setError("Wokwi elements failed to load");
          setIsLoading(false);
        }
      } catch (err) {
        setError("Error checking Wokwi status");
        setIsLoading(false);
      }
    };
    
    checkWokwiReady();
  }, []);
  
  // Render the component whenever props change or wokwi becomes ready
  useEffect(() => {
    if (!isReady || !componentType) return;
    
    const renderComponent = async () => {
      setIsLoading(true);
      
      try {
        // Create a container for the component
        const container = document.getElementById(previewId);
        if (!container) {
          throw new Error(`Container with ID ${previewId} not found`);
        }
        
        // Clear the container
        container.innerHTML = '';
        
        // Create the wokwi element
        const element = document.createElement(componentType);
        
        // Set the properties
        Object.entries(properties).forEach(([key, value]) => {
          element.setAttribute(key, String(value));
        });
        
        // If showPins is enabled, create a wokwi-pins element wrapper
        if (showPinsState) {
          const pinsElement = document.createElement('wokwi-show-pins');
          pinsElement.appendChild(element);
          container.appendChild(pinsElement);
        } else {
          container.appendChild(element);
        }
        
        // Add a slight delay to allow the element to render
        setTimeout(() => {
          const elementToMeasure = showPinsState 
            ? container?.querySelector('wokwi-show-pins') 
            : container?.firstElementChild;
          
          if (elementToMeasure) {
            const rect = elementToMeasure.getBoundingClientRect();
            setElementSize({ 
              width: Math.round(rect.width), 
              height: Math.round(rect.height) 
            });
            
            if (onSizeChange) {
              onSizeChange(rect.width, rect.height);
            }
          }
          
          setIsLoading(false);
        }, 100);
      } catch (err) {
        console.error("Error rendering component:", err);
        setError(`Failed to render ${componentType}`);
        setIsLoading(false);
      }
    };
    
    renderComponent();
  }, [isReady, componentType, properties, previewId, showPinsState, onSizeChange]);
  
  const handleRefresh = () => {
    if (!isReady || !componentType) return;
    
    try {
      renderWokwiElement(componentType, previewId, properties, showPinsState);
    } catch (err) {
      console.error("Error refreshing component:", err);
      setError(`Failed to refresh ${componentType}`);
    }
  };
  
  return (
    <div className="border rounded-md p-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-medium">Component Preview</h3>
        <div className="flex items-center gap-2">
          {elementSize.width > 0 && (
            <span className="text-xs text-muted-foreground">
              {elementSize.width}×{elementSize.height}px
            </span>
          )}
          <div className="flex items-center space-x-2 mr-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleTogglePins}
              title={showPinsState ? "Hide pins" : "Show pins"}
            >
              {showPinsState ? (
                <EyeOffIcon className="h-4 w-4" />
              ) : (
                <EyeIcon className="h-4 w-4" />
              )}
            </Button>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading || !isReady}
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
        </div>
      </div>
      
      <div 
        className="bg-gray-50 rounded-md flex items-center justify-center min-h-[200px] relative"
        ref={previewContainerRef}
      >
        {isLoading ? (
          <div className="text-center text-muted-foreground animate-pulse">
            <Cpu className="h-10 w-10 mb-2 mx-auto" />
            <p>Loading component...</p>
          </div>
        ) : error ? (
          <div className="text-center text-destructive">
            <p className="mb-2">{error}</p>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleRefresh}
            >
              Try Again
            </Button>
          </div>
        ) : (
          <>
            <div id={previewId} className="component-preview-container relative z-10"></div>
            
            {/* Show custom SVG if provided */}
            {customSvgPath && (
              <div className="absolute inset-0 flex items-center justify-center z-0 opacity-10">
                <img 
                  src={customSvgPath} 
                  alt="Component custom visualization" 
                  className="max-w-full max-h-full"
                />
              </div>
            )}
          </>
        )}
      </div>
      
      {componentType && (
        <div className="mt-3 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-mono text-muted-foreground">{componentType}</span>
            {isOriginalComponent && (
              <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded">
                Original
              </span>
            )}
          </div>
          <a 
            href={`https://docs.wokwi.com/parts/${componentType}`} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-blue-500 hover:underline"
          >
            Documentation <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      )}
    </div>
  );
};

export default EnhancedComponentPreview;
