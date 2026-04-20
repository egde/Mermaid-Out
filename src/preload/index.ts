import { contextBridge, ipcRenderer } from 'electron';
import type { MenuEvent, MermaidOutApi } from '../types/api';

const api: MermaidOutApi = {
  file: {
    open: () => ipcRenderer.invoke('file:open'),
    read: (path) => ipcRenderer.invoke('file:read', path),
    save: (path, content) => ipcRenderer.invoke('file:save', path, content),
    saveAs: (suggestedName, content) =>
      ipcRenderer.invoke('file:saveAs', suggestedName, content),
    exportSvg: (suggestedName, svg) =>
      ipcRenderer.invoke('file:exportSvg', suggestedName, svg),
    exportPng: (suggestedName, bytes) =>
      ipcRenderer.invoke('file:exportPng', suggestedName, bytes),
  },
  folder: {
    pick: () => ipcRenderer.invoke('folder:pick'),
    list: (root) => ipcRenderer.invoke('folder:list', root),
  },
  dialog: {
    confirmDiscard: (label) =>
      ipcRenderer.invoke('dialog:confirmDiscard', label),
  },
  onMenuEvent: (listener) => {
    const handler = (_: unknown, event: MenuEvent) => listener(event);
    ipcRenderer.on('menu:event', handler);
    return () => ipcRenderer.off('menu:event', handler);
  },
  setDirty: (isDirty) => {
    ipcRenderer.send('window:setDirty', isDirty);
  },
  notifySaved: () => {
    ipcRenderer.send('window:saved');
  },
  platform: process.platform,
};

contextBridge.exposeInMainWorld('api', api);
