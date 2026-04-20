import { useCallback, useEffect, useRef, useState } from 'react';
import type { MermaidFile } from '../../../types/api';

export interface FileState {
  file: MermaidFile | null;
  content: string;
  dirty: boolean;
  displayName: string;
}

export const DEFAULT_DIAGRAM = `%% Mermaid-Out — untitled diagram
graph LR
    A[Start] --> B{Decision}
    B -- yes --> C[Continue]
    B -- no --> D[Stop]
    C --> E((End))
    D --> E
`;

export function basename(path: string): string {
  const norm = path.replace(/\\/g, '/');
  const idx = norm.lastIndexOf('/');
  return idx === -1 ? norm : norm.slice(idx + 1);
}

export function useFileState(initialContent = DEFAULT_DIAGRAM) {
  const [content, setContent] = useState(initialContent);
  const [file, setFile] = useState<MermaidFile | null>(null);
  const [savedContent, setSavedContent] = useState(initialContent);

  const dirty = content !== savedContent;
  const displayName = file ? basename(file.path) : 'untitled.mmd';

  const dirtyRef = useRef(dirty);
  useEffect(() => {
    dirtyRef.current = dirty;
    window.api.setDirty(dirty);
  }, [dirty]);

  const loadFile = useCallback((next: MermaidFile) => {
    setFile(next);
    setContent(next.content);
    setSavedContent(next.content);
  }, []);

  const markSaved = useCallback((path: string, savedText: string) => {
    setFile({ path, content: savedText });
    setSavedContent(savedText);
  }, []);

  const reset = useCallback((text = DEFAULT_DIAGRAM) => {
    setFile(null);
    setContent(text);
    setSavedContent(text);
  }, []);

  const state: FileState = { file, content, dirty, displayName };

  return {
    state,
    content,
    setContent,
    loadFile,
    markSaved,
    reset,
    isDirtyNow: () => dirtyRef.current,
  };
}
