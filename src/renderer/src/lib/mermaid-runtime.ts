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

const SVG_NS = 'http://www.w3.org/2000/svg';

function getSvgDimensions(el: SVGSVGElement): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  const vb = el.viewBox?.baseVal;
  if (vb && vb.width > 0 && vb.height > 0) {
    return { x: vb.x, y: vb.y, width: vb.width, height: vb.height };
  }
  const w = parseFloat(el.getAttribute('width') ?? '') || 0;
  const h = parseFloat(el.getAttribute('height') ?? '') || 0;
  if (w > 0 && h > 0) return { x: 0, y: 0, width: w, height: h };
  try {
    const bbox = el.getBBox();
    return { x: bbox.x, y: bbox.y, width: bbox.width, height: bbox.height };
  } catch {
    return { x: 0, y: 0, width: 800, height: 600 };
  }
}

/**
 * Clone a live rendered <svg>, add a white background rect and a padding
 * ring around the viewBox, and return a serialized XML string suitable
 * for saving to disk.
 *
 * Works for diagrams that contain HTML (foreignObject + <br/>) because it
 * operates on the already-parsed live DOM rather than re-parsing the
 * mermaid output string through a strict XML parser.
 */
export function finalizeSvgForExport(
  live: SVGSVGElement,
  padding = 16,
): string {
  const clone = live.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('xmlns', SVG_NS);
  clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');

  const { x, y, width, height } = getSvgDimensions(live);
  const nx = x - padding;
  const ny = y - padding;
  const nw = width + padding * 2;
  const nh = height + padding * 2;

  clone.setAttribute('viewBox', `${nx} ${ny} ${nw} ${nh}`);
  clone.setAttribute('width', String(Math.round(nw)));
  clone.setAttribute('height', String(Math.round(nh)));

  const bg = clone.ownerDocument.createElementNS(SVG_NS, 'rect');
  bg.setAttribute('x', String(nx));
  bg.setAttribute('y', String(ny));
  bg.setAttribute('width', String(nw));
  bg.setAttribute('height', String(nh));
  bg.setAttribute('fill', '#FFFFFF');
  clone.insertBefore(bg, clone.firstChild);

  return new XMLSerializer().serializeToString(clone);
}

/**
 * Return the logical pixel dimensions of a rendered diagram (already padded
 * by finalizeSvgForExport's math so callers can match canvas size).
 */
export function getExportDimensions(
  live: SVGSVGElement,
  padding = 16,
): { width: number; height: number } {
  const { width, height } = getSvgDimensions(live);
  return {
    width: Math.max(1, Math.round(width + padding * 2)),
    height: Math.max(1, Math.round(height + padding * 2)),
  };
}
