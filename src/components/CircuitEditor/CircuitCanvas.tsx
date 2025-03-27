import React, { useRef, useEffect, useState, useCallback } from 'react';
import { 
  isWokwiLoaded, 
  forceLoadWokwiElements, 
  WokwiComponent, 
  renderWokwiElement,
  getComponentPinInfo,
  WokwiPin
} from '@/integrations/wokwi/WokwiIntegration';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { ZoomIn, ZoomOut, Move } from 'lucide-react';
import { useComponentLibrary } from '@/hooks/useComponentLibrary';
import { isInteractingWithPin } from '@/utils/wireUtils';
import { useCanvasNavigation } from '@/hooks/useCanvasNavigation';
import { useWireSystem } from '@/hooks/useWireSystem';
import { isCustomComponent, renderCustomComponent } from '@/integrations/custom/CustomComponents';
import { fetchComponentPins } from '@/utils/componentUtils';
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
import WokwiComponentNode from './CircuitCanvas/WokwiComponentNode';
import WireEdge from './CircuitCanvas/WireEdge';
import { componentToNode, wiresToEdges } from './CircuitCanvas/utils';

interface CircuitCanvasProps {
  components: WokwiComponent[];
  onComponentsChange: (components: WokwiComponent[]) => void;
}

// Define the custom node and edge types
const nodeTypes: NodeTypes = {
  wokwiComponent: WokwiComponentNode,
};

const edgeTypes: EdgeTypes = {
  wire: WireEdge,
};

const pinCache: Record<string, WokwiPin[]> = {};

const CircuitCanvas = ({ components, onComponentsChange }: CircuitCanvasProps) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [isReady, setIsReady] = useState(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [loadingAttempts, setLoadingAttempts] = useState(0);
  
  const {
    zoom,
    offset,
    panMode,
    isDraggingCanvas,
    handleZoomIn,
    handleZoomOut,
    togglePanMode,
    startPan,
    pan,
    endPan,
    handleWheel,
    updateCanvasDimensions,
    screenToCanvasCoordinates
  } = useCanvasNavigation(1);
  
  const {
    wires,
    setWires,
    activeWire,
    handlePinClick,
    handleCanvasClick,
    cancelActiveWire,
    potentialTargetRef,
    deleteWire
  } = useWireSystem(components);
  
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [editingEdgeId, setEditingEdgeId] = useState<string | null>(null);
  const [controlPoints, setControlPoints] = useState<Record<string, { x: number, y: number }[]>>({});
  const [isDraggingControlPoint, setIsDraggingControlPoint] = useState(false);
  const [activeControlPoint, setActiveControlPoint] = useState<{edgeId: string, pointIndex: number} | null>(null);
  
  const [hoveredComponent, setHoveredComponent] = useState<string | null>(null);
  const [hoveredPins, setHoveredPins] = useState<WokwiPin[]>([]);
  const [visiblePins, setVisiblePins] = useState<{[componentId: string]: boolean}>({});
  const [hoveredPin, setHoveredPin] = useState<{componentId: string, pinIndex: number} | null>(null);
  const [renderedComponents, setRenderedComponents] = useState<Record<string, boolean>>({});
  
  const [draggingComponent, setDraggingComponent] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  const { 
    components: libraryComponents, 
    componentsDetailsMap, 
    isLoadingComponents, 
    isLoadingDetails 
  } = useComponentLibrary();

  // Convert components to nodes when components change
  React.useEffect(() => {
    const initialNodes = components.map(comp => componentToNode({
      id: comp.id,
      type: comp.type,
      left: comp.left,
      top: comp.top,
      attributes: comp.attributes,
      pins: comp.pins || []
    }));
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

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setCanvasSize({ width, height });
        updateCanvasDimensions(width, height);
      }
    };
    
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [updateCanvasDimensions]);
  
  useEffect(() => {
    populatePinCache();
  }, [libraryComponents, componentsDetailsMap]);

  const populatePinCache = useCallback(() => {
    if (libraryComponents && componentsDetailsMap && Object.keys(componentsDetailsMap).length > 0) {
      console.log('Loading pin data from componentsDetailsMap:', Object.keys(componentsDetailsMap).length);
      
      libraryComponents.forEach(component => {
        if (component.id && componentsDetailsMap[component.id]) {
          const details = componentsDetailsMap[component.id];
          if (details && details.pins && details.pins.length > 0) {
            console.log(`Found pins for ${component.name} (${component.type}) from details:`, details.pins);
            pinCache[component.type] = details.pins.map((pin: any) => ({
              name: pin.name,
              x: Number(pin.x),
              y: Number(pin.y),
              signals: pin.signals || []
            }));
          }
        }
      });
      
      console.log('Pin cache after loading from details:', pinCache);
    } else if (libraryComponents && libraryComponents.length > 0) {
      console.log('Loading pin data from library components:', libraryComponents.length);
      
      libraryComponents.forEach(component => {
        if (component.pins && component.pins.length > 0) {
          console.log(`Found pins for ${component.name} (${component.type}):`, component.pins);
          pinCache[component.type] = component.pins.map(pin => ({
            name: pin.name,
            x: Number(pin.x), 
            y: Number(pin.y),
            signals: pin.signals || []
          }));
        }
      });
      
      console.log('Pin cache after loading:', pinCache);
    }
  }, [libraryComponents, componentsDetailsMap]);

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
      const { x, y } = reactFlowInstance.screenToFlowPosition({
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
  }, [reactFlowInstance, activeControlPoint, controlPoints, setWires]);
  
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
  }, [controlPoints, setEdges]);

  const checkWokwiLoaded = useCallback(async () => {
    console.log('Checking if Wokwi is loaded, attempt:', loadingAttempts + 1);
    
    if (isWokwiLoaded()) {
      console.log('Wokwi components loaded successfully');
      setIsReady(true);
      return true;
    }
    
    if (loadingAttempts >= 2) {
      console.log('Attempting to manually load Wokwi components...');
      
      try {
        const success = await forceLoadWokwiElements();
        if (success) {
          console.log('Manual loading of Wokwi components succeeded');
          setIsReady(true);
          return true;
        } else {
          console.log('Manual loading of Wokwi components failed');
        }
      } catch (err) {
        console.error('Error during manual loading:', err);
      }
    }
    
    if (loadingAttempts > 5) {
      console.error('Failed to load Wokwi components after multiple attempts');
      setLoadingError('Failed to load circuit components. Please refresh the page or check your internet connection.');
      toast.error('Circuit components failed to load', {
        description: 'Please refresh the page or check your internet connection.',
        duration: 5000,
      });
      return false;
    }
    
    setLoadingAttempts(prev => prev + 1);
    return false;
  }, [loadingAttempts]);

  useEffect(() => {
    const attemptLoading = async () => {
      const success = await checkWokwiLoaded();
      
      if (!success) {
        const timer = setTimeout(attemptLoading, 1000);
        return () => clearTimeout(timer);
      }
    };
    
    attemptLoading();
  }, [checkWokwiLoaded]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isReady && !loadingError) {
        console.log('Fallback: Forcing canvas to load after timeout');
        toast.warning('Loading components in fallback mode', {
          description: 'Some features may be limited.',
        });
        setIsReady(true);
      }
    }, 6000);

    return () => clearTimeout(timer);
  }, [isReady, loadingError]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activeWire) {
        cancelActiveWire();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeWire, cancelActiveWire]);

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
      
      // Use the handlePinClick method from useWireSystem to create the wire
      handlePinClick(sourceComponent.id, sourcePinIndex, 
                    sourceComponent.left + sourcePin.x, 
                    sourceComponent.top + sourcePin.y);
      
      handlePinClick(targetComponent.id, targetPinIndex, 
                    targetComponent.left + targetPin.x, 
                    targetComponent.top + targetPin.y);
                    
      toast.success('Connection created', {
        description: 'Wire added between components',
        duration: 1500,
      });
    },
    [components, handlePinClick]
  );

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    
    try {
      const componentData = e.dataTransfer.getData('component');
      if (!componentData) return;
      
      const componentInfo = JSON.parse(componentData);
      
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      
      const x = (e.clientX - rect.left - offset.x) / zoom;
      const y = (e.clientY - rect.top - offset.y) / zoom;
      
      const gridSize = 25;
      const left = Math.floor(x / gridSize) * gridSize;
      const top = Math.floor(y / gridSize) * gridSize;
      
      const libraryComponent = libraryComponents?.find(c => c.type === componentInfo.type);
      
      let pins;
      if (libraryComponent?.id && componentsDetailsMap && componentsDetailsMap[libraryComponent.id]) {
        const details = componentsDetailsMap[libraryComponent.id];
        if (details && details.pins && details.pins.length > 0) {
          console.log(`Using pins from details for ${componentInfo.type}:`, details.pins);
          pins = details.pins.map((pin: any) => ({
            name: pin.name,
            x: Number(pin.x),
            y: Number(pin.y),
            signals: pin.signals || []
          }));
        }
      }
      
      if (!pins && libraryComponent?.pins) {
        console.log(`Using pins from component for ${componentInfo.type}:`, libraryComponent.pins);
        pins = libraryComponent.pins.map(pin => ({
          name: pin.name,
          x: Number(pin.x),
          y: Number(pin.y),
          signals: pin.signals || []
        }));
      }
      
      if (!pins) {
        console.log(`Falling back to default pins for ${componentInfo.type}`);
        pins = getComponentPinInfo(componentInfo.type);
      }
      
      const newComponent: WokwiComponent = {
        type: componentInfo.type,
        id: `comp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        top,
        left,
        attributes: { color: 'red' },
        pins
      };
      
      const updatedComponents = [...components, newComponent];
      onComponentsChange(updatedComponents);
      
      console.log('Component added:', newComponent);
      console.log('Total components after add:', updatedComponents.length);
      
      toast.success(`Added ${componentInfo.name}`, {
        description: `Component placed at position (${left}, ${top})`,
        duration: 2000,
      });
    } catch (error) {
      console.error('Error adding component:', error);
      toast.error('Failed to add component');
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleRetry = async () => {
    setLoadingError(null);
    setLoadingAttempts(0);
    await checkWokwiLoaded();
  };

  return (
    <div className="h-full w-full bg-white relative flex flex-col">
      {!isReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 bg-opacity-80 z-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-gray-600">Loading circuit components...</p>
            {loadingError && (
              <div className="mt-4 text-red-500 max-w-md">
                {loadingError}
                <button 
                  onClick={handleRetry}
                  className="ml-2 text-blue-500 underline"
                >
                  Retry
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="absolute top-2 right-2 bg-white rounded-md shadow-md p-1 z-20 flex gap-1">
        <button
          onClick={handleZoomIn}
          className="p-1 hover:bg-gray-100 rounded"
          title="Zoom In (or use Ctrl+Scroll)"
        >
          <ZoomIn size={18} />
        </button>
        <button
          onClick={handleZoomOut}
          className="p-1 hover:bg-gray-100 rounded"
          title="Zoom Out (or use Ctrl+Scroll)"
        >
          <ZoomOut size={18} />
        </button>
        <button
          onClick={togglePanMode}
          className={`p-1 hover:bg-gray-100 rounded ${panMode ? 'bg-gray-200' : ''}`}
          title="Pan Mode (or use middle mouse button)"
        >
          <Move size={18} />
        </button>
        <div className="px-2 flex items-center text-xs text-gray-600">
          {Math.round(zoom * 100)}%
        </div>
      </div>
      
      {activeWire && (
        <div className="absolute top-12 right-2 bg-yellow-100 text-sm p-2 rounded-md shadow-md z-20">
          {activeWire.points.length > 1 ? 
            "Creating wire: Click canvas to add points, click a pin to complete, or press Esc to cancel." :
            "Creating wire: Click another pin to complete the connection, or press Esc to cancel."}
        </div>
      )}
      
      <div 
        ref={containerRef}
        className="h-full w-full overflow-hidden"
      >
        <ReactFlow
          ref={canvasRef}
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onInit={setReactFlowInstance}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          minZoom={0.5}
          maxZoom={4}
          defaultViewport={{ x: 0, y: 0, zoom: 1 }}
          fitView
          snapToGrid={true}
          snapGrid={[25, 25]}
        >
          <Background 
            variant={BackgroundVariant.Dots} 
            gap={25} 
            size={1} 
            color="#e2e8f0" 
          />
          <Controls position="bottom-right" showInteractive={false} />
          
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
