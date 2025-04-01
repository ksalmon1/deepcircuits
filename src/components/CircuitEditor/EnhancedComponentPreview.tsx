import React, { memo } from 'react';
import { ComponentLibraryItem } from '@/types/component';
import { AlertCircle } from 'lucide-react';

interface EnhancedComponentPreviewProps {
  component: ComponentLibraryItem | null;
}

const EnhancedComponentPreview: React.FC<EnhancedComponentPreviewProps> = ({ component }) => {
  if (!component) {
    return (
      <div className="border rounded-md p-4 bg-gray-50 min-h-[150px] flex items-center justify-center text-muted-foreground">
        No component selected.
      </div>
    );
  }

  const renderSvg = () => {
    if (!component.svgPath) {
      return (
        <div className="text-muted-foreground text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          No SVG preview available
        </div>
      );
    }

    let imageSrc = component.svgPath;
    let isBase64Svg = false;
    if (typeof imageSrc === 'string' && imageSrc.trim().startsWith('<svg')) {
      try {
        const base64Svg = btoa(imageSrc);
        imageSrc = `data:image/svg+xml;base64,${base64Svg}`;
        isBase64Svg = true;
      } catch (error) {
        console.error("Error encoding SVG to Base64:", error);
        return <div className="text-destructive">Error displaying SVG</div>;
      }
    }

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
          // Potentially update state to show an error message here
        }}
      />
    );
  };

  return (
    <div className="border rounded-md p-4 bg-gray-50">
      <h3 className="text-lg font-medium mb-4">Preview: {component.name}</h3>
      <div className="flex justify-center items-center min-h-[150px] mb-6">
        {renderSvg()}
      </div>

      {/* Keep properties preview section */}
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