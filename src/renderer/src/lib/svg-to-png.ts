const DEFAULT_SCALE = 2;

function getSvgDimensions(svgRoot: SVGSVGElement): { width: number; height: number } {
  const widthAttr = svgRoot.getAttribute('width');
  const heightAttr = svgRoot.getAttribute('height');
  const viewBox = svgRoot.viewBox.baseVal;

  const parsed = (value: string | null): number | null => {
    if (!value) return null;
    const n = parseFloat(value);
    return Number.isFinite(n) && n > 0 ? n : null;
  };

  const width =
    parsed(widthAttr) ??
    (viewBox.width > 0 ? viewBox.width : svgRoot.getBBox().width) ??
    800;
  const height =
    parsed(heightAttr) ??
    (viewBox.height > 0 ? viewBox.height : svgRoot.getBBox().height) ??
    600;

  return { width, height };
}

export async function svgStringToPngBytes(
  svg: string,
  scale: number = DEFAULT_SCALE,
): Promise<Uint8Array> {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svg, 'image/svg+xml');
  const svgRoot = doc.documentElement as unknown as SVGSVGElement;
  if (!svgRoot || svgRoot.nodeName !== 'svg') {
    throw new Error('Rendered output is not a valid SVG');
  }

  svgRoot.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  const { width, height } = getSvgDimensions(svgRoot);

  const serialized = new XMLSerializer().serializeToString(svgRoot);
  const blob = new Blob([serialized], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.decoding = 'sync';
    img.src = url;
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () =>
        reject(new Error('Could not load diagram into canvas'));
    });

    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(width * scale);
    canvas.height = Math.ceil(height * scale);
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
