
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Play, Download } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";

interface CodeEditorProps {
  projectId?: string;
  onCompile?: (code: string) => Promise<void>;
}

const CodeEditor = ({ projectId, onCompile }: CodeEditorProps) => {
  const [code, setCode] = useState<string>('');
  const [isCompiling, setIsCompiling] = useState<boolean>(false);
  const [compileOutput, setCompileOutput] = useState<string>('');
  const [compileSuccess, setCompileSuccess] = useState<boolean | null>(null);

  // Load default template code
  useEffect(() => {
    const defaultCode = `// Arduino code for ${projectId || 'new project'}
void setup() {
  // Initialize pins and components
  pinMode(13, OUTPUT);
}

void loop() {
  // Main program loop
  digitalWrite(13, HIGH);
  delay(1000);
  digitalWrite(13, LOW);
  delay(1000);
}`;
    
    setCode(defaultCode);
  }, [projectId]);

  const handleCompile = async () => {
    if (!code.trim()) {
      toast.error('Cannot compile empty code');
      return;
    }

    setIsCompiling(true);
    setCompileOutput('');
    setCompileSuccess(null);
    
    try {
      // In a real app, this would call an API to compile the code
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API call
      
      // Simulate successful compilation
      setCompileSuccess(true);
      setCompileOutput('Compilation successful. Ready to upload to microcontroller.');
      
      if (onCompile) {
        await onCompile(code);
      }
      
      toast.success('Code compiled successfully');
    } catch (error) {
      console.error('Compilation error:', error);
      setCompileSuccess(false);
      setCompileOutput(`Error: ${error instanceof Error ? error.message : 'Unknown compilation error'}`);
      toast.error('Compilation failed');
    } finally {
      setIsCompiling(false);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectId || 'circuit'}_code.ino`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Code downloaded');
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-2 border-b">
        <h3 className="text-sm font-medium">Arduino Code</h3>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleDownload}
          >
            <Download className="h-4 w-4 mr-1" />
            Download
          </Button>
          <Button 
            size="sm"
            onClick={handleCompile}
            disabled={isCompiling || !code.trim()}
          >
            <Play className="h-4 w-4 mr-1" />
            {isCompiling ? 'Compiling...' : 'Compile'}
          </Button>
        </div>
      </div>
      
      <div className="flex-grow p-2 bg-gray-50 overflow-hidden flex flex-col">
        <Textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="flex-grow font-mono text-sm p-2 resize-none h-full border bg-background"
          placeholder="// Write your Arduino code here"
        />
      </div>
      
      {compileOutput && (
        <div className="p-2 border-t">
          <Alert variant={compileSuccess ? "default" : "destructive"}>
            <AlertTitle>{compileSuccess ? 'Compilation Successful' : 'Compilation Failed'}</AlertTitle>
            <AlertDescription className="font-mono text-xs whitespace-pre-wrap max-h-32 overflow-y-auto">
              {compileOutput}
            </AlertDescription>
          </Alert>
        </div>
      )}
    </div>
  );
};

export default CodeEditor;
