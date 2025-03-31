
import React from 'react';
import { ComponentPin } from '@/types/pin';
import PinEditor from './PinEditor/PinEditor';
import ErrorBoundary from './ErrorBoundary';

interface VisualPinEditorProps {
  pins: ComponentPin[];
  componentType: string;
  onPinsChange?: (pins: ComponentPin[]) => void;
  onChange?: (pins: ComponentPin[]) => void; // Alias for backwards compatibility
  width?: number;
  height?: number;
  className?: string;
  readonly?: boolean;
}

/**
 * Component for visually editing pin positions on circuit components
 * This is a wrapper that provides error boundary and maintains backwards compatibility
 */
const VisualPinEditor: React.FC<VisualPinEditorProps> = (props) => {
  return (
    <ErrorBoundary>
      <PinEditor {...props} />
    </ErrorBoundary>
  );
};

export default VisualPinEditor;
