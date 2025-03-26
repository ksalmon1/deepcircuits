
import React from 'react';
import { ComponentLibraryItem } from '@/services/componentLibraryService';
import VisualPinEditor from '@/components/CircuitEditor/VisualPinEditor';
import { ComponentPin } from '@/types/database';

interface PinEditorTabProps {
  component: ComponentLibraryItem;
  updatePinConfiguration: (pins: ComponentPin[]) => void;
  wokwiReady: boolean;
}

export const PinEditorTab: React.FC<PinEditorTabProps> = ({ 
  component, 
  updatePinConfiguration,
  wokwiReady 
}) => {
  // Handle pin changes from the visual editor
  const handlePinsChange = (updatedPins: ComponentPin[]) => {
    updatePinConfiguration(updatedPins);
  };

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground pb-2">
        Configure pins for this component. Click on the preview to add pins, drag existing pins to reposition.
      </div>

      {wokwiReady ? (
        <VisualPinEditor
          componentType={component.type}
          pins={component.pins || []}
          onChange={handlePinsChange}
          className="h-[500px]"
        />
      ) : (
        <div className="flex items-center justify-center h-[300px] bg-muted/20 rounded border border-dashed">
          <p className="text-muted-foreground">Loading component preview...</p>
        </div>
      )}
    </div>
  );
};
