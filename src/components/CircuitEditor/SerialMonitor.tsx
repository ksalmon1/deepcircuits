import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { SendHorizonal, X } from 'lucide-react';

interface SerialMonitorProps {
  isSimulationRunning: boolean;
  serialOutput: string[];
}

// Use a fixed length for terminal output to prevent excessive rendering
const MAX_LINES = 1000;

// Functional component with memoization
const SerialMonitor = React.memo(({ isSimulationRunning, serialOutput }: SerialMonitorProps) => {
  const [inputCommand, setInputCommand] = useState('');
  const outputRef = useRef<HTMLDivElement>(null);
  const prevOutputLengthRef = useRef<number>(0);

  // Optimized output text - only process when the array length changes
  const processedOutput = useMemo(() => {
    // Limit the number of lines to prevent performance issues
    const limitedOutput = serialOutput.slice(-MAX_LINES);
    return limitedOutput.join('\n');
  }, [serialOutput.length, serialOutput]);

  // Only scroll when new output is added
  useEffect(() => {
    if (outputRef.current && serialOutput.length > prevOutputLengthRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
      prevOutputLengthRef.current = serialOutput.length;
    }
  }, [serialOutput.length]);

  const handleSendCommand = useCallback(() => {
    if (!inputCommand.trim()) return;
    
    // In a real app, this would send the command to the simulator
    console.log('Sending command:', inputCommand);
    
    // Clear the input
    setInputCommand('');
  }, [inputCommand]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSendCommand();
    }
  }, [handleSendCommand]);

  const clearOutput = useCallback(() => {
    // This would be handled by the parent component in a real application
    console.log('Clearing serial output');
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInputCommand(e.target.value);
  }, []);
  
  // Memoize static JSX elements to prevent recreating them on each render
  const serialOutputContent = useMemo(() => {
    if (serialOutput.length === 0) {
      return (
        <div className="text-gray-500 text-center mt-8">
          {isSimulationRunning 
            ? "Waiting for output..." 
            : "Start the simulation to see serial output"}
        </div>
      );
    }
    
    return (
      <pre className="whitespace-pre-wrap">
        {processedOutput}
      </pre>
    );
  }, [isSimulationRunning, processedOutput, serialOutput.length]);

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <div className="p-2 border-b bg-white flex justify-between items-center">
        <h3 className="font-medium">Serial Monitor</h3>
        <div className="flex gap-2">
          <Button 
            size="sm" 
            variant="outline" 
            onClick={clearOutput}
          >
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        </div>
      </div>
      
      <div 
        ref={outputRef}
        className="flex-1 p-3 font-mono text-sm overflow-auto bg-gray-900 text-gray-100"
      >
        {serialOutputContent}
      </div>
      
      <div className="p-2 border-t flex gap-2 bg-white">
        <input
          type="text"
          value={inputCommand}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Enter command..."
          className="flex-1 px-3 py-1 border rounded text-sm"
          disabled={!isSimulationRunning}
        />
        <Button 
          size="sm"
          onClick={handleSendCommand}
          disabled={!isSimulationRunning || !inputCommand.trim()}
        >
          <SendHorizonal className="h-4 w-4 mr-1" />
          Send
        </Button>
      </div>
    </div>
  );
});

SerialMonitor.displayName = 'SerialMonitor';

export default SerialMonitor;
