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

export type FileKind = 'mermaid' | 'png' | 'svg';

export interface FileEntry {
  path: string;
  relativePath: string;
  name: string;
  kind: FileKind;
}

/** @deprecated — use FileEntry instead. */
export type MermaidFileEntry = FileEntry;

export interface FolderListing {
  canceled: false;
  root: string;
  files: FileEntry[];
  error?: string;
}

export type PickFolderResult = FolderListing | { canceled: true };

export interface ReadBinaryResult {
  bytes?: Uint8Array;
  error?: string;
}

export type MenuEvent =
  | { type: 'new' }
  | { type: 'open' }
  | { type: 'save' }
  | { type: 'save-as' }
  | { type: 'export-svg' }
  | { type: 'export-png' }
  | { type: 'toggle-sidebar' };

export interface MermaidOutApi {
  file: {
    open(): Promise<OpenResult>;
    read(path: string): Promise<OpenResult>;
    readBinary(path: string): Promise<ReadBinaryResult>;
    save(path: string, content: string): Promise<SaveResult>;
    saveAs(suggestedName: string, content: string): Promise<SaveResult>;
    exportSvg(suggestedName: string, svg: string): Promise<SaveResult>;
    exportPng(
      suggestedName: string,
      svg: string,
      width: number,
      height: number,
      scale: number,
    ): Promise<SaveResult>;
  };
  folder: {
    pick(): Promise<PickFolderResult>;
    list(root: string): Promise<FolderListing>;
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
