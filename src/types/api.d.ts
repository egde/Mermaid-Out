export interface MermaidFile {
  path: string;
  content: string;
}

export interface OpenResult {
  canceled: boolean;
  file?: MermaidFile;
  error?: string;
}

export interface SaveResult {
  canceled: boolean;
  path?: string;
  error?: string;
}

export interface ConfirmCloseResult {
  action: 'save' | 'discard' | 'cancel';
}

export type MenuEvent =
  | { type: 'new' }
  | { type: 'open' }
  | { type: 'save' }
  | { type: 'save-as' }
  | { type: 'export-svg' };

export interface MermaidOutApi {
  file: {
    open(): Promise<OpenResult>;
    save(path: string, content: string): Promise<SaveResult>;
    saveAs(suggestedName: string, content: string): Promise<SaveResult>;
    exportSvg(suggestedName: string, svg: string): Promise<SaveResult>;
  };
  dialog: {
    confirmDiscard(fileLabel: string): Promise<ConfirmCloseResult>;
  };
  onMenuEvent(listener: (event: MenuEvent) => void): () => void;
  setDirty(isDirty: boolean): void;
  notifySaved(): void;
  platform: NodeJS.Platform;
}

declare global {
  interface Window {
    api: MermaidOutApi;
  }
}
