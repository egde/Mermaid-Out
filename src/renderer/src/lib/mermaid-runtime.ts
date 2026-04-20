import mermaid from 'mermaid';

let initialized = false;

function ensureInitialized() {
  if (initialized) return;
  initialized = true;
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    theme: 'neutral',
    fontFamily:
      "'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, Consolas, monospace",
    themeVariables: {
      background: '#FFFFFF',
      primaryColor: '#FFFFFF',
      primaryTextColor: '#000000',
      primaryBorderColor: '#000000',
      lineColor: '#000000',
      textColor: '#1A1A1A',
      mainBkg: '#FFFFFF',
      secondaryColor: '#F2F2F2',
      tertiaryColor: '#FFFFFF',
      clusterBkg: '#FFFFFF',
      clusterBorder: '#000000',
      edgeLabelBackground: '#FFFFFF',
    },
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
