import { BrowserWindow, dialog, ipcMain } from 'electron';
import { promises as fs } from 'node:fs';
import { basename } from 'node:path';
import type {
  ConfirmCloseResult,
  OpenResult,
  SaveResult,
} from '../types/api';

const MERMAID_FILTERS = [
  { name: 'Mermaid', extensions: ['mmd', 'mermaid'] },
  { name: 'All Files', extensions: ['*'] },
];

const SVG_FILTERS = [{ name: 'SVG', extensions: ['svg'] }];

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

  let dirty = false;
  ipcMain.on('window:setDirty', (_e, isDirty: boolean) => {
    dirty = isDirty;
  });
  return {
    isDirty: () => dirty,
  };
}
