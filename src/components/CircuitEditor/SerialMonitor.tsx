
import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Trash2, Send } from "lucide-react";
import { Input } from "@/components/ui/input";

interface SerialMonitorProps {
  projectId?: string;
}

const SerialMonitor = ({ projectId }: SerialMonitorProps) => {
  const [logs, setLogs] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [baudRate, setBaudRate] = useState(9600);
  const [isConnected, setIsConnected] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Simulate connecting to a serial port
  useEffect(() => {
    // In a real app, we would connect to actual hardware or a simulation API
    const simulateSerialConnection = () => {
      setIsConnected(true);
      
      // Add some initial logs
      setLogs([
        `[${new Date().toLocaleTimeString()}] Serial monitor started at ${baudRate} baud`,
        `[${new Date().toLocaleTimeString()}] Connected to project ${projectId || 'unknown'}`
      ]);
      
      // Simulate incoming data periodically
      const interval = setInterval(() => {
        if (Math.random() > 0.7) { // Only send data occasionally
          const messages = [
            "LED state: ON",
            "Temperature: 23.5°C",
            "Button pressed",
            "Sensor reading: 512",
            "System initialized"
          ];
          const randomMessage = messages[Math.floor(Math.random() * messages.length)];
          
          setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${randomMessage}`]);
        }
      }, 3000);
      
      return () => {
        clearInterval(interval);
        setIsConnected(false);
      };
    };
    
    const connection = simulateSerialConnection();
    return () => connection();
  }, [projectId, baudRate]);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const clearLogs = () => {
    setLogs([`[${new Date().toLocaleTimeString()}] Serial monitor cleared`]);
  };

  const sendData = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] >>> ${input}`]);
    setInput('');
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-2 border-b">
        <h3 className="text-sm font-medium">Serial Monitor</h3>
        <div className="flex items-center gap-2">
          <select 
            value={baudRate}
            onChange={(e) => setBaudRate(Number(e.target.value))}
            className="text-xs border rounded px-2 py-1"
          >
            <option value="9600">9600 baud</option>
            <option value="19200">19200 baud</option>
            <option value="57600">57600 baud</option>
            <option value="115200">115200 baud</option>
          </select>
          <div className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-xs">{isConnected ? 'Connected' : 'Disconnected'}</span>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={clearLogs}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <div className="flex-grow p-2 bg-black text-green-400 font-mono text-xs overflow-y-auto">
        {logs.map((log, index) => (
          <div key={index} className="mb-1">{log}</div>
        ))}
        <div ref={logsEndRef} />
      </div>
      
      <form onSubmit={sendData} className="p-2 border-t flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Send data to device..."
          className="text-sm"
        />
        <Button type="submit" size="sm">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
};

export default SerialMonitor;
