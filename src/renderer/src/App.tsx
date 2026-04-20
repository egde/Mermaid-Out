import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { TopBar } from './components/TopBar';
import { Editor } from './components/Editor';
import { Preview } from './components/Preview';
import { Divider } from './components/Divider';
import { StatusBar } from './components/StatusBar';
import { Sidebar } from './components/Sidebar';
import { useFileState, basename } from './lib/file-state';
import { svgStringToPngBytes } from './lib/svg-to-png';
import { finalizeSvgForExport } from './lib/mermaid-runtime';
import type {
  MenuEvent,
  MermaidFileEntry,
} from '../../types/api';

const MIN_PANE_PX = 280;
const LS_SIDEBAR_OPEN = 'mermaid-out:sidebar:open';
const LS_FOLDER_ROOT = 'mermaid-out:folder:root';

function readBool(key: string, fallback: boolean): boolean {
  try {
    const v = localStorage.getItem(key);
    if (v === null) return fallback;
    return v === '1';
  } catch {
    return fallback;
  }
}

export default function App() {
  const {
    state: fileState,
    content,
    setContent,
    loadFile,
    markSaved,
    reset,
    isDirtyNow,
  } = useFileState();

  const [splitPx, setSplitPx] = useState<number | null>(null);
  const [status, setStatus] = useState<'ok' | 'warn' | 'empty'>('empty');
  const lastSvgRef = useRef<string | null>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);

  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() =>
    readBool(LS_SIDEBAR_OPEN, true),
  );
  const [folderRoot, setFolderRoot] = useState<string | null>(() => {
    try {
      return localStorage.getItem(LS_FOLDER_ROOT);
    } catch {
      return null;
    }
  });
  const [folderFiles, setFolderFiles] = useState<MermaidFileEntry[]>([]);
  const [folderBusy, setFolderBusy] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(LS_SIDEBAR_OPEN, sidebarOpen ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [sidebarOpen]);

  useEffect(() => {
    try {
      if (folderRoot) localStorage.setItem(LS_FOLDER_ROOT, folderRoot);
      else localStorage.removeItem(LS_FOLDER_ROOT);
    } catch {
      /* ignore */
    }
  }, [folderRoot]);

  useEffect(() => {
    if (!folderRoot) return;
    let cancelled = false;
    setFolderBusy(true);
    window.api.folder.list(folderRoot).then((listing) => {
      if (cancelled) return;
      setFolderFiles(listing.files);
      setFolderBusy(false);
    });
    return () => {
      cancelled = true;
    };
  }, [folderRoot]);

  const suggestedName = fileState.file
    ? basename(fileState.file.path)
    : 'untitled.mmd';

  const confirmDiscardIfDirty = useCallback(async (): Promise<boolean> => {
    if (!isDirtyNow()) return true;
    const label = fileState.file?.path ?? 'Untitled';
    const result = await window.api.dialog.confirmDiscard(label);
    if (result.action === 'cancel') return false;
    if (result.action === 'discard') return true;
    const saved = await handleSave();
    return saved;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileState.file, isDirtyNow]);

  const handleNew = useCallback(async () => {
    const ok = await confirmDiscardIfDirty();
    if (!ok) return;
    reset();
  }, [confirmDiscardIfDirty, reset]);

  const handleOpen = useCallback(async () => {
    const ok = await confirmDiscardIfDirty();
    if (!ok) return;
    const result = await window.api.file.open();
    if (result.canceled) return;
    if (result.error) {
      alert(`Could not open file: ${result.error}`);
      return;
    }
    if (result.file) loadFile(result.file);
  }, [confirmDiscardIfDirty, loadFile]);

  const handleSave = useCallback(async (): Promise<boolean> => {
    if (!fileState.file) {
      return handleSaveAs();
    }
    const result = await window.api.file.save(fileState.file.path, content);
    if (result.canceled) return false;
    if (result.error) {
      alert(`Could not save file: ${result.error}`);
      return false;
    }
    if (result.path) {
      markSaved(result.path, content);
      window.api.notifySaved();
      if (folderRoot) {
        const listing = await window.api.folder.list(folderRoot);
        setFolderFiles(listing.files);
      }
      return true;
    }
    return false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileState.file, content, markSaved, folderRoot]);

  const handleSaveAs = useCallback(async (): Promise<boolean> => {
    const result = await window.api.file.saveAs(suggestedName, content);
    if (result.canceled) return false;
    if (result.error) {
      alert(`Could not save file: ${result.error}`);
      return false;
    }
    if (result.path) {
      markSaved(result.path, content);
      window.api.notifySaved();
      if (folderRoot) {
        const listing = await window.api.folder.list(folderRoot);
        setFolderFiles(listing.files);
      }
      return true;
    }
    return false;
  }, [content, suggestedName, markSaved, folderRoot]);

  const handleExportSvg = useCallback(async () => {
    const svg = lastSvgRef.current;
    if (!svg) {
      alert('Nothing to export — the preview has no rendered diagram yet.');
      return;
    }
    const finalized = finalizeSvgForExport(svg);
    const target = suggestedName.replace(/\.(mmd|mermaid)$/i, '') + '.svg';
    const result = await window.api.file.exportSvg(target, finalized);
    if (result.error) {
      alert(`Could not export SVG: ${result.error}`);
    }
  }, [suggestedName]);

  const handleExportPng = useCallback(async () => {
    const svg = lastSvgRef.current;
    if (!svg) {
      alert('Nothing to export — the preview has no rendered diagram yet.');
      return;
    }
    try {
      const finalized = finalizeSvgForExport(svg);
      const bytes = await svgStringToPngBytes(finalized);
      const target = suggestedName.replace(/\.(mmd|mermaid)$/i, '') + '.png';
      const result = await window.api.file.exportPng(target, bytes);
      if (result.error) {
        alert(`Could not export PNG: ${result.error}`);
      }
    } catch (err) {
      alert(`Could not export PNG: ${(err as Error).message}`);
    }
  }, [suggestedName]);

  const handleToggleSidebar = useCallback(() => {
    setSidebarOpen((v) => !v);
  }, []);

  const handlePickFolder = useCallback(async () => {
    const result = await window.api.folder.pick();
    if (result.canceled) return;
    setFolderRoot(result.root);
    setFolderFiles(result.files);
  }, []);

  const handleRefreshFolder = useCallback(async () => {
    if (!folderRoot) return;
    setFolderBusy(true);
    const listing = await window.api.folder.list(folderRoot);
    setFolderFiles(listing.files);
    setFolderBusy(false);
  }, [folderRoot]);

  const handleSelectFile = useCallback(
    async (entry: MermaidFileEntry) => {
      if (fileState.file?.path === entry.path) return;
      const ok = await confirmDiscardIfDirty();
      if (!ok) return;
      const result = await window.api.file.read(entry.path);
      if (result.error) {
        alert(`Could not open file: ${result.error}`);
        return;
      }
      if (result.file) loadFile(result.file);
    },
    [confirmDiscardIfDirty, loadFile, fileState.file?.path],
  );

  useEffect(() => {
    const off = window.api.onMenuEvent((event: MenuEvent) => {
      switch (event.type) {
        case 'new':
          void handleNew();
          return;
        case 'open':
          void handleOpen();
          return;
        case 'save':
          void handleSave();
          return;
        case 'save-as':
          void handleSaveAs();
          return;
        case 'export-svg':
          void handleExportSvg();
          return;
        case 'export-png':
          void handleExportPng();
          return;
        case 'toggle-sidebar':
          handleToggleSidebar();
          return;
      }
    });
    return off;
  }, [
    handleNew,
    handleOpen,
    handleSave,
    handleSaveAs,
    handleExportSvg,
    handleExportPng,
    handleToggleSidebar,
  ]);

  const handlePreviewRendered = useCallback((svg: string | null) => {
    lastSvgRef.current = svg;
  }, []);

  const splitStyle: React.CSSProperties = {};
  if (splitPx !== null) {
    splitStyle.gridTemplateColumns = `${splitPx}px 1px 1fr`;
  }

  const handleDrag = useCallback((delta: number) => {
    const rect = workspaceRef.current?.getBoundingClientRect();
    if (!rect) return;
    setSplitPx((prev) => {
      const current = prev ?? rect.width / 2;
      const next = current + delta;
      const min = MIN_PANE_PX;
      const max = Math.max(MIN_PANE_PX, rect.width - MIN_PANE_PX - 1);
      return Math.min(max, Math.max(min, next));
    });
  }, []);

  const lines = content.split('\n').length;
  const chip = useMemo(
    () =>
      status === 'ok'
        ? { cls: 'chip chip--ok', label: 'OK' }
        : status === 'warn'
          ? { cls: 'chip chip--warn', label: 'Syntax error' }
          : { cls: 'chip', label: 'Idle' },
    [status],
  );

  return (
    <div className={`app${sidebarOpen ? '' : ' app--no-sidebar'}`}>
      <TopBar
        docName={fileState.displayName}
        dirty={fileState.dirty}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={handleToggleSidebar}
        onNew={handleNew}
        onOpen={handleOpen}
        onSave={handleSave}
        onSaveAs={handleSaveAs}
        onExportSvg={handleExportSvg}
        onExportPng={handleExportPng}
      />
      <div className="shell">
        {sidebarOpen && (
          <Sidebar
            root={folderRoot}
            files={folderFiles}
            activePath={fileState.file?.path ?? null}
            busy={folderBusy}
            onPickFolder={handlePickFolder}
            onRefresh={handleRefreshFolder}
            onSelect={handleSelectFile}
            onClose={handleToggleSidebar}
          />
        )}
        <div className="workspace" ref={workspaceRef} style={splitStyle}>
          <section className="pane">
            <div className="pane__header">
              <span className="pane__eyebrow">Source</span>
              <span className="pane__eyebrow">Mermaid</span>
            </div>
            <div className="pane__body">
              <Editor value={content} onChange={setContent} />
            </div>
          </section>
          <Divider onDrag={handleDrag} />
          <section className="pane">
            <div className="pane__header">
              <span className="pane__eyebrow">Preview</span>
              <span className="pane__headerchip">
                <span className={chip.cls}>{chip.label}</span>
              </span>
            </div>
            <div className="pane__body">
              <Preview
                source={content}
                onRendered={handlePreviewRendered}
                onStatusChange={setStatus}
              />
            </div>
          </section>
        </div>
      </div>
      <StatusBar
        path={fileState.file?.path ?? null}
        lines={lines}
        status={status}
      />
    </div>
  );
}
