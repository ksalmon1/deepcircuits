import { memo, useState, useEffect } from 'react';
import { ComponentLibraryItem } from '@/types/component';
import { AlertCircle, FileImage, Image, Info } from 'lucide-react';
import { toast } from 'sonner';

interface EnhancedComponentPreviewProps {
  component: ComponentLibraryItem | null;
}

// Error states for SVG rendering
type SVGErrorType = 'missing' | 'malformed' | 'load-failed' | 'encoding' | null;

const EnhancedComponentPreview: React.FC<EnhancedComponentPreviewProps> = ({ component }) => {
  const [svgError, setSvgError] = useState<SVGErrorType>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  
  // Reset errors when component changes
  useEffect(() => {
    setSvgError(null);
    setErrorDetails(null);
  }, [component]);
  
  if (!component) {
    return (
      <div className="border rounded-md p-4 bg-gray-50 min-h-[150px] flex items-center justify-center text-muted-foreground">
        <Info className="h-5 w-5 mr-2" />
        No component selected.
      </div>
    );
  }

  // Validate SVG content
  const validateSvgContent = (content: string): boolean => {
    // Simple validation: check if it contains an SVG tag
    const hasSvgTag = /<svg[\s\S]*<\/svg>/i.test(content);
    const hasValidXmlns = /xmlns=["']http:\/\/www\.w3\.org\/2000\/svg["']/i.test(content);
    
    return hasSvgTag && hasValidXmlns;
  };

  const renderSvg = () => {
    // Handle missing SVG path
    if (!component.svgPath) {
      setSvgError('missing');
      return (
        <div className="text-amber-500 text-sm flex flex-col items-center gap-2 p-4">
          <FileImage className="h-10 w-10" />
          <span>No SVG preview available</span>
        </div>
      );
    }

    let imageSrc = component.svgPath;
    
    // Handle inline SVG content
    if (typeof imageSrc === 'string' && imageSrc.trim().startsWith('<svg')) {
      // Validate SVG content
      if (!validateSvgContent(imageSrc)) {
        setSvgError('malformed');
        setErrorDetails("The SVG content is malformed or incomplete.");
        console.error("Malformed SVG content:", imageSrc);
        return (
          <div className="text-destructive flex flex-col items-center gap-2 p-4">
            <AlertCircle className="h-6 w-6" />
            <span>Invalid SVG content</span>
            <span className="text-xs opacity-75 max-w-xs text-center">{imageSrc.substring(0, 100)}...</span>
          </div>
        );
      }
      
      try {
        // Try to convert SVG string to data URI
        const base64Svg = btoa(unescape(encodeURIComponent(imageSrc)));
        imageSrc = `data:image/svg+xml;base64,${base64Svg}`;
      } catch (error) {
        setSvgError('encoding');
        setErrorDetails(error instanceof Error ? error.message : "Unknown encoding error");
        console.error("Error encoding SVG to Base64:", error);
        
        // Fallback to direct innerHTML rendering
        return (
          <div 
            className="border p-4 rounded"
            style={{ maxWidth: '100%', maxHeight: '150px' }}
            dangerouslySetInnerHTML={{ __html: imageSrc }}
          />
        );
      }
    }

    // Render the image with enhanced error handling
    return (
      <img
        src={imageSrc}
        alt={`${component.name} preview`}
        style={{ 
          maxWidth: '100%', 
          maxHeight: '150px', 
          display: 'block', 
          margin: 'auto' 
        }}
        onError={(e) => {
          console.error("Error loading image:", imageSrc, e);
          setSvgError('load-failed');
          setErrorDetails(
            imageSrc.startsWith('data:image/svg+xml;base64,') 
              ? "Failed to render base64 encoded SVG" 
              : `Failed to load image from URL: ${imageSrc.substring(0, 50)}...`
          );
          
          // Show error message to user
          toast.error("Failed to load component image");
        }}
      />
    );
  };

  // Render error info when in development mode
  const renderErrorInfo = () => {
    if (!svgError || process.env.NODE_ENV !== 'development') return null;
    
    return (
      <div className="mt-2 bg-gray-100 p-2 rounded text-xs">
        <div className="font-medium">Debug Info:</div>
        <div>Error type: {svgError}</div>
        {errorDetails && <div>Details: {errorDetails}</div>}
        {component.svgPath && (
          <div>
            SVG source: {typeof component.svgPath === 'string' 
              ? `${component.svgPath.substring(0, 50)}...` 
              : 'Not a string'}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="border rounded-md p-4 bg-gray-50">
      <h3 className="text-lg font-medium mb-4">Preview: {component.name}</h3>
      <div className="flex justify-center items-center min-h-[150px] mb-6">
        {renderSvg()}
      </div>

      {renderErrorInfo()}

      {/* Properties preview section */}
      <div className="space-y-3 text-sm">
        <p className="font-medium">Component Properties:</p>
        <div className="bg-gray-100 p-3 rounded-md">
          <pre className="text-xs overflow-auto max-h-40">
            {JSON.stringify(component.properties || {}, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default memo(EnhancedComponentPreview); 