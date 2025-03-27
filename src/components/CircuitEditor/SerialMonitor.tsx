
import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Download, Trash, Power } from 'lucide-react';

interface SerialMonitorProps {
  projectId?: string; // Optional prop to match usage in CircuitEditorLayout
}

const SerialMonitor: React.FC<SerialMonitorProps> = ({ projectId }) => {
  const [output, setOutput] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Add simulated output when running
  useEffect(() => {
    if (!isRunning) return;
    
    const messages = [
      'Initializing simulation...',
      'Board: Arduino Uno',
      'CPU: ATmega328P',
      'Setting up pins...',
      'Digital pins initialized',
      'Analog pins initialized',
      'Starting main program loop',
      'Hello from Arduino!',
      'LED on pin 13 turned ON',
      'Reading analog value from A0: 512',
      'Reading analog value from A0: 514',
      'Reading analog value from A0: 517',
      'LED on pin 13 turned OFF',
      'Reading analog value from A0: 520',
      'Reading analog value from A0: 518',
      'LED on pin 13 turned ON',
    ];
    
    let index = 0;
    
    const interval = setInterval(() => {
      if (index < messages.length) {
        setOutput(prev => [...prev, messages[index]]);
        index++;
      } else {
        clearInterval(interval);
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [isRunning]);
  
  // Auto-scroll to bottom when new output is added
  useEffect(() => {
    if (autoScroll && scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [output, autoScroll]);

  const handleClear = () => {
    setOutput([]);
  };

  const handleToggleSimulation = () => {
    setIsRunning(prev => !prev);
    if (!isRunning) {
      setOutput(prev => [...prev, '--- Simulation started ---']);
    } else {
      setOutput(prev => [...prev, '--- Simulation stopped ---']);
    }
  };

  const handleDownload = () => {
    const text = output.join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `serial-output-${projectId || 'unknown'}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <div className="p-2 border-b bg-white flex justify-between items-center">
        <h3 className="font-medium">Serial Monitor</h3>
        <div className="flex gap-2">
          <Button 
            size="sm" 
            variant="outline" 
            onClick={handleClear}
            title="Clear output"
          >
            <Trash className="h-4 w-4" />
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={handleDownload}
            title="Download output"
          >
            <Download className="h-4 w-4" />
          </Button>
          <Button 
            size="sm" 
            variant={isRunning ? "default" : "outline"}
            onClick={handleToggleSimulation}
            title={isRunning ? "Stop simulation" : "Start simulation"}
          >
            <Power className="h-4 w-4 mr-1" />
            {isRunning ? 'Stop' : 'Start'}
          </Button>
        </div>
      </div>
      
      <div className="flex-1 relative" ref={scrollAreaRef}>
        <ScrollArea className="h-full">
          <div className="p-2 font-mono text-sm whitespace-pre-wrap">
            {output.length > 0 ? (
              output.map((line, i) => (
                <div key={i} className="py-0.5">
                  {line}
                </div>
              ))
            ) : (
              <div className="text-gray-400 text-center mt-4">
                {isRunning ? 
                  'Waiting for output...' : 
                  'Start the simulation to see output'
                }
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
      
      <div className="p-2 border-t bg-white flex justify-between items-center">
        <div>
          <label className="flex items-center text-sm">
            <input 
              type="checkbox" 
              checked={autoScroll} 
              onChange={() => setAutoScroll(prev => !prev)}
              className="mr-2"
            />
            Auto-scroll
          </label>
        </div>
        <div className="text-xs text-gray-500">
          {isRunning ? 'Simulation running' : 'Simulation stopped'}
        </div>
      </div>
    </div>
  );
};

export default SerialMonitor;
