import { BrowserWindow, dialog, ipcMain } from 'electron';
import { promises as fs } from 'node:fs';
import { basename, extname, join, relative, sep } from 'node:path';
import type {
  ConfirmCloseResult,
  FileEntry,
  FileKind,
  FolderListing,
  OpenResult,
  ReadBinaryResult,
  SaveResult,
} from '../types/api';

const MERMAID_FILTERS = [
  { name: 'Mermaid', extensions: ['mmd', 'mermaid'] },
  { name: 'All Files', extensions: ['*'] },
];

const SVG_FILTERS = [{ name: 'SVG', extensions: ['svg'] }];
const PNG_FILTERS = [{ name: 'PNG', extensions: ['png'] }];

const TRACKED_EXTS = /\.(mmd|mermaid|png|svg)$/i;
const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  'out',
  'dist',
  'release',
  '.venv',
  '__pycache__',
]);
const MAX_WALK_ENTRIES = 4000;

function kindFromName(name: string): FileKind {
  const ext = extname(name).toLowerCase();
  if (ext === '.png') return 'png';
  if (ext === '.svg') return 'svg';
  return 'mermaid';
}

async function walkTrackedFiles(root: string): Promise<FileEntry[]> {
  const out: FileEntry[] = [];
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
      } else if (entry.isFile() && TRACKED_EXTS.test(entry.name)) {
        const rel = relative(root, full).split(sep).join('/');
        out.push({
          path: full,
          relativePath: rel,
          name: entry.name,
          kind: kindFromName(entry.name),
        });
      }
    }
  }
  out.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  return out;
}

async function renderSvgToPng(
  svg: string,
  width: number,
  height: number,
  scale: number,
): Promise<Buffer> {
  const w = Math.max(1, Math.ceil(width * scale));
  const h = Math.max(1, Math.ceil(height * scale));

  const off = new BrowserWindow({
    show: false,
    width: w,
    height: h,
    useContentSize: true,
    transparent: false,
    backgroundColor: '#FFFFFF',
    webPreferences: {
      offscreen: true,
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      javascript: true,
    },
  });

  try {
    const html = `<!doctype html><html><head><meta charset="utf-8"/><style>
html,body{margin:0;padding:0;background:#fff;}
svg{display:block;width:${w}px;height:${h}px;}
</style></head><body>${svg}</body></html>`;
    await off.loadURL(
      'data:text/html;charset=utf-8,' + encodeURIComponent(html),
    );
    // Give fonts and <foreignObject> a frame to lay out.
    await new Promise((resolve) => setTimeout(resolve, 80));
    const image = await off.webContents.capturePage();
    return image.toPNG();
  } finally {
    off.destroy();
  }
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
      svg: string,
      width: number,
      height: number,
      scale: number,
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
        const bytes = await renderSvgToPng(svg, width, height, scale);
        await fs.writeFile(result.filePath, bytes);
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
      const files = await walkTrackedFiles(root);
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
      const files = await walkTrackedFiles(root);
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

  ipcMain.handle(
    'file:readBinary',
    async (_e, path: string): Promise<ReadBinaryResult> => {
      try {
        const buf = await fs.readFile(path);
        return { bytes: new Uint8Array(buf) };
      } catch (err) {
        return { error: (err as Error).message };
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
