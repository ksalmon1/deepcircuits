import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/toggle';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  SendHorizonal,
  Trash2,
  DownloadIcon,
  Copy,
  Clock,
  ArrowDown,
  TerminalSquare,
} from 'lucide-react';
import { toast } from 'sonner';
import type { SerialLine } from '@/context/SimulationContext';

interface SerialMonitorProps {
  isSimulationRunning: boolean;
  serialOutput: SerialLine[];
  clearSerialOutput?: () => void;
  onSendCommand?: (command: string) => void;
}

// Consider the view "pinned" to the bottom while within this distance (px),
// so tiny scroll jitter doesn't turn autoscroll off.
const PIN_THRESHOLD_PX = 40;

const formatTimestamp = (time: number) => {
  const d = new Date(time);
  const pad = (n: number, len = 2) => n.toString().padStart(len, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`;
};

// Color-code lines by their content so errors and run markers stand out.
const lineClass = (text: string): string => {
  if (text.startsWith('[Error]')) return 'text-red-400';
  if (text.startsWith('> ')) return 'text-amber-300';
  if (/^\[.*\]$/.test(text.trim())) return 'text-sky-400';
  return 'text-gray-200';
};

const OutputLine = React.memo(({ line, showTimestamps }: { line: SerialLine; showTimestamps: boolean }) => (
  <div className="whitespace-pre-wrap break-words">
    {showTimestamps && (
      <span className="mr-2 select-none text-gray-500">{formatTimestamp(line.time)}</span>
    )}
    <span className={lineClass(line.text)}>{line.text || ' '}</span>
  </div>
));
OutputLine.displayName = 'OutputLine';

const SerialMonitor = React.memo(({ isSimulationRunning, serialOutput, clearSerialOutput, onSendCommand }: SerialMonitorProps) => {
  const [inputCommand, setInputCommand] = useState('');
  const [showTimestamps, setShowTimestamps] = useState(false);
  // Autoscroll only while the user is at (or near) the bottom; scrolling up
  // pauses it and new lines are counted for the "jump to bottom" pill.
  const [isPinned, setIsPinned] = useState(true);
  const [unseenCount, setUnseenCount] = useState(0);
  const outputRef = useRef<HTMLDivElement>(null);
  const prevLengthRef = useRef(0);
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef(-1);

  const hasOutput = serialOutput.length > 0;

  useEffect(() => {
    const added = serialOutput.length - prevLengthRef.current;
    prevLengthRef.current = serialOutput.length;
    if (serialOutput.length === 0) {
      setUnseenCount(0);
      return;
    }
    if (isPinned) {
      const el = outputRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    } else if (added > 0) {
      setUnseenCount(count => count + added);
    }
  }, [serialOutput, isPinned, showTimestamps]);

  const handleScroll = useCallback(() => {
    const el = outputRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < PIN_THRESHOLD_PX;
    setIsPinned(atBottom);
    if (atBottom) setUnseenCount(0);
  }, []);

  const jumpToBottom = useCallback(() => {
    const el = outputRef.current;
    if (el) el.scrollTop = el.scrollHeight;
    setIsPinned(true);
    setUnseenCount(0);
  }, []);

  const handleSendCommand = useCallback(() => {
    const command = inputCommand.trim();
    if (!command) return;
    historyRef.current.push(command);
    historyIndexRef.current = -1;
    onSendCommand?.(command);
    setInputCommand('');
  }, [inputCommand, onSendCommand]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const history = historyRef.current;
    if (e.key === 'Enter') {
      handleSendCommand();
    } else if (e.key === 'ArrowUp' && history.length > 0) {
      e.preventDefault();
      const index = historyIndexRef.current === -1
        ? history.length - 1
        : Math.max(0, historyIndexRef.current - 1);
      historyIndexRef.current = index;
      setInputCommand(history[index]);
    } else if (e.key === 'ArrowDown' && historyIndexRef.current !== -1) {
      e.preventDefault();
      const index = historyIndexRef.current + 1;
      if (index >= history.length) {
        historyIndexRef.current = -1;
        setInputCommand('');
      } else {
        historyIndexRef.current = index;
        setInputCommand(history[index]);
      }
    }
  }, [handleSendCommand]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInputCommand(e.target.value);
    historyIndexRef.current = -1;
  }, []);

  const outputAsText = useMemo(
    () => serialOutput
      .map(line => (showTimestamps ? `${formatTimestamp(line.time)} ${line.text}` : line.text))
      .join('\n'),
    [serialOutput, showTimestamps]
  );

  const handleCopyOutput = useCallback(() => {
    navigator.clipboard.writeText(outputAsText)
      .then(() => toast.success('Output copied to clipboard'))
      .catch(err => toast.error('Failed to copy: ' + err));
  }, [outputAsText]);

  const handleDownloadOutput = useCallback(() => {
    const blob = new Blob([outputAsText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `serial-output-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Output downloaded');
  }, [outputAsText]);

  return (
    <TooltipProvider delayDuration={300}>
      <div className="h-full flex flex-col bg-white border border-gray-200">
        <div className="px-2 py-1.5 border-b flex justify-between items-center bg-gray-100">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={`h-2 w-2 rounded-full shrink-0 ${isSimulationRunning ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}
              aria-hidden="true"
            />
            <h3 className="font-medium text-sm text-gray-800 truncate">Serial Monitor</h3>
            {hasOutput && (
              <span className="text-xs text-gray-500 shrink-0">
                {serialOutput.length} {serialOutput.length === 1 ? 'line' : 'lines'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Toggle
                  size="sm"
                  className="h-8 w-8 p-0"
                  pressed={showTimestamps}
                  onPressedChange={setShowTimestamps}
                  aria-label="Toggle timestamps"
                >
                  <Clock className="h-4 w-4" />
                </Toggle>
              </TooltipTrigger>
              <TooltipContent>{showTimestamps ? 'Hide timestamps' : 'Show timestamps'}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0"
                  onClick={handleCopyOutput}
                  disabled={!hasOutput}
                  aria-label="Copy output to clipboard"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Copy output</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0"
                  onClick={handleDownloadOutput}
                  disabled={!hasOutput}
                  aria-label="Download output"
                >
                  <DownloadIcon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Download output</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0"
                  onClick={clearSerialOutput}
                  disabled={!hasOutput}
                  aria-label="Clear output"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Clear output</TooltipContent>
            </Tooltip>
          </div>
        </div>

        <div className="relative flex-1 min-h-0">
          <div
            ref={outputRef}
            onScroll={handleScroll}
            className="h-full overflow-y-auto bg-[#1e1e1e] px-3 py-2 font-mono text-xs leading-5"
          >
            {hasOutput ? (
              <>
                {serialOutput.map(line => (
                  <OutputLine key={line.id} line={line} showTimestamps={showTimestamps} />
                ))}
                {isSimulationRunning && (
                  <span className="inline-block h-3.5 w-2 bg-gray-300 animate-pulse" aria-hidden="true" />
                )}
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center gap-2 text-gray-500">
                <TerminalSquare className="h-8 w-8" />
                <span>
                  {isSimulationRunning
                    ? 'Waiting for output...'
                    : 'Start the simulation to see serial output'}
                </span>
              </div>
            )}
          </div>
          {!isPinned && unseenCount > 0 && (
            <Button
              size="sm"
              onClick={jumpToBottom}
              className="absolute bottom-3 right-4 h-7 rounded-full bg-gray-700 hover:bg-gray-600 text-gray-100 text-xs shadow-md"
            >
              <ArrowDown className="h-3.5 w-3.5 mr-1" />
              {unseenCount} new {unseenCount === 1 ? 'line' : 'lines'}
            </Button>
          )}
        </div>

        <div className="p-2 flex gap-2 bg-gray-100 border-t">
          <input
            type="text"
            value={inputCommand}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={isSimulationRunning ? 'Type a command and press Enter...' : 'Start the simulation to send commands'}
            className="flex-1 px-3 py-1 bg-white text-black border border-gray-300 rounded font-mono text-sm focus:outline-none focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
            disabled={!isSimulationRunning}
            aria-label="Serial command input"
          />
          <Button
            size="sm"
            onClick={handleSendCommand}
            disabled={!isSimulationRunning || !inputCommand.trim()}
            className="bg-blue-500 hover:bg-blue-600 text-white"
          >
            <SendHorizonal className="h-4 w-4 mr-1" />
            Send
          </Button>
        </div>
      </div>
    </TooltipProvider>
  );
});

SerialMonitor.displayName = 'SerialMonitor';

export default SerialMonitor;
