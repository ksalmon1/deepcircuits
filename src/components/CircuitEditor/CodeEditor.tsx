
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Save, Clock } from 'lucide-react';

interface CodeEditorProps {
  code: string;
  onChange: (code: string) => void;
  onCompile?: (code: string) => Promise<void>;
}

const CodeEditor: React.FC<CodeEditorProps> = ({ code, onChange, onCompile }) => {
  const [isCompiling, setIsCompiling] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const handleCompile = async () => {
    if (!onCompile) return;
    
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
          {onCompile && (
            <Button 
              size="sm"
              onClick={handleCompile}
              disabled={isCompiling}
            >
              <Play className="h-4 w-4 mr-1" />
              {isCompiling ? 'Compiling...' : 'Compile & Run'}
            </Button>
          )}
        </div>
      </div>
      
      <div className="flex-1 overflow-hidden">
        <textarea 
          value={code}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-full p-4 font-mono text-sm border-none bg-gray-900 text-gray-100 focus:outline-none resize-none"
          spellCheck={false}
        />
      </div>
    </div>
  );
};

export default CodeEditor;
