import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Save, Clock } from 'lucide-react';
import Editor, { Monaco } from '@monaco-editor/react';
import { editor } from 'monaco-editor';

interface CodeEditorProps {
  code: string;
  onChange: (value: string | undefined) => void;
  onCompile?: (code: string) => Promise<void>;
}

// Memoize editor options to prevent re-renders
const editorOptions: editor.IStandaloneEditorConstructionOptions = {
  minimap: { enabled: false }, // Disable minimap for better performance
  fontSize: 14,
  scrollBeyondLastLine: false,
  wordWrap: 'on',
  automaticLayout: true, // Enable automatic layout to handle container resizing
  renderLineHighlight: 'line',
  hideCursorInOverviewRuler: true,
  renderValidationDecorations: 'editable',
  lineNumbersMinChars: 3,
  glyphMargin: false, // Disable glyph margin for better performance
  folding: false, // Disable code folding for better performance
}

const CodeEditor: React.FC<CodeEditorProps> = ({ code, onChange, onCompile }) => {
  const [isCompiling, setIsCompiling] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [currentCode, setCurrentCode] = useState(code);
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrentCode(code);
    // Update the editor content directly if the editor is already mounted
    if (editorRef.current && editorRef.current.getValue() !== code) {
      editorRef.current.setValue(code);
    }
  }, [code]);

  // Add resize observer to force layout when container size changes
  useEffect(() => {
    if (!containerRef.current || !editorRef.current) return;

    // Create a ResizeObserver to detect changes in the container size
    const resizeObserver = new ResizeObserver(() => {
      if (editorRef.current) {
        // Force the editor to layout on resize
        editorRef.current.layout();
      }
    });

    // Start observing the container
    resizeObserver.observe(containerRef.current);

    // Clean up the observer when the component unmounts
    return () => {
      resizeObserver.disconnect();
    };
  }, []);

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

  const handleSave = useCallback(() => {
    setLastSaved(new Date());
  }, []);

  const handleEditorChange = useCallback((value: string | undefined) => {
    const newCode = value || '';
    setCurrentCode(newCode);
    onChange(newCode);
  }, [onChange]);

  const handleEditorDidMount = useCallback((editor: editor.IStandaloneCodeEditor, monaco: Monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    
    // Trigger layout explicitly after mounting
    setTimeout(() => {
      editor.layout();
      // Add extra resize check after a longer delay to handle slow panel transitions
      setTimeout(() => editor.layout(), 500);
    }, 100);
  }, []);

  // Define buttons with memoization to prevent re-renders
  const saveButton = (
    <Button 
      size="sm" 
      variant="outline" 
      onClick={handleSave}
    >
      <Save className="h-4 w-4 mr-1" />
      Save
    </Button>
  );

  const compileButton = onCompile && (
    <Button 
      size="sm"
      onClick={handleCompile}
      disabled={isCompiling || !currentCode}
    >
      <Play className="h-4 w-4 mr-1" />
      {isCompiling ? 'Compiling...' : 'Compile & Run'}
    </Button>
  );

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
          {saveButton}
          {compileButton}
        </div>
      </div>
      
      <div ref={containerRef} className="flex-1 overflow-hidden relative">
        <Editor
          height="100%"
          language="cpp"
          theme="vs-dark"
          value={currentCode}
          onChange={handleEditorChange}
          options={editorOptions}
          onMount={handleEditorDidMount}
          loading={<div className="p-4 text-center">Loading editor...</div>}
          wrapperProps={{
            className: 'monaco-editor-wrapper h-full',
          }}
        />
      </div>
    </div>
  );
};

export default React.memo(CodeEditor);
