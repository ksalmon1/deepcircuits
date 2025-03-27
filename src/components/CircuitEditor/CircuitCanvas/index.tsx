
import React, { useCallback, useState, useRef } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  NodeTypes,
  EdgeTypes,
  Panel,
  useReactFlow,
  useOnSelectionChange,
  BackgroundVariant
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { toast } from 'sonner';
import { ZoomIn, ZoomOut, Move, Trash2 } from 'lucide-react';
import { WokwiComponent } from '@/integrations/wokwi/WokwiIntegration';
import WokwiComponentNode from './WokwiComponentNode';
import WireEdge from './WireEdge';
import { componentToNode, wiresToEdges } from './utils';
import './circuit-canvas.css';

// Define the custom node and edge types
const nodeTypes: NodeTypes = {
  wokwiComponent: WokwiComponentNode,
};

const edgeTypes: EdgeTypes = {
  wire: WireEdge,
};

interface CircuitCanvasProps {
  components: WokwiComponent[];
  onComponentsChange: (components: WokwiComponent[]) => void;
}

const CircuitCanvas: React.FC<CircuitCanvasProps> = ({ 
  components, 
  onComponentsChange 
}) => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const { project, getZoom, setViewport, screenToFlowPosition } = useReactFlow();
  const [panMode, setPanMode] = useState(false);

  // Convert components to nodes when components change
  React.useEffect(() => {
    const initialNodes = components.map(componentToNode);
    setNodes(initialNodes);
  }, [components, setNodes]);
  
  // Handle dropping components onto the canvas
  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      
      if (!reactFlowWrapper.current || !reactFlowInstance) {
        return;
      }
      
      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const componentData = event.dataTransfer.getData('component');
      
      if (!componentData) {
        return;
      }
      
      try {
        const componentInfo = JSON.parse(componentData);
        
        // Get the position of the drop
        const position = screenToFlowPosition({
          x: event.clientX - reactFlowBounds.left,
          y: event.clientY - reactFlowBounds.top,
        });
        
        // Create the new component
        const newComponent: WokwiComponent = {
          type: componentInfo.type,
          id: `comp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          top: position.y,
          left: position.x,
          attributes: { color: 'red' },
          pins: []  // Pins will be populated by the WokwiComponentNode
        };
        
        // Add the new component to the list
        const updatedComponents = [...components, newComponent];
        onComponentsChange(updatedComponents);
        
        // Show notification
        toast.success(`Added ${componentInfo.name}`, {
          description: `Component placed at position (${Math.round(position.x)}, ${Math.round(position.y)})`,
          duration: 2000,
        });
      } catch (error) {
        console.error('Error adding component:', error);
        toast.error('Failed to add component');
      }
    },
    [reactFlowInstance, components, onComponentsChange, screenToFlowPosition]
  );
  
  const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  }, []);
  
  // Handle connecting nodes (creating wires)
  const onConnect = useCallback(
    (params: Connection) => {
      // Create a new edge with a unique ID
      const newEdge = {
        ...params,
        id: `wire-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'wire',
        data: { color: '#ff0000' }, // Default wire color
      };
      
      setEdges((eds) => addEdge(newEdge, eds));
    },
    [setEdges]
  );
  
  // Handle deleting nodes
  const onNodesDelete = useCallback(
    (deleted: Node[]) => {
      // Remove the corresponding components
      const deletedIds = deleted.map((node) => node.id);
      const updatedComponents = components.filter(
        (component) => !deletedIds.includes(component.id)
      );
      onComponentsChange(updatedComponents);
    },
    [components, onComponentsChange]
  );
  
  // Handle zoom controls
  const handleZoomIn = () => {
    const zoom = getZoom();
    setViewport({ zoom: Math.min(zoom + 0.1, 3) });
  };
  
  const handleZoomOut = () => {
    const zoom = getZoom();
    setViewport({ zoom: Math.max(zoom - 0.1, 0.5) });
  };
  
  const togglePanMode = () => {
    setPanMode(!panMode);
  };
  
  // Clear all components
  const handleClearCanvas = () => {
    toast.warning('Clear canvas?', {
      description: 'This will remove all components and wires',
      action: {
        label: 'Clear',
        onClick: () => {
          setNodes([]);
          setEdges([]);
          onComponentsChange([]);
          toast.success('Canvas cleared');
        },
      },
    });
  };

  return (
    <div 
      ref={reactFlowWrapper} 
      className="h-full w-full"
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodesDelete={onNodesDelete}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onInit={setReactFlowInstance}
        onDrop={onDrop}
        onDragOver={onDragOver}
        panOnScroll={!panMode}
        panOnDrag={panMode ? false : [0, 1, 2]}
        selectionOnDrag={!panMode}
        fitView
        snapToGrid={false}
        minZoom={0.4}
        maxZoom={4}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        className="circuit-canvas-flow"
      >
        <Background 
          variant={BackgroundVariant.Dots} 
          gap={25} 
          size={1} 
          color="#e2e8f0" 
        />
        
        <Controls position="bottom-right" showInteractive={false} />
        
        {/* Custom control panel */}
        <Panel position="top-right" className="bg-white rounded-md shadow-md p-1 flex gap-1">
          <button
            onClick={handleZoomIn}
            className="p-1 hover:bg-gray-100 rounded"
            title="Zoom In"
          >
            <ZoomIn size={18} />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-1 hover:bg-gray-100 rounded"
            title="Zoom Out"
          >
            <ZoomOut size={18} />
          </button>
          <button
            onClick={togglePanMode}
            className={`p-1 hover:bg-gray-100 rounded ${panMode ? 'bg-gray-200' : ''}`}
            title="Pan Mode"
          >
            <Move size={18} />
          </button>
          <button
            onClick={handleClearCanvas}
            className="p-1 hover:bg-gray-100 rounded"
            title="Clear Canvas"
          >
            <Trash2 size={18} />
          </button>
          <div className="px-2 flex items-center text-xs text-gray-600">
            {Math.round(getZoom() * 100)}%
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
};

export default function CircuitCanvasWithProvider({ components, onComponentsChange }: CircuitCanvasProps) {
  return (
    <ReactFlow.Provider>
      <CircuitCanvas components={components} onComponentsChange={onComponentsChange} />
    </ReactFlow.Provider>
  );
}
