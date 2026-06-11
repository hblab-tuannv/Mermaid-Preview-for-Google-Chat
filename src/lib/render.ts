/**
 * Render detected Mermaid blocks to inline SVG, with a safe fallback
 * (ADR-MAIN-003). The heavy `mermaid` dependency is reached only through the
 * injectable {@link MermaidRenderer} (and lazily imported in the default), so
 * the insertion/fallback/idempotency logic is unit-testable without it.
 */

import { attachToggle } from './toggle';

const RENDERED_ATTR = 'data-mermaid-preview';
/** Marks a source element whose render has already been attempted. */
const HANDLED_ATTR = 'data-mermaid-rendered';

/** Mermaid init config — strict security, no auto-start (AC-3). */
export const MERMAID_INIT_CONFIG = {
  startOnLoad: false,
  securityLevel: 'strict',
} as const;

/** Abstraction over `mermaid.render`, injectable so tests can mock it. */
export interface MermaidRenderer {
  render(id: string, source: string): Promise<{ svg: string }>;
}

export type RenderOutcome = 'rendered' | 'error' | 'skipped';

export interface RenderOptions {
  renderer?: MermaidRenderer;
  /** Document used to create nodes; defaults to the block's owner document. */
  doc?: Document;
}

let idCounter = 0;

/** Deterministic, collision-free id per diagram (AC-6). */
function nextDiagramId(): string {
  idCounter += 1;
  return `mermaid-preview-${idCounter}`;
}

let cachedDefault: MermaidRenderer | undefined;

/**
 * Default renderer wrapping the real `mermaid`, initialized once. The dynamic
 * `import('mermaid')` keeps `mermaid` out of test bundles (tests inject a mock),
 * but in the IIFE content build rollup inlines it — Mermaid ships eagerly inside
 * `content.js` (the accepted ADR-MAIN-003 trade-off), not network-lazy-loaded.
 */
function defaultRenderer(): MermaidRenderer {
  if (cachedDefault) {
    return cachedDefault;
  }
  let initialized = false;
  cachedDefault = {
    async render(id, source) {
      const { default: mermaid } = await import('mermaid');
      if (!initialized) {
        mermaid.initialize(MERMAID_INIT_CONFIG);
        initialized = true;
      }
      return mermaid.render(id, source);
    },
  };
  return cachedDefault;
}

/** Parse an SVG string into a node WITHOUT executing it (AC-5: no innerHTML). */
function parseSvg(svg: string, doc: Document): SVGElement | null {
  const parsed = new DOMParser().parseFromString(svg, 'image/svg+xml');
  const el = parsed.documentElement;
  if (el.nodeName.toLowerCase() !== 'svg') {
    return null;
  }
  return doc.importNode(el, true) as unknown as SVGElement;
}

/**
 * Render one detected Mermaid block. Inserts an SVG container right after the
 * code block on success; on failure keeps the original block and adds a light
 * error marker. Idempotent: a block already handled returns `'skipped'`.
 */
export async function renderMermaidBlock(
  block: { element: HTMLElement; source: string },
  opts: RenderOptions = {},
): Promise<RenderOutcome> {
  const { element, source } = block;
  if (element.hasAttribute(HANDLED_ATTR)) {
    return 'skipped';
  }
  element.setAttribute(HANDLED_ATTR, 'true');

  const doc = opts.doc ?? element.ownerDocument;
  const renderer = opts.renderer ?? defaultRenderer();
  const id = nextDiagramId();

  try {
    const { svg } = await renderer.render(id, source);
    const node = parseSvg(svg, doc);
    if (!node) {
      throw new Error('Mermaid produced no SVG root');
    }
    const container = doc.createElement('div');
    container.setAttribute(RENDERED_ATTR, 'rendered');
    container.appendChild(node);
    element.after(container);
    // Add the preview/source toggle here, on the idempotent success path, so it
    // is created exactly once per block (ADR-MAIN-004). Default hides the source.
    attachToggle(element, container, doc);
    return 'rendered';
  } catch {
    // Fallback: leave the original code block visible, add a light error marker.
    const marker = doc.createElement('div');
    marker.setAttribute(RENDERED_ATTR, 'error');
    marker.textContent = 'Mermaid: could not render diagram';
    element.after(marker);
    return 'error';
  }
}
