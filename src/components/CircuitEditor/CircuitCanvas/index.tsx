import React, { useCallback, useState, useRef, useEffect } from 'react';
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
  BackgroundVariant,
  ReactFlowProvider,
  ReactFlowInstance
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
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const { screenToFlowPosition, getZoom, setViewport } = useReactFlow();
  const [panMode, setPanMode] = useState(false);
  const [editingEdgeId, setEditingEdgeId] = useState<string | null>(null);
  const [controlPoints, setControlPoints] = useState<Record<string, { x: number, y: number }[]>>({});
  const [isDraggingControlPoint, setIsDraggingControlPoint] = useState(false);
  const [activeControlPoint, setActiveControlPoint] = useState<{edgeId: string, pointIndex: number} | null>(null);

  // Convert components to nodes when components change
  React.useEffect(() => {
    const initialNodes = components.map(componentToNode);
    setNodes(initialNodes);
  }, [components, setNodes]);
  
  // Start wire editing mode
  const startEdgeEdit = useCallback((edgeId: string) => {
    // Find the edge
    const edge = edges.find(e => e.id === edgeId);
    if (!edge) return;
    
    // Initialize control points if not already present
    if (!controlPoints[edgeId]) {
      // For a simple bezier curve, we can add a control point in the middle
      const sourceX = edge.sourceX || 0;
      const sourceY = edge.sourceY || 0;
      const targetX = edge.targetX || 0;
      const targetY = edge.targetY || 0;
      
      // Create a central control point
      const middleX = (sourceX + targetX) / 2;
      const middleY = (sourceY + targetY) / 2;
      
      setControlPoints(prev => ({
        ...prev,
        [edgeId]: [{ x: middleX, y: middleY }]
      }));
    }
    
    // Set the edge to edit mode
    setEditingEdgeId(edgeId);
    
    // Update the edge with editing mode and control points
    setEdges(eds => 
      eds.map(e => {
        if (e.id === edgeId) {
          return {
            ...e,
            data: {
              ...e.data,
              isEditing: true,
              controlPoints: controlPoints[edgeId] || [{ 
                x: (e.sourceX || 0 + e.targetX || 0) / 2, 
                y: (e.sourceY || 0 + e.targetY || 0) / 2 
              }],
              onControlPointDrag: handleControlPointDragStart,
              onFinishEdit: finishEdgeEdit
            }
          };
        }
        return e;
      })
    );
    
    toast.info('Editing wire path. Drag control points to adjust the wire.', {
      duration: 3000,
    });
  }, [edges, controlPoints]);
  
  // Handle control point drag start
  const handleControlPointDragStart = useCallback((edgeId: string, pointIndex: number, e: React.MouseEvent) => {
    setIsDraggingControlPoint(true);
    setActiveControlPoint({ edgeId, pointIndex });
    
    // Add mouse move and mouse up event listeners to the document
    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!reactFlowInstance || !activeControlPoint) return;
      
      // Convert screen coordinates to flow coordinates
      const { x, y } = screenToFlowPosition({
        x: moveEvent.clientX,
        y: moveEvent.clientY
      });
      
      // Update the control point position
      setControlPoints(prev => {
        const edgePoints = [...(prev[edgeId] || [])];
        edgePoints[pointIndex] = { x, y };
        return {
          ...prev,
          [edgeId]: edgePoints
        };
      });
      
      // Update the edge with the new control points
      setEdges(eds => 
        eds.map(e => {
          if (e.id === edgeId) {
            return {
              ...e,
              data: {
                ...e.data,
                controlPoints: controlPoints[edgeId] || []
              }
            };
          }
          return e;
        })
      );
    };
    
    const handleMouseUp = () => {
      setIsDraggingControlPoint(false);
      setActiveControlPoint(null);
      
      // Remove event listeners
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    // Add event listeners
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [reactFlowInstance, screenToFlowPosition, activeControlPoint]);
  
  // Add another control point to the wire
  const addControlPoint = useCallback((edgeId: string) => {
    if (!controlPoints[edgeId]) return;
    
    const edge = edges.find(e => e.id === edgeId);
    if (!edge) return;
    
    const points = [...controlPoints[edgeId]];
    
    // Add a new point - for simplicity, place it between the last point and target
    if (points.length > 0) {
      const lastPoint = points[points.length - 1];
      const targetX = edge.targetX || 0;
      const targetY = edge.targetY || 0;
      
      const newPoint = {
        x: (lastPoint.x + targetX) / 2,
        y: (lastPoint.y + targetY) / 2
      };
      
      points.push(newPoint);
    } else {
      // If no points yet, add one in the middle
      const sourceX = edge.sourceX || 0;
      const sourceY = edge.sourceY || 0;
      const targetX = edge.targetX || 0;
      const targetY = edge.targetY || 0;
      
      points.push({
        x: (sourceX + targetX) / 2,
        y: (sourceY + targetY) / 2
      });
    }
    
    setControlPoints(prev => ({
      ...prev,
      [edgeId]: points
    }));
    
    // Update the edge with the new control points
    setEdges(eds => 
      eds.map(e => {
        if (e.id === edgeId) {
          return {
            ...e,
            data: {
              ...e.data,
              controlPoints: points
            }
          };
        }
        return e;
      })
    );
  }, [edges, controlPoints]);
  
  // Finish wire editing mode
  const finishEdgeEdit = useCallback((edgeId: string) => {
    setEditingEdgeId(null);
    
    // Update the edge to exit edit mode but keep the control points
    setEdges(eds => 
      eds.map(e => {
        if (e.id === edgeId) {
          return {
            ...e,
            data: {
              ...e.data,
              isEditing: false,
              controlPoints: controlPoints[edgeId] || [],
              onStartEdit: startEdgeEdit
            }
          };
        }
        return e;
      })
    );
    
    toast.success('Wire path updated', {
      duration: 2000,
    });
  }, [controlPoints]);
  
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
        
        // Snap to grid
        const gridSize = 25;
        const snappedPosition = {
          x: Math.round(position.x / gridSize) * gridSize,
          y: Math.round(position.y / gridSize) * gridSize
        };
        
        // Create the new component
        const newComponent: WokwiComponent = {
          type: componentInfo.type,
          id: `comp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          top: snappedPosition.y,
          left: snappedPosition.x,
          attributes: { color: 'red' },
          pins: []  // Pins will be populated by the WokwiComponentNode
        };
        
        // Add the new component to the list
        const updatedComponents = [...components, newComponent];
        onComponentsChange(updatedComponents);
        
        // Show notification
        toast.success(`Added ${componentInfo.name}`, {
          description: `Component placed at position (${Math.round(snappedPosition.x)}, ${Math.round(snappedPosition.y)})`,
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
        data: { 
          color: '#ff0000',  // Default wire color
          onStartEdit: startEdgeEdit 
        }
      };
      
      setEdges((eds) => addEdge(newEdge, eds));
      
      toast.success('Connection created', {
        description: 'Wire added between components',
        duration: 1500,
      });
    },
    [setEdges, startEdgeEdit]
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
  
  // Handle double-clicking an edge to add a control point
  const onEdgeDoubleClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    event.stopPropagation();
    
    if (editingEdgeId === edge.id) {
      // Add a control point if in edit mode
      addControlPoint(edge.id);
      
      toast.info('Control point added', {
        description: 'Drag it to adjust the wire path',
        duration: 1500,
      });
    } else {
      // Start edit mode if not already editing
      startEdgeEdit(edge.id);
    }
  }, [editingEdgeId, addControlPoint, startEdgeEdit]);
  
  // Handle zoom controls
  const handleZoomIn = () => {
    const zoom = getZoom();
    setViewport({ zoom: Math.min(zoom + 0.1, 3), x: 0, y: 0 });
  };
  
  const handleZoomOut = () => {
    const zoom = getZoom();
    setViewport({ zoom: Math.max(zoom - 0.1, 0.5), x: 0, y: 0 });
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

  // Update all edges to have the edit handler
  useEffect(() => {
    setEdges(prev => 
      prev.map(edge => {
        if (!edge.data?.onStartEdit) {
          return {
            ...edge,
            data: {
              ...edge.data,
              onStartEdit: startEdgeEdit
            }
          };
        }
        return edge;
      })
    );
  }, [startEdgeEdit]);

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
        onEdgeDoubleClick={onEdgeDoubleClick}
        panOnScroll={!panMode}
        panOnDrag={panMode ? false : [0, 1, 2]}
        selectionOnDrag={!panMode}
        fitView
        snapToGrid={true}
        snapGrid={[25, 25]}
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
        
        {/* Show editing mode indicator */}
        {editingEdgeId && (
          <Panel position="top-left" className="bg-amber-100 border border-amber-300 rounded-md shadow-sm p-2 flex items-center gap-2">
            <span className="text-sm text-amber-800">
              Editing wire path. Double-click to add points, drag to adjust.
            </span>
          </Panel>
        )}
      </ReactFlow>
    </div>
  );
};

export default function CircuitCanvasWithProvider({ components, onComponentsChange }: CircuitCanvasProps) {
  return (
    <ReactFlowProvider>
      <CircuitCanvas components={components} onComponentsChange={onComponentsChange} />
    </ReactFlowProvider>
  );
}
