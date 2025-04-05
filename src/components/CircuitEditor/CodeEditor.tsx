import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Save, Clock } from 'lucide-react';
import Editor from '@monaco-editor/react';

interface CodeEditorProps {
  code: string;
  onChange: (value: string | undefined) => void;
  onCompile?: (code: string) => Promise<void>;
}

const CodeEditor: React.FC<CodeEditorProps> = ({ code, onChange, onCompile }) => {
  const [isCompiling, setIsCompiling] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [currentCode, setCurrentCode] = useState(code);

  useEffect(() => {
    setCurrentCode(code);
  }, [code]);

  const handleCompile = async () => {
    if (!onCompile || !currentCode) return;

    setIsCompiling(true);
    try {
      await onCompile(currentCode);
    } catch (error) {
      console.error('Compilation error:', error);
    } finally {
      setIsCompiling(false);
    }
  };

  const handleSave = () => {
    setLastSaved(new Date());
  };

  const handleEditorChange = (value: string | undefined) => {
    const newCode = value || '';
    setCurrentCode(newCode);
    onChange(newCode);
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <div className="p-2 border-b bg-white flex justify-between items-center">
        <h3 className="font-medium">Arduino Code (C++)</h3>
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
              disabled={isCompiling || !currentCode}
            >
              <Play className="h-4 w-4 mr-1" />
              {isCompiling ? 'Compiling...' : 'Compile & Run'}
            </Button>
          )}
        </div>
      </div>
      
      <div className="flex-1 overflow-hidden">
        <Editor
          height="100%"
          language="cpp"
          theme="vs-dark"
          value={currentCode}
          onChange={handleEditorChange}
          options={{
            minimap: { enabled: true },
            fontSize: 14,
            scrollBeyondLastLine: false,
            wordWrap: 'on',
          }}
        />
      </div>
    </div>
  );
};

export default CodeEditor;
