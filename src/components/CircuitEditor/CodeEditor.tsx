
import React from 'react';

export interface CodeEditorProps {
  code: string;
  onChange: (code: string) => void;
}

const CodeEditor: React.FC<CodeEditorProps> = ({ code, onChange }) => {
  return (
    <div className="h-full w-full p-2 bg-slate-50 rounded">
      <textarea
        className="w-full h-full p-4 font-mono text-sm bg-white border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        value={code}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Enter your code here..."
      />
    </div>
  );
};

export default CodeEditor;
