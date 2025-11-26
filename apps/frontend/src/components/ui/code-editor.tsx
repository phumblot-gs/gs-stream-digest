'use client';

import { useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import type { editor } from 'monaco-editor';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: string;
  height?: string;
  placeholder?: string;
  error?: string | null;
  className?: string;
}

export function CodeEditor({
  value,
  onChange,
  language = 'html',
  height = '600px',
  placeholder,
  error,
  className = '',
}: CodeEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<any>(null);

  // Parse error message to extract line number
  const parseErrorLine = (errorMsg: string | null): number | null => {
    if (!errorMsg) return null;
    
    // Try to extract line number from error message
    // Format: "tag {% for event in events %} not closed, line:4, col:1"
    const lineMatch = errorMsg.match(/line[:\s]+(\d+)/i);
    if (lineMatch) {
      return parseInt(lineMatch[1], 10);
    }
    
    // Try alternative format: "line 4"
    const altMatch = errorMsg.match(/line\s+(\d+)/i);
    if (altMatch) {
      return parseInt(altMatch[1], 10);
    }
    
    return null;
  };

  useEffect(() => {
    if (!editorRef.current || !monacoRef.current || !error) return;

    const lineNumber = parseErrorLine(error);
    if (lineNumber === null) return;

    const model = editorRef.current.getModel();
    if (!model) return;

    const monaco = monacoRef.current;

    // Clear existing markers
    monaco.editor.setModelMarkers(model, 'liquid-validation', []);

    // Add error marker
    const markers: editor.IMarkerData[] = [
      {
        startLineNumber: lineNumber,
        startColumn: 1,
        endLineNumber: lineNumber,
        endColumn: model.getLineMaxColumn(lineNumber),
        message: error,
        severity: monaco.MarkerSeverity.Error,
      },
    ];

    monaco.editor.setModelMarkers(model, 'liquid-validation', markers);

    // Scroll to error line
    editorRef.current.revealLineInCenter(lineNumber);
  }, [error]);

  const handleEditorDidMount = (editorInstance: editor.IStandaloneCodeEditor, monaco: any) => {
    editorRef.current = editorInstance;
    monacoRef.current = monaco;
  };

  return (
    <div className={`border rounded-md overflow-hidden ${className}`}>
      <Editor
        height={height}
        language={language}
        value={value}
        onChange={(val) => onChange(val || '')}
        onMount={handleEditorDidMount}
        theme="vs-dark"
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          wordWrap: 'on',
          formatOnPaste: true,
          formatOnType: true,
          placeholder: placeholder,
        }}
      />
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border-t border-red-200 dark:border-red-800 px-4 py-2 text-sm text-red-600 dark:text-red-400">
          <strong>Erreur:</strong> {error}
        </div>
      )}
    </div>
  );
}

