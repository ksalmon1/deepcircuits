import React, { useState, useCallback, useEffect } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Node,
  Position,
  useNodesState,
  NodeProps,
  Background,
  BackgroundVariant,
  useReactFlow,
  NodeChange, // Import NodeChange
  applyNodeChanges, // Import applyNodeChanges
  XYPosition, // Import XYPosition
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { ComponentLibraryItem } from '@/types/component';
import { ComponentPin } from '@/types/pin';

// Import the node used in the main canvas for visual consistency
import CircuitComponentNode from '@/components/CircuitEditor/CircuitComponentNode';
// Import the new PinNode
import PinNode from './PinNode';

// Define Node types: the central component and the pins
const nodeTypes = {
  circuitComponent: CircuitComponentNode,
  pin: PinNode, // Register PinNode
};

interface PinConfigCanvasProps {
  component: ComponentLibraryItem;
  pins: ComponentPin[]; // Current pins being edited
  onPinUpdate: (pinIndex: number, newPosition: { x: number; y: number }) => void;
  height?: number;
}

// Remove the old DraggablePin component and its interface
// interface DraggablePinProps { ... }
// const DraggablePin: React.FC<DraggablePinProps> = ({ ... }) => { ... };

const PinConfigCanvasInternal: React.FC<PinConfigCanvasProps> = ({
  component,
  pins,
  onPinUpdate,
  height = 500
}) => {
  const componentNodeId = 'component-node';
  const [nodes, setNodes] = useState<Node[]>([])
  const reactFlowInstance = useReactFlow();
  const pinNodeSize = 8; // Define the size used in PinNode styling

  // Generate nodes whenever the component or pins change
  useEffect(() => {
    const componentNode: Node = {
      id: componentNodeId,
      type: 'circuitComponent',
      position: { x: 0, y: 0 }, // Position at the origin
      data: { ...component, hideHandles: true },
      draggable: false,
      selectable: false,
      zIndex: 1, // Ensure component is below pins
    };

    const componentNodePosition = componentNode.position;

    const pinNodes: Node[] = pins.map((pin, index) => ({
      id: `pin-${index}`,
      type: 'pin',
      position: {
        x: componentNodePosition.x + pin.x - (pinNodeSize / 2),
        y: componentNodePosition.y + pin.y - (pinNodeSize / 2),
      },
      data: { pin, pinIndex: index },
      draggable: true,
      selectable: true,
      zIndex: 10,
    }));

    console.log("Setting nodes (with offset):", [componentNode, ...pinNodes]);
    setNodes([componentNode, ...pinNodes]);

    // Fit view after nodes are set initially or when component/pins change significantly
    setTimeout(() => {
      if (reactFlowInstance) { // Check if instance exists
        reactFlowInstance.fitView({ padding: 0.2, includeHiddenNodes: false });
      }
    }, 50);

  }, [component, pins, reactFlowInstance]);

  // Handle node changes
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      // Apply all changes to keep the visual drag smooth
      setNodes((nds) => applyNodeChanges(changes, nds));

      // Find the main component node's fixed position
      const componentPos = { x: 0, y: 0 };

      // Check for the end of a drag operation
      changes.forEach(change => {
        if (
          change.type === 'position' &&
          !change.dragging && // Check if dragging has stopped
          change.position && // Ensure position exists
          change.id.startsWith('pin-')
        ) {
          // Extract pin index
          const pinIndexStr = change.id.split('-')[1];
          const pinIndex = parseInt(pinIndexStr, 10);

          if (!isNaN(pinIndex)) {
            // Calculate relative position of the *center* by adding back the half-size offset
            const relativeX = (change.position.x + (pinNodeSize / 2)) - componentPos.x;
            const relativeY = (change.position.y + (pinNodeSize / 2)) - componentPos.y;

            console.log(`PinNode ${pinIndex} DRAG END. Node Pos:`, change.position, `Reported Center Relative: { x: ${relativeX}, y: ${relativeY} }`);

            // Call the parent update function ONLY on drag end
            onPinUpdate(pinIndex, { x: Math.round(relativeX), y: Math.round(relativeY) });
          }
        }
      });
    },
    // No need to include `nodes` here if we only read it inside forEach?
    // Let's remove it to potentially avoid cycles if applyNodeChanges triggers this.
    // If issues persist, add `nodes` back.
    [onPinUpdate, setNodes]
  );

  return (
      // Remove the outer div with ref and the absolute positioning logic
      <div style={{ height: `${height}px`, border: '1px solid #eee' }}>
        <ReactFlow
          nodes={nodes}
          onNodesChange={onNodesChange}
          nodeTypes={nodeTypes}
          nodesDraggable={true} // Allow nodes (pins) to be dragged
          nodesConnectable={false}
          elementsSelectable={true} // Allow pins to be selected
          fitView
          fitViewOptions={{ padding: 0.2 }} // Add padding to fitView
          minZoom={0.1} // Allow zooming further out if needed
          maxZoom={4}
          // Prevent panning if desired
          // panOnDrag={false}
          // panOnScroll={false}
        >
          <Background variant={BackgroundVariant.Dots} gap={15} size={1} />
        </ReactFlow>
        {/* Remove the old pin rendering logic */}
        {/* Remove the origin marker */}
        {/* Remove the measured size display */}
      </div>
  );
};

// Wrap with ReactFlowProvider
const PinConfigCanvas: React.FC<PinConfigCanvasProps> = (props) => (
  <ReactFlowProvider>
    <PinConfigCanvasInternal {...props} />
  </ReactFlowProvider>
);

export default PinConfigCanvas; 