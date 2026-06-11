/**
 * Render detected Mermaid blocks to inline SVG, with a safe fallback
 * (ADR-MAIN-003). The heavy `mermaid` dependency is reached only through the
 * injectable {@link MermaidRenderer} (and lazily imported in the default), so
 * the insertion/fallback/idempotency logic is unit-testable without it.
 */

import { type MermaidTheme, detectTheme } from './theme';
import { TOGGLE_ATTR, attachToggle } from './toggle';

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
  render(id: string, source: string, theme?: MermaidTheme): Promise<{ svg: string }>;
}

export type RenderOutcome = 'rendered' | 'error' | 'skipped';

export interface RenderOptions {
  renderer?: MermaidRenderer;
  /** Document used to create nodes; defaults to the block's owner document. */
  doc?: Document;
  /** Force a theme; defaults to one detected from the block's background (ADR-MAIN-006). */
  theme?: MermaidTheme;
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
  // Re-initialize only when the theme changes (ADR-MAIN-006). Mermaid bakes the
  // theme into the SVG, so theme is a host-config option (`initialize`), never a
  // `%%{init}%%` directive — directives are constrained under securityLevel
  // 'strict', host config is not.
  let initializedTheme: string | undefined;
  cachedDefault = {
    async render(id, source, theme = 'default') {
      const { default: mermaid } = await import('mermaid');
      if (initializedTheme !== theme) {
        mermaid.initialize({ ...MERMAID_INIT_CONFIG, theme });
        initializedTheme = theme;
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
  const theme = opts.theme ?? detectTheme(element);
  const id = nextDiagramId();

  try {
    const { svg } = await renderer.render(id, source, theme);
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

/**
 * Undo every rendered/errored preview under `root`: remove the preview (or
 * error) container and its toggle, clear the detect/render markers, and unhide
 * the source. A subsequent {@link renderMermaidBlock} pass then re-renders from
 * scratch — used to re-theme all diagrams when Chat's theme flips (ADR-MAIN-006).
 */
export function resetPreviews(root: ParentNode): void {
  root.querySelectorAll<HTMLElement>(`[${HANDLED_ATTR}]`).forEach((source) => {
    const sibling = source.nextElementSibling;
    const marker = sibling?.getAttribute(RENDERED_ATTR);
    if (marker === 'rendered' || marker === 'error') {
      const toggle = sibling!.nextElementSibling;
      if (toggle?.hasAttribute(TOGGLE_ATTR)) {
        toggle.remove();
      }
      sibling!.remove();
    }
    source.hidden = false;
    source.removeAttribute(HANDLED_ATTR);
    source.removeAttribute(RENDERED_ATTR); // the "detected" marker on the source
  });
}
