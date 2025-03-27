
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Save, Clock } from 'lucide-react';

interface CodeEditorProps {
  onCompile: (code: string) => Promise<void>;
}

const CodeEditor: React.FC<CodeEditorProps> = ({ onCompile }) => {
  const [code, setCode] = useState<string>(`
// Arduino Blink Example
// Turns an LED on for one second, then off for one second, repeatedly

// Pin 13 has an LED connected on most Arduino boards
int led = 13;

// Setup runs once when the board starts
void setup() {
  // Initialize the digital pin as an output
  pinMode(led, OUTPUT);
  
  // Initialize serial communication
  Serial.begin(9600);
  Serial.println("Arduino started!");
}

// Loop runs over and over again
void loop() {
  digitalWrite(led, HIGH);   // Turn the LED on
  Serial.println("LED ON");
  delay(1000);               // Wait for a second
  digitalWrite(led, LOW);    // Turn the LED off
  Serial.println("LED OFF");
  delay(1000);               // Wait for a second
}
`);
  const [isCompiling, setIsCompiling] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const handleCompile = async () => {
    setIsCompiling(true);
    try {
      await onCompile(code);
    } catch (error) {
      console.error('Compilation error:', error);
    } finally {
      setIsCompiling(false);
    }
  };

  const handleSave = () => {
    // In a real app, this would save to the backend
    setLastSaved(new Date());
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <div className="p-2 border-b bg-white flex justify-between items-center">
        <h3 className="font-medium">Arduino Code</h3>
        <div className="flex gap-2">
          {lastSaved && (
            <div className="text-xs text-gray-500 flex items-center">
              <Clock className="h-3 w-3 mr-1" />
              Saved at {lastSaved.toLocaleTimeString()}
            </div>
          )}
          <Button 
            size="sm" 
            variant="outline" 
            onClick={handleSave}
          >
            <Save className="h-4 w-4 mr-1" />
            Save
          </Button>
          <Button 
            size="sm"
            onClick={handleCompile}
            disabled={isCompiling}
          >
            <Play className="h-4 w-4 mr-1" />
            {isCompiling ? 'Compiling...' : 'Compile & Run'}
          </Button>
        </div>
      </div>
      
      <div className="flex-1 overflow-hidden">
        <textarea 
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="w-full h-full p-4 font-mono text-sm border-none bg-gray-900 text-gray-100 focus:outline-none resize-none"
          spellCheck={false}
        />
      </div>
    </div>
  );
};

export default CodeEditor;
