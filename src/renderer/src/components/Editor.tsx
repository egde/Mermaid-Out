import { Editor as MonacoEditor, type OnMount } from '@monaco-editor/react';
import { useCallback } from 'react';
import {
  MERMAID_LANGUAGE_ID,
  MERMAID_THEME_ID,
  registerMermaidLanguage,
} from '../lib/mermaid-language';

interface Props {
  value: string;
  onChange: (value: string) => void;
}

export function Editor({ value, onChange }: Props) {
  const handleMount: OnMount = useCallback((_editor, monaco) => {
    registerMermaidLanguage(monaco);
    monaco.editor.setTheme(MERMAID_THEME_ID);
  }, []);

  return (
    <div className="editor">
      <MonacoEditor
        language={MERMAID_LANGUAGE_ID}
        theme={MERMAID_THEME_ID}
        value={value}
        onMount={handleMount}
        beforeMount={(monaco) => registerMermaidLanguage(monaco)}
        onChange={(next) => onChange(next ?? '')}
        options={{
          fontFamily:
            "'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, Consolas, monospace",
          fontSize: 13,
          fontLigatures: true,
          lineNumbers: 'on',
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          wordWrap: 'on',
          tabSize: 2,
          insertSpaces: true,
          automaticLayout: true,
          renderLineHighlight: 'line',
          renderWhitespace: 'none',
          smoothScrolling: true,
          scrollbar: {
            verticalScrollbarSize: 10,
            horizontalScrollbarSize: 10,
          },
          padding: { top: 12, bottom: 12 },
          guides: { indentation: true },
          cursorBlinking: 'solid',
        }}
      />
    </div>
  );
}
