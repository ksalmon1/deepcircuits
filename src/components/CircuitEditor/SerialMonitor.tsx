import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { SendHorizonal, X, DownloadIcon, Copy } from 'lucide-react';
import { toast } from 'sonner';

interface SerialMonitorProps {
  isSimulationRunning: boolean;
  serialOutput: string[];
  clearSerialOutput?: () => void;
}

// Use a fixed length for terminal output to prevent excessive rendering
const MAX_LINES = 1000;

// Format timestamp for output lines
const formatTimestamp = () => {
  const now = new Date();
  return `[${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}.${now.getMilliseconds().toString().padStart(3, '0')}]`;
};

// Functional component with memoization
const SerialMonitor = React.memo(({ isSimulationRunning, serialOutput, clearSerialOutput }: SerialMonitorProps) => {
  const [inputCommand, setInputCommand] = useState('');
  const outputRef = useRef<HTMLDivElement>(null);
  const prevOutputLengthRef = useRef<number>(0);

  // Optimized output text - only process when the array length changes
  const processedOutput = useMemo(() => {
    // Limit the number of lines to prevent performance issues
    const limitedOutput = serialOutput.slice(-MAX_LINES);
    return limitedOutput.join('\n');
  }, [serialOutput]);

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

  const handleClearOutput = useCallback(() => {
    if (clearSerialOutput) {
      clearSerialOutput();
    }
  }, [clearSerialOutput]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInputCommand(e.target.value);
  }, []);
  
  const handleCopyOutput = useCallback(() => {
    navigator.clipboard.writeText(processedOutput)
      .then(() => toast.success('Output copied to clipboard'))
      .catch(err => toast.error('Failed to copy: ' + err));
  }, [processedOutput]);
  
  const handleDownloadOutput = useCallback(() => {
    const blob = new Blob([processedOutput], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `serial-output-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Output downloaded');
  }, [processedOutput]);
  
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
      <pre className="whitespace-pre-wrap p-2 text-black">
        {processedOutput}
        {isSimulationRunning && <span className="cursor inline-block h-4 w-2 bg-black ml-1 animate-pulse"></span>}
      </pre>
    );
  }, [isSimulationRunning, processedOutput, serialOutput.length]);

  return (
    <div className="h-full flex flex-col bg-white border border-gray-200">
      <div className="p-2 border-b flex justify-between items-center bg-gray-100">
        <h3 className="font-medium text-gray-800">Serial Monitor</h3>
        <div className="flex gap-2">
          <Button 
            size="sm" 
            variant="outline" 
            onClick={handleCopyOutput}
            className="text-gray-700 hover:bg-gray-200"
            title="Copy output to clipboard"
          >
            <Copy className="h-4 w-4 mr-1" />
            Copy
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={handleDownloadOutput}
            className="text-gray-700 hover:bg-gray-200"
            title="Download output"
          >
            <DownloadIcon className="h-4 w-4 mr-1" />
            Save
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={handleClearOutput}
            className="text-gray-700 hover:bg-gray-200"
            title="Clear output"
          >
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        </div>
      </div>
      
      <div 
        ref={outputRef}
        className="flex-1 overflow-auto font-mono text-sm border-b"
        style={{ 
          backgroundColor: "#f8f8f8", 
          color: "#000",
          fontFamily: "'Courier New', monospace" 
        }}
      >
        {serialOutputContent}
      </div>
      
      <div className="p-2 flex gap-2 bg-gray-100">
        <input
          type="text"
          value={inputCommand}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Enter command..."
          className="flex-1 px-3 py-1 bg-white text-black border border-gray-300 rounded font-mono text-sm focus:outline-none focus:border-blue-500"
          disabled={!isSimulationRunning}
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
  );
});

SerialMonitor.displayName = 'SerialMonitor';

export default SerialMonitor;
