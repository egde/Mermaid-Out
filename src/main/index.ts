import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  Menu,
  shell,
  type MenuItemConstructorOptions,
} from 'electron';
import { join } from 'node:path';
import { registerIpcHandlers } from './ipc';
import type { MenuEvent } from '../types/api';

const isMac = process.platform === 'darwin';
let mainWindow: BrowserWindow | null = null;
let allowClose = false;
let pendingCloseSave = false;

function sendMenuEvent(event: MenuEvent) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('menu:event', event);
  }
}

function buildMenu() {
  const fileSubmenu: MenuItemConstructorOptions[] = [
    { label: 'New', accelerator: 'CmdOrCtrl+N', click: () => sendMenuEvent({ type: 'new' }) },
    { label: 'Open…', accelerator: 'CmdOrCtrl+O', click: () => sendMenuEvent({ type: 'open' }) },
    { type: 'separator' },
    { label: 'Save', accelerator: 'CmdOrCtrl+S', click: () => sendMenuEvent({ type: 'save' }) },
    { label: 'Save As…', accelerator: 'CmdOrCtrl+Shift+S', click: () => sendMenuEvent({ type: 'save-as' }) },
    { type: 'separator' },
    { label: 'Export SVG…', accelerator: 'CmdOrCtrl+E', click: () => sendMenuEvent({ type: 'export-svg' }) },
    { type: 'separator' },
    isMac ? { role: 'close' } : { role: 'quit' },
  ];

  const template: MenuItemConstructorOptions[] = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about' as const },
              { type: 'separator' as const },
              { role: 'services' as const },
              { type: 'separator' as const },
              { role: 'hide' as const },
              { role: 'hideOthers' as const },
              { role: 'unhide' as const },
              { type: 'separator' as const },
              { role: 'quit' as const },
            ],
          } as MenuItemConstructorOptions,
        ]
      : []),
    { label: 'File', submenu: fileSubmenu },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    { role: 'windowMenu' },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 720,
    minHeight: 480,
    show: false,
    backgroundColor: '#FFFFFF',
    titleBarStyle: isMac ? 'hiddenInset' : 'default',
    title: 'Mermaid-Out',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.once('ready-to-show', () => mainWindow?.show());

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: 'deny' };
  });

  const devUrl = process.env['ELECTRON_RENDERER_URL'];
  if (devUrl) {
    mainWindow.loadURL(devUrl);
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('close', (e) => {
    if (allowClose || !ipc.isDirty() || !mainWindow) return;
    e.preventDefault();
    const choice = dialog.showMessageBoxSync(mainWindow, {
      type: 'warning',
      buttons: ['Save', 'Discard', 'Cancel'],
      defaultId: 0,
      cancelId: 2,
      title: 'Unsaved changes',
      message: 'You have unsaved changes.',
      detail: 'Save your changes before closing?',
    });
    if (choice === 1) {
      allowClose = true;
      mainWindow.close();
    } else if (choice === 0) {
      pendingCloseSave = true;
      sendMenuEvent({ type: 'save' });
      // Renderer sends window:saved once the save completes successfully.
    }
    // choice === 2 → cancel, stay open
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

const ipc = (() => {
  let handlers: ReturnType<typeof registerIpcHandlers> | null = null;
  return {
    init() {
      handlers = registerIpcHandlers(() => mainWindow);
      ipcMain.on('window:saved', () => {
        if (mainWindow && pendingCloseSave) {
          pendingCloseSave = false;
          allowClose = true;
          mainWindow.close();
        }
      });
    },
    isDirty() {
      return handlers?.isDirty() ?? false;
    },
  };
})();

app.whenReady().then(() => {
  ipc.init();
  buildMenu();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (!isMac) app.quit();
});
