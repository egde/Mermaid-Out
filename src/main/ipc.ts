import { BrowserWindow, dialog, ipcMain } from 'electron';
import { promises as fs } from 'node:fs';
import { basename, join, relative, sep } from 'node:path';
import type {
  ConfirmCloseResult,
  FolderListing,
  MermaidFileEntry,
  OpenResult,
  SaveResult,
} from '../types/api';

const MERMAID_FILTERS = [
  { name: 'Mermaid', extensions: ['mmd', 'mermaid'] },
  { name: 'All Files', extensions: ['*'] },
];

const SVG_FILTERS = [{ name: 'SVG', extensions: ['svg'] }];
const PNG_FILTERS = [{ name: 'PNG', extensions: ['png'] }];

const MERMAID_EXTS = /\.(mmd|mermaid)$/i;
const SKIP_DIRS = new Set(['node_modules', '.git', 'out', 'dist', 'release', '.venv', '__pycache__']);
const MAX_WALK_ENTRIES = 2000;

async function walkMermaidFiles(
  root: string,
): Promise<MermaidFileEntry[]> {
  const out: MermaidFileEntry[] = [];
  const queue: string[] = [root];
  while (queue.length > 0 && out.length < MAX_WALK_ENTRIES) {
    const dir = queue.shift()!;
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) continue;
        queue.push(full);
      } else if (entry.isFile() && MERMAID_EXTS.test(entry.name)) {
        const rel = relative(root, full).split(sep).join('/');
        out.push({ path: full, relativePath: rel, name: entry.name });
      }
    }
  }
  out.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  return out;
}

export function registerIpcHandlers(getWindow: () => BrowserWindow | null) {
  ipcMain.handle('file:open', async (): Promise<OpenResult> => {
    const win = getWindow();
    const result = await dialog.showOpenDialog(win ?? undefined!, {
      title: 'Open mermaid diagram',
      filters: MERMAID_FILTERS,
      properties: ['openFile'],
    });
    if (result.canceled || result.filePaths.length === 0) {
      return { canceled: true };
    }
    const path = result.filePaths[0];
    try {
      const content = await fs.readFile(path, 'utf-8');
      return { canceled: false, file: { path, content } };
    } catch (err) {
      return { canceled: false, error: (err as Error).message };
    }
  });

  ipcMain.handle(
    'file:save',
    async (_e, path: string, content: string): Promise<SaveResult> => {
      try {
        await fs.writeFile(path, content, 'utf-8');
        return { canceled: false, path };
      } catch (err) {
        return { canceled: false, error: (err as Error).message };
      }
    },
  );

  ipcMain.handle(
    'file:saveAs',
    async (
      _e,
      suggestedName: string,
      content: string,
    ): Promise<SaveResult> => {
      const win = getWindow();
      const result = await dialog.showSaveDialog(win ?? undefined!, {
        title: 'Save mermaid diagram',
        defaultPath: suggestedName || 'diagram.mmd',
        filters: MERMAID_FILTERS,
      });
      if (result.canceled || !result.filePath) {
        return { canceled: true };
      }
      try {
        await fs.writeFile(result.filePath, content, 'utf-8');
        return { canceled: false, path: result.filePath };
      } catch (err) {
        return { canceled: false, error: (err as Error).message };
      }
    },
  );

  ipcMain.handle(
    'file:exportSvg',
    async (
      _e,
      suggestedName: string,
      svg: string,
    ): Promise<SaveResult> => {
      const win = getWindow();
      const result = await dialog.showSaveDialog(win ?? undefined!, {
        title: 'Export diagram as SVG',
        defaultPath: suggestedName || 'diagram.svg',
        filters: SVG_FILTERS,
      });
      if (result.canceled || !result.filePath) {
        return { canceled: true };
      }
      try {
        await fs.writeFile(result.filePath, svg, 'utf-8');
        return { canceled: false, path: result.filePath };
      } catch (err) {
        return { canceled: false, error: (err as Error).message };
      }
    },
  );

  ipcMain.handle(
    'dialog:confirmDiscard',
    async (_e, fileLabel: string): Promise<ConfirmCloseResult> => {
      const win = getWindow();
      const label = fileLabel || 'Untitled';
      const result = await dialog.showMessageBox(win ?? undefined!, {
        type: 'warning',
        buttons: ['Save', 'Discard', 'Cancel'],
        defaultId: 0,
        cancelId: 2,
        title: 'Unsaved changes',
        message: `${basename(label)} has unsaved changes.`,
        detail: 'Do you want to save your changes before continuing?',
      });
      const map: ConfirmCloseResult['action'][] = ['save', 'discard', 'cancel'];
      return { action: map[result.response] ?? 'cancel' };
    },
  );

  ipcMain.handle(
    'file:exportPng',
    async (
      _e,
      suggestedName: string,
      bytes: Uint8Array,
    ): Promise<SaveResult> => {
      const win = getWindow();
      const result = await dialog.showSaveDialog(win ?? undefined!, {
        title: 'Export diagram as PNG',
        defaultPath: suggestedName || 'diagram.png',
        filters: PNG_FILTERS,
      });
      if (result.canceled || !result.filePath) {
        return { canceled: true };
      }
      try {
        await fs.writeFile(result.filePath, Buffer.from(bytes));
        return { canceled: false, path: result.filePath };
      } catch (err) {
        return { canceled: false, error: (err as Error).message };
      }
    },
  );

  ipcMain.handle(
    'folder:pick',
    async (): Promise<FolderListing | { canceled: true }> => {
      const win = getWindow();
      const result = await dialog.showOpenDialog(win ?? undefined!, {
        title: 'Open folder',
        properties: ['openDirectory'],
      });
      if (result.canceled || result.filePaths.length === 0) {
        return { canceled: true };
      }
      const root = result.filePaths[0];
      const files = await walkMermaidFiles(root);
      return { canceled: false, root, files };
    },
  );

  ipcMain.handle(
    'folder:list',
    async (_e, root: string): Promise<FolderListing> => {
      try {
        await fs.access(root);
      } catch {
        return { canceled: false, root, files: [], error: 'Folder not found' };
      }
      const files = await walkMermaidFiles(root);
      return { canceled: false, root, files };
    },
  );

  ipcMain.handle(
    'file:read',
    async (_e, path: string): Promise<OpenResult> => {
      try {
        const content = await fs.readFile(path, 'utf-8');
        return { canceled: false, file: { path, content } };
      } catch (err) {
        return { canceled: false, error: (err as Error).message };
      }
    },
  );

  let dirty = false;
  ipcMain.on('window:setDirty', (_e, isDirty: boolean) => {
    dirty = isDirty;
  });
  return {
    isDirty: () => dirty,
  };
}
