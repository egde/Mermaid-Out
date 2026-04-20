import { useCallback, useEffect, useRef, useState } from 'react';
import { TopBar } from './components/TopBar';
import { Editor } from './components/Editor';
import { Preview } from './components/Preview';
import { Divider } from './components/Divider';
import { StatusBar } from './components/StatusBar';
import { useFileState, basename } from './lib/file-state';
import type { MenuEvent } from '../../types/api';

const MIN_PANE_PX = 280;

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

  const suggestedName = fileState.file
    ? basename(fileState.file.path)
    : 'untitled.mmd';

  const confirmDiscardIfDirty = useCallback(async (): Promise<boolean> => {
    if (!isDirtyNow()) return true;
    const label = fileState.file?.path ?? 'Untitled';
    const result = await window.api.dialog.confirmDiscard(label);
    if (result.action === 'cancel') return false;
    if (result.action === 'discard') return true;
    // save
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
      return true;
    }
    return false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileState.file, content, markSaved]);

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
      return true;
    }
    return false;
  }, [content, suggestedName, markSaved]);

  const handleExport = useCallback(async () => {
    const svg = lastSvgRef.current;
    if (!svg) {
      alert('Nothing to export — the preview has no rendered diagram yet.');
      return;
    }
    const target = suggestedName.replace(/\.(mmd|mermaid)$/i, '') + '.svg';
    const result = await window.api.file.exportSvg(target, svg);
    if (result.error) {
      alert(`Could not export SVG: ${result.error}`);
    }
  }, [suggestedName]);

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
          void handleExport();
          return;
      }
    });
    return off;
  }, [handleNew, handleOpen, handleSave, handleSaveAs, handleExport]);

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
  const chip =
    status === 'ok'
      ? { cls: 'chip chip--ok', label: 'OK' }
      : status === 'warn'
        ? { cls: 'chip chip--warn', label: 'Syntax error' }
        : { cls: 'chip', label: 'Idle' };

  return (
    <div className="app">
      <TopBar
        docName={fileState.displayName}
        dirty={fileState.dirty}
        onNew={handleNew}
        onOpen={handleOpen}
        onSave={handleSave}
        onSaveAs={handleSaveAs}
        onExport={handleExport}
      />
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
      <StatusBar
        path={fileState.file?.path ?? null}
        lines={lines}
        status={status}
      />
    </div>
  );
}
