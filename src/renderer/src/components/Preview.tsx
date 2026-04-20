import { useEffect, useRef, useState } from 'react';
import { renderMermaid } from '../lib/mermaid-runtime';

export interface ViewingImage {
  kind: 'png' | 'svg';
  path: string;
  blobUrl: string;
}

interface Props {
  source: string;
  viewingImage: ViewingImage | null;
  onRenderedElement: (svg: SVGSVGElement | null) => void;
  onStatusChange: (status: 'ok' | 'warn' | 'empty') => void;
}

const DEBOUNCE_MS = 250;

export function Preview({
  source,
  viewingImage,
  onRenderedElement,
  onStatusChange,
}: Props) {
  const [lastSvg, setLastSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const renderHostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (viewingImage) {
      // Pause live rendering while the user views an external image.
      return;
    }
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
  }, [source, viewingImage, onRenderedElement, onStatusChange]);

  useEffect(() => {
    if (viewingImage) {
      onRenderedElement(null);
      return;
    }
    const host = renderHostRef.current;
    if (!host) {
      onRenderedElement(null);
      return;
    }
    const svg = host.querySelector('svg') as SVGSVGElement | null;
    onRenderedElement(svg);
  }, [lastSvg, viewingImage, onRenderedElement]);

  if (viewingImage) {
    return (
      <div className="preview" ref={stageRef}>
        <div className="preview__stage preview__stage--image">
          <img
            className="preview__image"
            src={viewingImage.blobUrl}
            alt={viewingImage.path}
          />
        </div>
      </div>
    );
  }

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
