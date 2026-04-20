export type PaneStatus = 'ok' | 'warn' | 'empty' | 'image';

interface Props {
  path: string | null;
  lines: number;
  status: PaneStatus;
  mode: 'editor' | 'image';
}

function statusLabel(status: PaneStatus) {
  switch (status) {
    case 'ok':
      return 'Render · OK';
    case 'warn':
      return 'Render · Syntax error';
    case 'empty':
      return 'Render · Idle';
    case 'image':
      return 'Viewing image';
  }
}

export function StatusBar({ path, lines, status, mode }: Props) {
  return (
    <footer className="statusbar">
      <span className="statusbar__path">
        {path ?? 'No file · in memory only'}
      </span>
      {mode === 'editor' && (
        <>
          <span className="statusbar__sep">·</span>
          <span>{lines} lines</span>
          <span className="statusbar__sep">·</span>
          <span>Mermaid</span>
        </>
      )}
      <span className="statusbar__grow" />
      <span>{statusLabel(status)}</span>
    </footer>
  );
}
