import React, { useEffect, useMemo, useState } from 'react';
import { X, Pause, Play } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Button } from '@/components/ui/button';
import { useSimulation } from '@/context/SimulationContext';
import { buildScopeTraces, pinLabel, type ScopeTrace } from '@/simulation/scope/waveforms';

/**
 * Oscilloscope / logic-analyzer panel: renders the running board's GPIO
 * edge trace as stacked digital step traces. Rolling capture at ~4 fps;
 * pausable; the time window is selectable. Channels appear automatically
 * for every pin that has toggled.
 */

interface ScopePanelProps {
  onClose: () => void;
}

const WINDOW_CHOICES = [20, 100, 500, 2000] as const;
const CHART_WIDTH = 560;
const TRACE_HEIGHT = 34;
/** Vertical gap between stacked traces, in level units (trace is 0..1). */
const LANE = 1.5;

const TRACE_COLORS = ['#2563eb', '#dc2626', '#16a34a', '#9333ea', '#ea580c', '#0891b2', '#ca8a04', '#db2777'];

const ScopePanel = ({ onClose }: ScopePanelProps) => {
  const { readBoardTrace, isSimulationRunning } = useSimulation();
  const [windowMs, setWindowMs] = useState<number>(100);
  const [paused, setPaused] = useState<boolean>(false);
  const [traces, setTraces] = useState<ScopeTrace[]>([]);
  const [analogBase, setAnalogBase] = useState<number>(14);

  useEffect(() => {
    if (paused) return;
    const capture = () => {
      const snapshot = readBoardTrace();
      if (!snapshot) {
        setTraces([]);
        return;
      }
      setAnalogBase(snapshot.analogBase);
      setTraces(buildScopeTraces(snapshot.edges, snapshot.nowCycles, snapshot.clockHz, windowMs));
    };
    capture();
    const timer = setInterval(capture, 250);
    return () => clearInterval(timer);
  }, [readBoardTrace, windowMs, paused, isSimulationRunning]);

  // Stack the traces: pin i renders at lane i (level adds 0..1 on top).
  const stacked = useMemo(
    () =>
      traces.map((trace, lane) => ({
        pin: trace.pin,
        color: TRACE_COLORS[lane % TRACE_COLORS.length],
        points: trace.points.map((p) => ({ t: p.t, y: lane * LANE + p.level })),
      })),
    [traces],
  );

  const chartHeight = Math.max(90, stacked.length * TRACE_HEIGHT + 40);

  return (
    <div
      className="absolute bottom-4 left-4 z-40 rounded-lg border bg-background p-3 shadow-lg"
      style={{ width: CHART_WIDTH + 90 }}
      data-testid="scope-panel"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-sm font-semibold">Scope</span>
        <div className="flex items-center gap-2">
          <select
            className="rounded border px-1 py-0.5 text-xs"
            value={windowMs}
            onChange={(e) => setWindowMs(parseInt(e.target.value, 10))}
            aria-label="Time window"
          >
            {WINDOW_CHOICES.map((ms) => (
              <option key={ms} value={ms}>
                {ms >= 1000 ? `${ms / 1000}s` : `${ms}ms`}
              </option>
            ))}
          </select>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => setPaused(!paused)}
            aria-label={paused ? 'Resume capture' : 'Pause capture'}
          >
            {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onClose} aria-label="Close scope">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {stacked.length === 0 ? (
        <p className="py-4 text-xs text-muted-foreground">
          {isSimulationRunning
            ? 'No GPIO activity captured yet — run a sketch that toggles pins.'
            : 'Run a simulation with a board to capture waveforms.'}
        </p>
      ) : (
        <div className="flex">
          <div className="flex flex-col-reverse justify-between py-4 pr-1 text-right">
            {stacked.map((trace) => (
              <span key={trace.pin} className="text-xs font-mono" style={{ color: trace.color }}>
                {pinLabel(trace.pin, analogBase)}
              </span>
            ))}
          </div>
          <LineChart width={CHART_WIDTH} height={chartHeight} margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical horizontal={false} />
            <XAxis
              type="number"
              dataKey="t"
              domain={[0, windowMs]}
              tickFormatter={(t: number) => `${t}ms`}
              tick={{ fontSize: 10 }}
              allowDataOverflow
            />
            <YAxis hide domain={[-0.25, Math.max(1, stacked.length) * LANE]} />
            {stacked.map((trace) => (
              <Line
                key={trace.pin}
                data={trace.points}
                dataKey="y"
                type="stepAfter"
                dot={false}
                isAnimationActive={false}
                stroke={trace.color}
                strokeWidth={1.5}
              />
            ))}
          </LineChart>
        </div>
      )}
    </div>
  );
};

export default ScopePanel;
