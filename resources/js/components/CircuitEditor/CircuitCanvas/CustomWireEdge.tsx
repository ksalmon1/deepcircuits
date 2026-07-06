import React, { memo, useRef, useState } from 'react';
import { EdgeProps, useReactFlow, ConnectionLineComponentProps } from '@xyflow/react';
import { getWireColorFromSignal } from '@/utils/wireUtils';

export interface WirePoint {
  x: number;
  y: number;
}

/**
 * Extra fields CircuitCanvas injects into the flow edge's data (they live
 * only on the rendered edge, never in the saved wire document).
 */
export interface WireEdgeRuntimeData {
  flowDirection?: 'forward' | 'reverse';
  /** Wire current magnitude in amps; scales the flow animation speed. */
  flowCurrent?: number;
  onWaypointsChange?: (wireId: string, waypoints: WirePoint[]) => void;
}

/**
 * Dash-cycle duration for a given current. Currents span decades, so the
 * scale is logarithmic: 1mA ~ 0.6s per cycle, 10x more current is 0.3s
 * faster, clamped to a visible 0.2s-2s range.
 */
function flowAnimationDuration(currentAmps: number): number {
  const duration = 0.6 - 0.3 * Math.log10(currentAmps / 0.001);
  return Math.min(2, Math.max(0.2, duration));
}

interface RoutePoint extends WirePoint {
  /** Where a waypoint created on the segment arriving at this point belongs. */
  insertIndex: number;
}

/**
 * Build the orthogonal polyline for a wire: source -> waypoints -> target.
 * Without waypoints the wire bends at the horizontal midpoint; each waypoint
 * is approached horizontally-then-vertically, and the target is approached
 * vertically-then-horizontally so the wire meets the pin along its leg.
 */
function buildRoute(source: WirePoint, target: WirePoint, waypoints: WirePoint[]): RoutePoint[] {
  const points: RoutePoint[] = [];
  const push = (x: number, y: number, insertIndex: number) => {
    const last = points[points.length - 1];
    if (!last || last.x !== x || last.y !== y) points.push({ x, y, insertIndex });
  };
  push(source.x, source.y, 0);
  if (waypoints.length === 0) {
    const midX = source.x + (target.x - source.x) / 2;
    push(midX, source.y, 0);
    push(midX, target.y, 0);
  } else {
    let prev = source;
    waypoints.forEach((w, k) => {
      push(w.x, prev.y, k);
      push(w.x, w.y, k);
      prev = w;
    });
    push(prev.x, target.y, waypoints.length);
  }
  push(target.x, target.y, waypoints.length);
  return points;
}

function pointsToPath(points: WirePoint[]): string {
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`).join(' ');
}

// --- Connection line shown while dragging a new wire from a pin ---
export const ManhattanConnectionLine: React.FC<ConnectionLineComponentProps> = ({
  fromX,
  fromY,
  toX,
  toY,
}) => {
  const path = pointsToPath(buildRoute({ x: fromX, y: fromY }, { x: toX, y: toY }, []));
  return (
    <path
      fill="none"
      stroke="#888"
      strokeWidth={2}
      strokeDasharray="6 3"
      className="react-flow__connection-line"
      d={path}
    />
  );
};

// --- The wire edge itself ---
const CustomWireEdge: React.FC<EdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  style = {},
  data,
  selected,
}) => {
  const { deleteElements, screenToFlowPosition } = useReactFlow();
  const runtime = (data ?? {}) as WireEdgeRuntimeData & Record<string, unknown>;

  const savedWaypoints = Array.isArray(runtime.routingPoints)
    ? (runtime.routingPoints as WirePoint[])
    : [];

  // While a bend is being dragged, render from this draft instead of the
  // saved wire so the wire follows the cursor without project-state churn.
  const [draftWaypoints, setDraftWaypoints] = useState<WirePoint[] | null>(null);
  const dragRef = useRef<{ points: WirePoint[]; index: number } | null>(null);
  const waypoints = draftWaypoints ?? savedWaypoints;

  const route = buildRoute({ x: sourceX, y: sourceY }, { x: targetX, y: targetY }, waypoints);
  const edgePath = pointsToPath(route);

  const beginDrag = (event: React.PointerEvent, index: number, insert: boolean) => {
    if (!runtime.onWaypointsChange) return;
    event.stopPropagation();
    event.preventDefault();
    const base = [...savedWaypoints];
    if (insert) {
      base.splice(index, 0, screenToFlowPosition({ x: event.clientX, y: event.clientY }));
    }
    dragRef.current = { points: base, index };
    setDraftWaypoints(base);
    const onMove = (ev: PointerEvent) => {
      if (!dragRef.current) return;
      const next = [...dragRef.current.points];
      next[dragRef.current.index] = screenToFlowPosition({ x: ev.clientX, y: ev.clientY });
      dragRef.current.points = next;
      setDraftWaypoints(next);
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      if (dragRef.current) {
        runtime.onWaypointsChange?.(id, dragRef.current.points);
        dragRef.current = null;
      }
      setDraftWaypoints(null);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const removeWaypoint = (event: React.MouseEvent, index: number) => {
    event.stopPropagation();
    runtime.onWaypointsChange?.(id, savedWaypoints.filter((_, i) => i !== index));
  };

  const signal = typeof runtime.signal === 'string' ? runtime.signal : '';
  const baseColor = signal ? getWireColorFromSignal(signal) : '#555';

  const finalStyle: React.CSSProperties = {
    ...Object.fromEntries(Object.entries(style).filter(([key]) => key !== 'stroke' && key !== 'strokeWidth')),
    stroke: baseColor,
    strokeWidth: selected ? 3 : 2,
    fill: 'none',
  };

  const handleDoubleClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    deleteElements({ edges: [{ id }] });
  };

  // Midpoints of segments long enough to grab, for adding new bends.
  const midpoints = selected && runtime.onWaypointsChange
    ? route.slice(1).map((point, i) => {
        const prev = route[i];
        const length = Math.abs(point.x - prev.x) + Math.abs(point.y - prev.y);
        return {
          x: (prev.x + point.x) / 2,
          y: (prev.y + point.y) / 2,
          insertIndex: point.insertIndex,
          length,
        };
      }).filter((m) => m.length >= 24)
    : [];

  return (
    <>
      {/* Wide invisible path: hover/click/double-click affordance */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={14}
        style={{ pointerEvents: 'stroke' }}
        onDoubleClick={handleDoubleClick}
      />
      <path
        id={id}
        style={finalStyle}
        className="react-flow__edge-path"
        d={edgePath}
        onDoubleClick={handleDoubleClick}
      />
      {/* Energy-flow indicator, revealed on hover when the sim knows the direction */}
      {runtime.flowDirection && (
        <path
          d={edgePath}
          className="wire-flow-indicator"
          data-flow={runtime.flowDirection}
          fill="none"
          style={{
            animationDirection: runtime.flowDirection === 'reverse' ? 'reverse' : undefined,
            animationDuration: typeof runtime.flowCurrent === 'number'
              ? `${flowAnimationDuration(runtime.flowCurrent)}s`
              : undefined,
          }}
        />
      )}
      {/* Bend editing: existing waypoints (drag to move, double-click to remove) */}
      {selected && waypoints.map((w, i) => (
        <circle
          key={`wp-${i}`}
          className="wire-waypoint"
          cx={w.x}
          cy={w.y}
          r={5}
          onPointerDown={(e) => beginDrag(e, i, false)}
          onDoubleClick={(e) => removeWaypoint(e, i)}
        />
      ))}
      {/* Segment midpoints: drag to add a new bend */}
      {midpoints.map((m, i) => (
        <circle
          key={`mid-${i}`}
          className="wire-midpoint"
          cx={m.x}
          cy={m.y}
          r={4}
          onPointerDown={(e) => beginDrag(e, m.insertIndex, true)}
        />
      ))}
    </>
  );
};

export default memo(CustomWireEdge);
