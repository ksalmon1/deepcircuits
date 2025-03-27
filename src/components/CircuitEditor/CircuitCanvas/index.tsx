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
  BackgroundVariant,
  ReactFlowProvider,
  ReactFlowInstance,
  useOnSelectionChange,
  ConnectionLineType
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { toast } from 'sonner';
import { ZoomIn, ZoomOut, Move, Trash2 } from 'lucide-react';
import { WokwiComponent } from '@/integrations/wokwi/WokwiIntegration';
import WokwiComponentNode from './WokwiComponentNode';
import WireEdge from './WireEdge';
import { componentToNode, wiresToEdges, convertWireToEdge } from './utils';
import { getPinSignalType, getWireColorFromSignal } from '@/utils/wireUtils';
import { useWireSystem, Wire } from '@/hooks/useWireSystem';
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
  
  // Import useWireSystem for managing wires
  const {
    wires,
    setWires,
    activeWire,
    cancelActiveWire,
    handlePinClick
  } = useWireSystem(components);
  
  // Convert components to nodes when components change
  React.useEffect(() => {
    const initialNodes = components.map(componentToNode);
    setNodes(initialNodes);
  }, [components, setNodes]);
  
  // Convert wires to edges when wires change
  React.useEffect(() => {
    // Convert completed wires to edges
    const completedWires = wires.filter(wire => wire.isComplete && wire.targetComponentId);
    
    const wireEdges = wiresToEdges(completedWires, components, editingEdgeId, controlPoints, {
      onStartEdit: startEdgeEdit,
      onFinishEdit: finishEdgeEdit,
      onControlPointDrag: handleControlPointDragStart,
      onAddControlPoint: addControlPoint
    });
    
    setEdges(wireEdges);
  }, [wires, components, editingEdgeId, controlPoints]);
  
  // Start wire editing mode
  const startEdgeEdit = useCallback((edgeId: string) => {
    // Find the edge
    const edge = edges.find(e => e.id === edgeId);
    if (!edge) return;
    
    // Initialize control points if not already present
    if (!controlPoints[edgeId]) {
      // Find corresponding wire to get all points
      const wire = wires.find(w => w.id === edgeId);
      
      if (wire && wire.points.length > 2) {
        // Use inner points as control points (exclude source and target)
        setControlPoints(prev => ({
          ...prev,
          [edgeId]: wire.points.slice(1, -1).map(p => ({ x: p.x, y: p.y }))
        }));
      } else {
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
              onFinishEdit: finishEdgeEdit,
              onAddControlPoint: addControlPoint
            }
          };
        }
        return e;
      })
    );
    
    toast.info('Editing wire path. Drag control points to adjust the wire.', {
      duration: 3000,
    });
  }, [edges, controlPoints, wires]);
  
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
        if (!prev[edgeId]) return prev;
        
        const edgePoints = [...prev[edgeId]];
        if (pointIndex >= edgePoints.length) return prev;
        
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
      
      // Also update the wire with the new points
      setWires(prevWires => 
        prevWires.map(wire => {
          if (wire.id === edgeId) {
            // Get current control points
            const edgeControlPoints = controlPoints[edgeId] || [];
            // First and last points remain the same (connection points)
            const sourcePoint = wire.points[0];
            const targetPoint = wire.points[wire.points.length - 1];
            
            // Rebuild points array with updated control points in the middle
            return {
              ...wire,
              points: [
                sourcePoint,
                ...edgeControlPoints.map(p => ({ x: p.x, y: p.y })),
                targetPoint
              ]
            };
          }
          return wire;
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
  }, [reactFlowInstance, screenToFlowPosition, activeControlPoint, controlPoints, setWires]);
  
  // Add another control point to the wire
  const addControlPoint = useCallback((edgeId: string) => {
    if (!controlPoints[edgeId]) return;
    
    const edge = edges.find(e => e.id === edgeId);
    if (!edge) return;
    
    const points = [...(controlPoints[edgeId] || [])];
    
    // Find the corresponding wire
    const wire = wires.find(w => w.id === edgeId);
    if (!wire) return;
    
    // Add a new point - for simplicity, place it between the last control point and target
    if (points.length > 0) {
      const lastPoint = points[points.length - 1];
      const targetPoint = wire.points[wire.points.length - 1];
      
      const newPoint = {
        x: (lastPoint.x + targetPoint.x) / 2,
        y: (lastPoint.y + targetPoint.y) / 2
      };
      
      points.push(newPoint);
    } else {
      // If no points yet, add one in the middle
      const sourcePoint = wire.points[0];
      const targetPoint = wire.points[wire.points.length - 1];
      
      points.push({
        x: (sourcePoint.x + targetPoint.x) / 2,
        y: (sourcePoint.y + targetPoint.y) / 2
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
    
    // Also update the wire
    setWires(prevWires => 
      prevWires.map(wire => {
        if (wire.id === edgeId) {
          // Rebuild points with the new control point
          const sourcePoint = wire.points[0];
          const targetPoint = wire.points[wire.points.length - 1];
          
          return {
            ...wire,
            points: [
              sourcePoint,
              ...points.map(p => ({ x: p.x, y: p.y })),
              targetPoint
            ]
          };
        }
        return wire;
      })
    );
    
    toast.info('Control point added. Drag to adjust the wire path.', {
      duration: 2000,
    });
  }, [edges, controlPoints, wires, setWires]);
  
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
      if (!params.source || !params.target || !params.sourceHandle || !params.targetHandle) {
        console.error("Invalid connection parameters:", params);
        return;
      }
      
      // Extract pin indices from handle IDs
      const sourcePinIndex = parseInt(params.sourceHandle.split('-')[1]);
      const targetPinIndex = parseInt(params.targetHandle.split('-')[1]);
      
      // Find source and target component
      const sourceComponent = components.find(c => c.id === params.source);
      const targetComponent = components.find(c => c.id === params.target);
      
      if (!sourceComponent || !targetComponent) {
        console.error("Source or target component not found");
        return;
      }
      
      // Get pin positions
      const sourcePin = sourceComponent.pins?.[sourcePinIndex];
      const targetPin = targetComponent.pins?.[targetPinIndex];
      
      if (!sourcePin || !targetPin) {
        console.error("Source or target pin not found");
        return;
      }
      
      // Calculate absolute positions
      const sourceX = sourceComponent.left + sourcePin.x;
      const sourceY = sourceComponent.top + sourcePin.y;
      const targetX = targetComponent.left + targetPin.x;
      const targetY = targetComponent.top + targetPin.y;
      
      // Get signal type for wire color
      const signal = getPinSignalType(components, params.source, sourcePinIndex);
      const color = getWireColorFromSignal(signal || '');
      
      // Create new wire
      const newWire: Wire = {
        id: `wire-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        sourceComponentId: params.source,
        sourcePinIndex: sourcePinIndex,
        targetComponentId: params.target,
        targetPinIndex: targetPinIndex,
        points: [
          { x: sourceX, y: sourceY },
          { x: targetX, y: targetY }
        ],
        color,
        isComplete: true
      };
      
      // Add to wires state
      setWires(prev => [...prev, newWire]);
      
      toast.success('Connection created', {
        description: 'Wire added between components',
        duration: 1500,
      });
    },
    [components, setWires]
  );
  
  // Handle XY Flow edge removal
  useEffect(() => {
    // Check for edges that were removed and remove corresponding wires
    const edgeIds = edges.map(edge => edge.id);
    setWires(prev => prev.filter(wire => 
      // Keep wires if they're not complete yet (still being drawn)
      !wire.isComplete || edgeIds.includes(wire.id)
    ));
  }, [edges, setWires]);
  
  // Handle deleting nodes
  const onNodesDelete = useCallback(
    (deleted: Node[]) => {
      // Remove the corresponding components
      const deletedIds = deleted.map((node) => node.id);
      const updatedComponents = components.filter(
        (component) => !deletedIds.includes(component.id)
      );
      onComponentsChange(updatedComponents);
      
      // Also remove any wires connected to these components
      setWires(prev => prev.filter(wire => 
        !deletedIds.includes(wire.sourceComponentId) && 
        (!wire.targetComponentId || !deletedIds.includes(wire.targetComponentId))
      ));
    },
    [components, onComponentsChange, setWires]
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
  
  // Handle node movement to update component positions
  const onNodeDragStop = useCallback((event: React.MouseEvent, node: Node) => {
    // Update component position in the components state
    onComponentsChange(
      components.map(component => {
        if (component.id === node.id) {
          return {
            ...component,
            left: node.position.x,
            top: node.position.y
          };
        }
        return component;
      })
    );
    
    // Update wire points for any connected wires
    setWires(prev => prev.map(wire => {
      // Check if this wire involves the moved component
      const isSourceComponent = wire.sourceComponentId === node.id;
      const isTargetComponent = wire.targetComponentId === node.id;
      
      if (!isSourceComponent && !isTargetComponent) {
        return wire;
      }
      
      const newPoints = [...wire.points];
      const component = components.find(c => c.id === node.id);
      
      if (!component || !component.pins) {
        return wire;
      }
      
      // Update source point
      if (isSourceComponent) {
        const pin = component.pins[wire.sourcePinIndex];
        if (pin) {
          newPoints[0] = {
            x: node.position.x + pin.x,
            y: node.position.y + pin.y
          };
        }
      }
      
      // Update target point
      if (isTargetComponent && wire.targetPinIndex !== null) {
        const pin = component.pins[wire.targetPinIndex];
        if (pin) {
          newPoints[newPoints.length - 1] = {
            x: node.position.x + pin.x,
            y: node.position.y + pin.y
          };
        }
      }
      
      return {
        ...wire,
        points: newPoints
      };
    }));
  }, [components, onComponentsChange, setWires]);
  
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
          setWires([]);
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

  // Render the activeWire as a temporary edge if it exists
  useEffect(() => {
    if (!activeWire || !reactFlowInstance) return;
    
    const tempEdgeId = `temp-${activeWire.id}`;
    
    // Remove any existing temporary edges
    setEdges(prev => 
      prev.filter(e => !e.id.startsWith('temp-'))
    );
    
    // Only add a temporary edge if we have at least a source
    if (activeWire.sourceComponentId) {
      const sourceComponent = components.find(c => c.id === activeWire.sourceComponentId);
      if (!sourceComponent) return;
      
      const sourcePin = sourceComponent.pins?.[activeWire.sourcePinIndex];
      if (!sourcePin) return;
      
      // Get the last point position
      const lastPoint = activeWire.points[activeWire.points.length - 1];
      
      // Create a temporary edge just for visualization
      const tempEdge: Edge = {
        id: tempEdgeId,
        source: activeWire.sourceComponentId,
        sourceHandle: `pin-${activeWire.sourcePinIndex}`,
        target: `temp-target-${Date.now()}`, // Dummy target
        targetHandle: null,
        type: 'wire',
        style: { strokeDasharray: '5,5' }, // Dashed line
        data: {
          color: activeWire.color,
          isTemporary: true
        }
      };
      
      // Add invisible temporary target node at cursor position
      const tempNode: Node = {
        id: tempEdge.target,
        position: { x: lastPoint.x, y: lastPoint.y },
        data: {},
        type: 'wokwiComponent',
        hidden: true, // Hide this node
      };
      
      setNodes(prev => [...prev, tempNode]);
      setEdges(prev => [...prev, tempEdge]);
    }
    
    // Cleanup temporary elements when active wire changes
    return () => {
      setEdges(prev => prev.filter(e => !e.id.startsWith('temp-')));
      setNodes(prev => prev.filter(n => !n.id.startsWith('temp-target-')));
    };
  }, [activeWire, components, reactFlowInstance]);

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
        onNodeDragStop={onNodeDragStop}
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
        connectionLineType={ConnectionLineType.Bezier}
        connectionLineStyle={{ stroke: '#FF0000' }}
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
