export type ActivityTool = 'files';

interface Props {
  activeTool: ActivityTool | null;
  onSelect: (tool: ActivityTool) => void;
}

function FilesIcon({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      aria-hidden="true"
      focusable="false"
    >
      <rect
        x="3.5"
        y="4.5"
        width="17"
        height="15"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <rect
        x="3.5"
        y="4.5"
        width="6"
        height="15"
        fill={active ? 'currentColor' : 'var(--ink-30)'}
      />
      <line
        x1="9.5"
        y1="4.5"
        x2="9.5"
        y2="19.5"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}

export function ActivityBar({ activeTool, onSelect }: Props) {
  const items: Array<{
    id: ActivityTool;
    label: string;
    Icon: (p: { active: boolean }) => JSX.Element;
  }> = [{ id: 'files', label: 'Files', Icon: FilesIcon }];

  return (
    <nav className="activitybar" aria-label="Tools">
      {items.map(({ id, label, Icon }) => {
        const active = activeTool === id;
        return (
          <button
            key={id}
            type="button"
            className={`activitybar__btn${active ? ' activitybar__btn--active' : ''}`}
            onClick={() => onSelect(id)}
            title={`${label} (Ctrl/Cmd+B)`}
            aria-pressed={active}
            aria-label={label}
          >
            <Icon active={active} />
          </button>
        );
      })}
    </nav>
  );
}
