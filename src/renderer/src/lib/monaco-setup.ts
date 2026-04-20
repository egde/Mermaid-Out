import * as monaco from 'monaco-editor';
import { loader } from '@monaco-editor/react';
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';

let configured = false;

export function setupMonaco() {
  if (configured) return;
  configured = true;

  // Route all Monaco worker requests through Vite-bundled local workers so
  // nothing is fetched from a CDN at runtime (required for Electron / offline).
  self.MonacoEnvironment = {
    getWorker() {
      return new editorWorker();
    },
  };

  loader.config({ monaco });
}
