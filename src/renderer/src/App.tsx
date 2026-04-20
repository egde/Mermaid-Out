import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { TopBar } from './components/TopBar';
import { Editor } from './components/Editor';
import { Preview, type ViewingImage } from './components/Preview';
import { Divider } from './components/Divider';
import { StatusBar, type PaneStatus } from './components/StatusBar';
import { Sidebar } from './components/Sidebar';
import { ActivityBar, type ActivityTool } from './components/ActivityBar';
import { useFileState, basename } from './lib/file-state';
import {
  finalizeSvgForExport,
  getExportDimensions,
} from './lib/mermaid-runtime';
import type { FileEntry, MenuEvent } from '../../types/api';

const MIN_PANE_PX = 280;
const LS_ACTIVE_TOOL = 'mermaid-out:activity:tool';
const LS_SIDEBAR_OPEN_LEGACY = 'mermaid-out:sidebar:open';
const LS_FOLDER_ROOT = 'mermaid-out:folder:root';

function readInitialTool(): ActivityTool | null {
  try {
    const raw = localStorage.getItem(LS_ACTIVE_TOOL);
    if (raw === 'files') return 'files';
    if (raw === 'null') return null;
    // Migrate from the old boolean key if present.
    const legacy = localStorage.getItem(LS_SIDEBAR_OPEN_LEGACY);
    if (legacy === '0') return null;
    return 'files';
  } catch {
    return 'files';
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
  const [mermaidStatus, setMermaidStatus] = useState<'ok' | 'warn' | 'empty'>(
    'empty',
  );
  const svgElementRef = useRef<SVGSVGElement | null>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);

  const [activeTool, setActiveTool] = useState<ActivityTool | null>(() =>
    readInitialTool(),
  );
  const [folderRoot, setFolderRoot] = useState<string | null>(() => {
    try {
      return localStorage.getItem(LS_FOLDER_ROOT);
    } catch {
      return null;
    }
  });
  const [folderFiles, setFolderFiles] = useState<FileEntry[]>([]);
  const [folderBusy, setFolderBusy] = useState(false);
  const [viewingImage, setViewingImage] = useState<ViewingImage | null>(null);

  const clearViewingImage = useCallback(() => {
    setViewingImage((prev) => {
      if (prev) URL.revokeObjectURL(prev.blobUrl);
      return null;
    });
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        LS_ACTIVE_TOOL,
        activeTool === null ? 'null' : activeTool,
      );
    } catch {
      /* ignore */
    }
  }, [activeTool]);

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

  // Revoke any outstanding blob URL on unmount.
  useEffect(() => {
    return () => {
      if (viewingImage) URL.revokeObjectURL(viewingImage.blobUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const handleContentChange = useCallback(
    (next: string) => {
      setContent(next);
      if (viewingImage) clearViewingImage();
    },
    [setContent, viewingImage, clearViewingImage],
  );

  const handleNew = useCallback(async () => {
    const ok = await confirmDiscardIfDirty();
    if (!ok) return;
    clearViewingImage();
    reset();
  }, [confirmDiscardIfDirty, reset, clearViewingImage]);

  const handleOpen = useCallback(async () => {
    const ok = await confirmDiscardIfDirty();
    if (!ok) return;
    const result = await window.api.file.open();
    if (result.canceled) return;
    if (result.error) {
      alert(`Could not open file: ${result.error}`);
      return;
    }
    if (result.file) {
      clearViewingImage();
      loadFile(result.file);
    }
  }, [confirmDiscardIfDirty, loadFile, clearViewingImage]);

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
    const el = svgElementRef.current;
    if (!el) {
      alert('Nothing to export — the preview has no rendered diagram yet.');
      return;
    }
    const finalized = finalizeSvgForExport(el);
    const target = suggestedName.replace(/\.(mmd|mermaid)$/i, '') + '.svg';
    const result = await window.api.file.exportSvg(target, finalized);
    if (result.error) {
      alert(`Could not export SVG: ${result.error}`);
    } else if (folderRoot && !result.canceled) {
      const listing = await window.api.folder.list(folderRoot);
      setFolderFiles(listing.files);
    }
  }, [suggestedName, folderRoot]);

  const handleExportPng = useCallback(async () => {
    const el = svgElementRef.current;
    if (!el) {
      alert('Nothing to export — the preview has no rendered diagram yet.');
      return;
    }
    try {
      const finalized = finalizeSvgForExport(el);
      const { width, height } = getExportDimensions(el);
      const target = suggestedName.replace(/\.(mmd|mermaid)$/i, '') + '.png';
      const result = await window.api.file.exportPng(
        target,
        finalized,
        width,
        height,
        2,
      );
      if (result.error) {
        alert(`Could not export PNG: ${result.error}`);
      } else if (folderRoot && !result.canceled) {
        const listing = await window.api.folder.list(folderRoot);
        setFolderFiles(listing.files);
      }
    } catch (err) {
      alert(`Could not export PNG: ${(err as Error).message}`);
    }
  }, [suggestedName, folderRoot]);

  const handleToggleSidebar = useCallback(() => {
    setActiveTool((t) => (t === null ? 'files' : null));
  }, []);

  const handleSelectTool = useCallback((tool: ActivityTool) => {
    setActiveTool((current) => (current === tool ? null : tool));
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
    async (entry: FileEntry) => {
      if (entry.kind === 'mermaid') {
        if (fileState.file?.path === entry.path && !viewingImage) return;
        const ok = await confirmDiscardIfDirty();
        if (!ok) return;
        const result = await window.api.file.read(entry.path);
        if (result.error) {
          alert(`Could not open file: ${result.error}`);
          return;
        }
        if (result.file) {
          clearViewingImage();
          loadFile(result.file);
        }
        return;
      }

      if (entry.kind === 'svg') {
        const result = await window.api.file.read(entry.path);
        if (result.error) {
          alert(`Could not open image: ${result.error}`);
          return;
        }
        if (!result.file) return;
        const blob = new Blob([result.file.content], {
          type: 'image/svg+xml',
        });
        const url = URL.createObjectURL(blob);
        setViewingImage((prev) => {
          if (prev) URL.revokeObjectURL(prev.blobUrl);
          return { kind: 'svg', path: entry.path, blobUrl: url };
        });
        return;
      }

      if (entry.kind === 'png') {
        const result = await window.api.file.readBinary(entry.path);
        if (result.error || !result.bytes) {
          alert(
            `Could not open image: ${result.error ?? 'read returned no bytes'}`,
          );
          return;
        }
        const blob = new Blob([result.bytes as BlobPart], {
          type: 'image/png',
        });
        const url = URL.createObjectURL(blob);
        setViewingImage((prev) => {
          if (prev) URL.revokeObjectURL(prev.blobUrl);
          return { kind: 'png', path: entry.path, blobUrl: url };
        });
        return;
      }
    },
    [
      confirmDiscardIfDirty,
      loadFile,
      fileState.file?.path,
      viewingImage,
      clearViewingImage,
    ],
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

  const handlePreviewRendered = useCallback((svg: SVGSVGElement | null) => {
    svgElementRef.current = svg;
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

  const paneStatus: PaneStatus = viewingImage ? 'image' : mermaidStatus;
  const chip = useMemo(() => {
    if (viewingImage) {
      return { cls: 'chip', label: viewingImage.kind.toUpperCase() };
    }
    return mermaidStatus === 'ok'
      ? { cls: 'chip chip--ok', label: 'OK' }
      : mermaidStatus === 'warn'
        ? { cls: 'chip chip--warn', label: 'Syntax error' }
        : { cls: 'chip', label: 'Idle' };
  }, [viewingImage, mermaidStatus]);

  const sidebarVisible = activeTool === 'files';
  const statusPath = viewingImage
    ? viewingImage.path
    : (fileState.file?.path ?? null);

  return (
    <div className={`app${sidebarVisible ? '' : ' app--no-sidebar'}`}>
      <TopBar
        docName={fileState.displayName}
        dirty={fileState.dirty}
        onNew={handleNew}
        onOpen={handleOpen}
        onSave={handleSave}
        onSaveAs={handleSaveAs}
        onExportSvg={handleExportSvg}
        onExportPng={handleExportPng}
      />
      <div className="shell">
        <ActivityBar activeTool={activeTool} onSelect={handleSelectTool} />
        <Sidebar
          root={folderRoot}
          files={folderFiles}
          activePath={
            viewingImage
              ? viewingImage.path
              : (fileState.file?.path ?? null)
          }
          busy={folderBusy}
          onPickFolder={handlePickFolder}
          onRefresh={handleRefreshFolder}
          onSelect={handleSelectFile}
        />
        <div className="workspace" ref={workspaceRef} style={splitStyle}>
          <section className="pane">
            <div className="pane__header">
              <span className="pane__eyebrow">Source</span>
              <span className="pane__eyebrow">Mermaid</span>
            </div>
            <div className="pane__body">
              <Editor value={content} onChange={handleContentChange} />
            </div>
          </section>
          <Divider onDrag={handleDrag} />
          <section className="pane">
            <div className="pane__header">
              <span className="pane__eyebrow">
                {viewingImage ? `Preview · ${basename(viewingImage.path)}` : 'Preview'}
              </span>
              <span className="pane__headerchip">
                <span className={chip.cls}>{chip.label}</span>
                {viewingImage && (
                  <button
                    type="button"
                    className="pane__closeimg"
                    onClick={clearViewingImage}
                    aria-label="Return to live preview"
                    title="Return to live preview"
                  >
                    <svg
                      viewBox="0 0 16 16"
                      width="12"
                      height="12"
                      aria-hidden="true"
                      focusable="false"
                    >
                      <path
                        d="M3 3 L13 13 M13 3 L3 13"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      />
                    </svg>
                  </button>
                )}
              </span>
            </div>
            <div className="pane__body">
              <Preview
                source={content}
                viewingImage={viewingImage}
                onRenderedElement={handlePreviewRendered}
                onStatusChange={setMermaidStatus}
              />
            </div>
          </section>
        </div>
      </div>
      <StatusBar
        path={statusPath}
        lines={lines}
        status={paneStatus}
        mode={viewingImage ? 'image' : 'editor'}
      />
    </div>
  );
}
