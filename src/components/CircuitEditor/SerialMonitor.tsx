
import React from 'react';

export interface SerialMonitorProps {
  isSimulationRunning: boolean;
  serialOutput: string[];
}

const SerialMonitor: React.FC<SerialMonitorProps> = ({ 
  isSimulationRunning, 
  serialOutput 
}) => {
  return (
    <div className="flex flex-col h-full">
      <div className="bg-black text-green-400 font-mono p-4 flex-1 overflow-auto rounded">
        {isSimulationRunning ? (
          serialOutput.length > 0 ? (
            <div>
              {serialOutput.map((line, index) => (
                <div key={index}>{line}</div>
              ))}
            </div>
          ) : (
            <div>Serial monitor is running. Waiting for output...</div>
          )
        ) : (
          <div className="text-gray-500">Start simulation to see serial output.</div>
        )}
      </div>
      <div className="flex mt-2">
        <input 
          type="text" 
          className="flex-1 px-3 py-2 border rounded-l focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter data to send..."
          disabled={!isSimulationRunning}
        />
        <button 
          className="bg-blue-500 text-white px-4 py-2 rounded-r disabled:bg-gray-300"
          disabled={!isSimulationRunning}
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default SerialMonitor;
