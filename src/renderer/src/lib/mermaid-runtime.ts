import mermaid from 'mermaid';

let initialized = false;

function ensureInitialized() {
  if (initialized) return;
  initialized = true;
  // Match what `mmdc` produces by default: the stock `default` theme, no
  // custom theme-variable overrides. Our Tech Template chrome is applied
  // to the surrounding UI, not to the diagram interior — diagrams read best
  // with mermaid's own defaults.
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    theme: 'default',
  });
}

export interface RenderResult {
  ok: true;
  svg: string;
}

export interface RenderError {
  ok: false;
  message: string;
}

let renderCounter = 0;

export async function renderMermaid(
  source: string,
): Promise<RenderResult | RenderError> {
  ensureInitialized();
  const trimmed = source.trim();
  if (!trimmed) {
    return { ok: false, message: 'Empty diagram' };
  }
  try {
    await mermaid.parse(trimmed);
  } catch (err) {
    return { ok: false, message: (err as Error).message || String(err) };
  }
  try {
    const id = `mermaid-render-${++renderCounter}`;
    const { svg } = await mermaid.render(id, trimmed);
    return { ok: true, svg };
  } catch (err) {
    return { ok: false, message: (err as Error).message || String(err) };
  }
}

/**
 * Wrap a mermaid-generated SVG so it stands on its own when saved:
 *  - explicit width/height derived from the viewBox
 *  - white background rect as the first child
 *  - padding around the viewBox so nothing touches the edge
 *
 * Returns the original string if it cannot be parsed.
 */
export function finalizeSvgForExport(svg: string, padding = 16): string {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svg, 'image/svg+xml');
    const root = doc.documentElement;
    if (root.nodeName !== 'svg') return svg;

    root.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

    const vbAttr = root.getAttribute('viewBox');
    let width = parseFloat(root.getAttribute('width') ?? '');
    let height = parseFloat(root.getAttribute('height') ?? '');

    if (vbAttr) {
      const [vx, vy, vw, vh] = vbAttr.split(/\s+/).map(Number);
      if ([vx, vy, vw, vh].every((n) => Number.isFinite(n))) {
        const nx = vx - padding;
        const ny = vy - padding;
        const nw = vw + padding * 2;
        const nh = vh + padding * 2;
        root.setAttribute('viewBox', `${nx} ${ny} ${nw} ${nh}`);
        if (!Number.isFinite(width) || width <= 0) width = nw;
        if (!Number.isFinite(height) || height <= 0) height = nh;
      }
    }

    if (Number.isFinite(width) && width > 0) {
      root.setAttribute('width', String(Math.round(width)));
    }
    if (Number.isFinite(height) && height > 0) {
      root.setAttribute('height', String(Math.round(height)));
    }

    const vbNow = root.getAttribute('viewBox');
    if (vbNow) {
      const [vx, vy, vw, vh] = vbNow.split(/\s+/).map(Number);
      const bg = doc.createElementNS('http://www.w3.org/2000/svg', 'rect');
      bg.setAttribute('x', String(vx));
      bg.setAttribute('y', String(vy));
      bg.setAttribute('width', String(vw));
      bg.setAttribute('height', String(vh));
      bg.setAttribute('fill', '#FFFFFF');
      root.insertBefore(bg, root.firstChild);
    }

    return new XMLSerializer().serializeToString(root);
  } catch {
    return svg;
  }
}
