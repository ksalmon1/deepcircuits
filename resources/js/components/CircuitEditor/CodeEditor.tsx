import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Save, Check, Loader2 } from 'lucide-react';
import Editor from '@monaco-editor/react';
import { editor } from 'monaco-editor';

interface CodeEditorProps {
  code: string;
  onChange: (value: string) => void;
  onCompile?: (code: string) => Promise<void>;
  onSave?: () => Promise<boolean>;
  isModified?: boolean;
  isSaving?: boolean;
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
};

const CodeEditor: React.FC<CodeEditorProps> = ({ code, onChange, onCompile, onSave, isModified, isSaving }) => {
  const [isCompiling, setIsCompiling] = useState(false);

  const handleEditorChange = useCallback((value: string | undefined) => {
    onChange(value ?? '');
  }, [onChange]);

  const handleCompile = useCallback(async () => {
    if (!onCompile || !code) return;
    setIsCompiling(true);
    try {
      await onCompile(code);
    } catch (error) {
      console.error('Compilation error:', error);
    } finally {
      setIsCompiling(false);
    }
  }, [onCompile, code]);

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <div className="px-2 py-1.5 border-b flex justify-between items-center bg-gray-100">
        <div className="flex items-center gap-2 min-w-0">
          <h3 className="font-medium text-sm text-gray-800 truncate">Arduino Code (C++)</h3>
          {isModified && (
            <span className="flex items-center gap-1 text-xs text-amber-600 shrink-0">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden="true" />
              Unsaved
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {onSave && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => void onSave()}
              disabled={!isModified || isSaving}
              title="Save project (Ctrl+S)"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : isModified ? (
                <Save className="h-4 w-4 mr-1" />
              ) : (
                <Check className="h-4 w-4 mr-1" />
              )}
              {isSaving ? 'Saving...' : isModified ? 'Save' : 'Saved'}
            </Button>
          )}
          {onCompile && (
            <Button
              size="sm"
              onClick={handleCompile}
              disabled={isCompiling || !code}
            >
              <Play className="h-4 w-4 mr-1" />
              {isCompiling ? 'Compiling...' : 'Compile & Run'}
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative">
        <Editor
          height="100%"
          language="cpp"
          theme="vs-dark"
          value={code}
          onChange={handleEditorChange}
          options={editorOptions}
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
