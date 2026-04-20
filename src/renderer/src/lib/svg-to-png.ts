import { finalizeSvgForExport, getExportDimensions } from './mermaid-runtime';

const DEFAULT_SCALE = 2;

/**
 * Rasterize a live rendered <svg> to a PNG byte buffer.
 *
 * We serialize the live DOM (which tolerates HTML inside <foreignObject>)
 * rather than re-parsing via DOMParser('image/svg+xml'), which is strict
 * XML and rejects constructs like <br/> that mermaid emits for labels.
 */
export async function svgElementToPngBytes(
  live: SVGSVGElement,
  scale: number = DEFAULT_SCALE,
): Promise<Uint8Array> {
  const serialized = finalizeSvgForExport(live);
  const { width, height } = getExportDimensions(live);

  const blob = new Blob([serialized], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.decoding = 'sync';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () =>
        reject(new Error('Could not load diagram into canvas'));
      img.src = url;
    });

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.ceil(width * scale));
    canvas.height = Math.max(1, Math.ceil(height * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D canvas unavailable');
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const pngBlob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/png'),
    );
    if (!pngBlob) throw new Error('Canvas failed to produce PNG');
    const buf = await pngBlob.arrayBuffer();
    return new Uint8Array(buf);
  } finally {
    URL.revokeObjectURL(url);
  }
}
