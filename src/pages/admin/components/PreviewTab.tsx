
import React, { useEffect, useRef, useState } from 'react';
import { ComponentLibraryItem } from '@/services/componentLibraryService';
import { renderWokwiComponentPreview } from '@/utils/componentPreviewUtils';
import { Loader2 } from 'lucide-react';

interface PreviewTabProps {
  component: ComponentLibraryItem;
  wokwiReady: boolean;
}

export const PreviewTab: React.FC<PreviewTabProps> = ({ 
  component, 
  wokwiReady 
}) => {
  const previewRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const renderPreview = async () => {
      if (!wokwiReady || !previewRef.current) return;
      
      try {
        setLoading(true);
        setError(null);
        
        previewRef.current.innerHTML = '';
        await renderWokwiComponentPreview(component.type, previewRef.current);
        
        setLoading(false);
      } catch (err) {
        console.error('Error rendering component preview:', err);
        setError('Failed to render component preview');
        setLoading(false);
      }
    };
    
    renderPreview();
  }, [component.type, wokwiReady]);
  
  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground pb-2">
        Preview how the component will appear in the circuit editor.
      </div>
      
      <div className="border rounded-lg p-6 flex justify-center items-center min-h-[300px] bg-muted/10">
        {loading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading preview...</p>
          </div>
        ) : error ? (
          <div className="text-center text-destructive">
            <p>{error}</p>
            <p className="text-sm mt-2">Check if the component type is valid.</p>
          </div>
        ) : (
          <div 
            ref={previewRef} 
            className="w-full h-full flex items-center justify-center"
          />
        )}
      </div>
      
      <div className="text-sm text-muted-foreground mt-4">
        <p>Component Type: <code>{component.type}</code></p>
        {component.pins && (
          <p>Number of Pins: {component.pins.length}</p>
        )}
      </div>
    </div>
  );
};
