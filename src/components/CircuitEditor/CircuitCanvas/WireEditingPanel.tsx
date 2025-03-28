
import React from 'react';
import { Panel } from '@xyflow/react';

interface WireEditingPanelProps {
  editingEdgeId: string | null;
}

/**
 * Component to display when a wire is being edited
 */
const WireEditingPanel: React.FC<WireEditingPanelProps> = ({ editingEdgeId }) => {
  if (!editingEdgeId) return null;
  
  return (
    <Panel position="top-left" className="bg-amber-100 border border-amber-300 rounded-md shadow-sm p-2 flex items-center gap-2">
      <span className="text-sm text-amber-800">
        Editing wire path. Double-click to add points, drag to adjust.
      </span>
    </Panel>
  );
};

export default WireEditingPanel;
