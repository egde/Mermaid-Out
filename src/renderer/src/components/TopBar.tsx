import logo from '../assets/logo.svg';

interface Props {
  docName: string;
  dirty: boolean;
  onNew: () => void;
  onOpen: () => void;
  onSave: () => void;
  onSaveAs: () => void;
  onExport: () => void;
}

export function TopBar({
  docName,
  dirty,
  onNew,
  onOpen,
  onSave,
  onSaveAs,
  onExport,
}: Props) {
  return (
    <header className="topbar">
      <div className="topbar__brand">
        <img src={logo} alt="Mermaid-Out" />
        <span>Mermaid-Out</span>
      </div>
      <div className="topbar__doc">
        <span className="topbar__docname">
          {dirty && <span className="dirty-dot" aria-hidden="true" />}
          {docName}
        </span>
        <span>{dirty ? 'UNSAVED' : 'SAVED'}</span>
      </div>
      <div className="topbar__grow" />
      <div className="topbar__actions">
        <button type="button" className="btn" onClick={onNew}>
          New
        </button>
        <button type="button" className="btn" onClick={onOpen}>
          Open
        </button>
        <button type="button" className="btn" onClick={onSaveAs}>
          Save As
        </button>
        <button type="button" className="btn" onClick={onExport}>
          Export SVG
        </button>
        <button
          type="button"
          className={`btn btn--primary${dirty ? ' btn--stamped' : ''}`}
          onClick={onSave}
        >
          Save
        </button>
      </div>
    </header>
  );
}
