import { useEffect, useRef, useState } from 'react';
import { renderMermaid } from '../lib/mermaid-runtime';

interface Props {
  source: string;
  onRenderedElement: (svg: SVGSVGElement | null) => void;
  onStatusChange: (status: 'ok' | 'warn' | 'empty') => void;
}

const DEBOUNCE_MS = 250;

export function Preview({
  source,
  onRenderedElement,
  onStatusChange,
}: Props) {
  const [lastSvg, setLastSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const renderHostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!source.trim()) {
      setLastSvg(null);
      setError(null);
      onRenderedElement(null);
      onStatusChange('empty');
      return;
    }

    let cancelled = false;
    const handle = window.setTimeout(async () => {
      const result = await renderMermaid(source);
      if (cancelled) return;
      if (result.ok) {
        setLastSvg(result.svg);
        setError(null);
        onStatusChange('ok');
      } else {
        setError(result.message);
        onStatusChange('warn');
      }
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [source, onRenderedElement, onStatusChange]);

  useEffect(() => {
    const host = renderHostRef.current;
    if (!host) {
      onRenderedElement(null);
      return;
    }
    const svg = host.querySelector('svg') as SVGSVGElement | null;
    onRenderedElement(svg);
  }, [lastSvg, onRenderedElement]);

  return (
    <div className="preview" ref={stageRef}>
      <div className="preview__stage">
        {error && (
          <div className="preview__error" role="alert">
            <header>Syntax error</header>
            {error}
          </div>
        )}
        {lastSvg ? (
          <div
            ref={renderHostRef}
            className={
              error
                ? 'preview__render preview__render--stale'
                : 'preview__render'
            }
            dangerouslySetInnerHTML={{ __html: lastSvg }}
          />
        ) : (
          !error && (
            <div className="preview__empty">
              Type a mermaid diagram to see a preview
            </div>
          )
        )}
      </div>
    </div>
  );
}
