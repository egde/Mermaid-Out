import { useMemo } from 'react';
import type { FileEntry } from '../../../types/api';
import { basename } from '../lib/file-state';

interface Props {
  root: string | null;
  files: FileEntry[];
  activePath: string | null;
  busy: boolean;
  onPickFolder: () => void;
  onRefresh: () => void;
  onSelect: (entry: FileEntry) => void;
}

interface TreeFolder {
  name: string;
  path: string;
  folders: Map<string, TreeFolder>;
  files: FileEntry[];
}

function buildTree(files: FileEntry[]): TreeFolder {
  const root: TreeFolder = {
    name: '',
    path: '',
    folders: new Map(),
    files: [],
  };
  for (const file of files) {
    const parts = file.relativePath.split('/');
    const leaf = parts.pop()!;
    let node = root;
    let acc = '';
    for (const part of parts) {
      acc = acc ? `${acc}/${part}` : part;
      let next = node.folders.get(part);
      if (!next) {
        next = { name: part, path: acc, folders: new Map(), files: [] };
        node.folders.set(part, next);
      }
      node = next;
    }
    node.files.push({ ...file, name: leaf });
  }
  return root;
}

function kindBadge(kind: FileEntry['kind']): string | null {
  if (kind === 'png') return 'PNG';
  if (kind === 'svg') return 'SVG';
  return null;
}

function FolderNode({
  folder,
  depth,
  activePath,
  onSelect,
}: {
  folder: TreeFolder;
  depth: number;
  activePath: string | null;
  onSelect: (entry: FileEntry) => void;
}) {
  const folders = Array.from(folder.folders.values()).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  return (
    <>
      {folders.map((child) => (
        <div key={`folder:${child.path}`} className="sidebar__group">
          <div
            className="sidebar__folder"
            style={{ paddingLeft: 8 + depth * 14 }}
            title={child.path}
          >
            {child.name}/
          </div>
          <FolderNode
            folder={child}
            depth={depth + 1}
            activePath={activePath}
            onSelect={onSelect}
          />
        </div>
      ))}
      {folder.files.map((file) => {
        const active = file.path === activePath;
        const badge = kindBadge(file.kind);
        return (
          <button
            key={file.path}
            type="button"
            className={`sidebar__file${active ? ' sidebar__file--active' : ''}`}
            style={{ paddingLeft: 8 + depth * 14 }}
            onClick={() => onSelect(file)}
            title={file.path}
          >
            <span className="sidebar__filename">{file.name}</span>
            {badge && <span className="sidebar__kind">{badge}</span>}
          </button>
        );
      })}
    </>
  );
}

export function Sidebar({
  root,
  files,
  activePath,
  busy,
  onPickFolder,
  onRefresh,
  onSelect,
}: Props) {
  const tree = useMemo(() => buildTree(files), [files]);
  const rootLabel = root ? basename(root) || root : 'No folder';

  return (
    <aside className="sidebar">
      <header className="sidebar__header">
        <span className="pane__eyebrow">Files</span>
      </header>
      <div className="sidebar__toolbar">
        <button type="button" className="btn btn--xs" onClick={onPickFolder}>
          Open folder
        </button>
        <button
          type="button"
          className="btn btn--xs"
          onClick={onRefresh}
          disabled={!root || busy}
        >
          Refresh
        </button>
      </div>
      <div className="sidebar__root" title={root ?? ''}>
        {rootLabel}
      </div>
      <div className="sidebar__list">
        {files.length === 0 ? (
          <div className="sidebar__empty">
            {root
              ? 'No .mmd / .svg / .png files found'
              : 'Pick a folder to browse diagrams'}
          </div>
        ) : (
          <FolderNode
            folder={tree}
            depth={0}
            activePath={activePath}
            onSelect={onSelect}
          />
        )}
      </div>
    </aside>
  );
}
