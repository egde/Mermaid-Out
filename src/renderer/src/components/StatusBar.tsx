interface Props {
  path: string | null;
  lines: number;
  status: 'ok' | 'warn' | 'empty';
}

function statusLabel(status: Props['status']) {
  switch (status) {
    case 'ok':
      return 'Render · OK';
    case 'warn':
      return 'Render · Syntax error';
    case 'empty':
      return 'Render · Idle';
  }
}

export function StatusBar({ path, lines, status }: Props) {
  return (
    <footer className="statusbar">
      <span className="statusbar__path">{path ?? 'No file · in memory only'}</span>
      <span className="statusbar__sep">·</span>
      <span>{lines} lines</span>
      <span className="statusbar__sep">·</span>
      <span>Mermaid</span>
      <span className="statusbar__grow" />
      <span>{statusLabel(status)}</span>
    </footer>
  );
}
