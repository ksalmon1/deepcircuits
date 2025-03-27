
import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { SendHorizonal, X } from 'lucide-react';

interface SerialMonitorProps {
  isSimulationRunning: boolean;
  serialOutput: string[];
}

const SerialMonitor: React.FC<SerialMonitorProps> = ({ 
  isSimulationRunning,
  serialOutput 
}) => {
  const [inputCommand, setInputCommand] = useState('');
  const outputRef = useRef<HTMLDivElement>(null);

  // Scroll to the bottom when new output is added
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [serialOutput]);

  const handleSendCommand = () => {
    if (!inputCommand.trim()) return;
    
    // In a real app, this would send the command to the simulator
    console.log('Sending command:', inputCommand);
    
    // Clear the input
    setInputCommand('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSendCommand();
    }
  };

  const clearOutput = () => {
    // This would be handled by the parent component in a real application
    console.log('Clearing serial output');
  };

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
        {serialOutput.length === 0 ? (
          <div className="text-gray-500 text-center mt-8">
            {isSimulationRunning 
              ? "Waiting for output..." 
              : "Start the simulation to see serial output"}
          </div>
        ) : (
          <pre className="whitespace-pre-wrap">
            {serialOutput.join('\n')}
          </pre>
        )}
      </div>
      
      <div className="p-2 border-t flex gap-2 bg-white">
        <input
          type="text"
          value={inputCommand}
          onChange={(e) => setInputCommand(e.target.value)}
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
};

export default SerialMonitor;
