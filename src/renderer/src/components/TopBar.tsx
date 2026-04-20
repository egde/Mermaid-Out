import logo from '../assets/logo.svg';

interface Props {
  docName: string;
  dirty: boolean;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  onNew: () => void;
  onOpen: () => void;
  onSave: () => void;
  onSaveAs: () => void;
  onExportSvg: () => void;
  onExportPng: () => void;
}

export function TopBar({
  docName,
  dirty,
  sidebarOpen,
  onToggleSidebar,
  onNew,
  onOpen,
  onSave,
  onSaveAs,
  onExportSvg,
  onExportPng,
}: Props) {
  return (
    <header className="topbar">
      <button
        type="button"
        className={`topbar__toggle${sidebarOpen ? ' topbar__toggle--on' : ''}`}
        onClick={onToggleSidebar}
        title={`${sidebarOpen ? 'Hide' : 'Show'} sidebar (Ctrl/Cmd+B)`}
        aria-pressed={sidebarOpen}
        aria-label="Toggle sidebar"
      >
        <span className="topbar__toggle-bar" />
        <span className="topbar__toggle-bar" />
        <span className="topbar__toggle-bar" />
      </button>
      <div className="topbar__brand">
        <img src={logo} alt="Kazkazi" />
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
        <button type="button" className="btn" onClick={onExportSvg}>
          Export SVG
        </button>
        <button type="button" className="btn" onClick={onExportPng}>
          Export PNG
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
