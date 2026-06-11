// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import mermaid from 'mermaid';
import {
  MERMAID_INIT_CONFIG,
  type MermaidRenderer,
  renderMermaidBlock,
  resetPreviews,
} from './render';
import { TOGGLE_ATTR } from './toggle';
import { ZOOM_ATTR, closeActiveOverlay } from './zoom';

vi.mock('mermaid', () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn(async (id: string) => ({ svg: `<svg id="${id}"></svg>` })),
  },
}));

beforeEach(() => {
  document.body.replaceChildren();
});

/** A renderer that echoes the id into the produced SVG and records calls. */
function okRenderer(): MermaidRenderer & { ids: string[] } {
  const ids: string[] = [];
  return {
    ids,
    async render(id) {
      ids.push(id);
      return { svg: `<svg id="${id}"><g></g></svg>` };
    },
  };
}

function block(source: string): { element: HTMLElement; source: string } {
  const pre = document.createElement('pre');
  pre.textContent = source;
  document.body.appendChild(pre);
  return { element: pre, source };
}

describe('MERMAID_INIT_CONFIG (AC-3)', () => {
  it('uses strict security and disables auto-start', () => {
    expect(MERMAID_INIT_CONFIG.securityLevel).toBe('strict');
    expect(MERMAID_INIT_CONFIG.startOnLoad).toBe(false);
  });
});

describe('renderMermaidBlock', () => {
  it('renders a valid block to an SVG inserted after the code block (AC-1)', async () => {
    const b = block('graph TD\nA-->B');
    const outcome = await renderMermaidBlock(b, { renderer: okRenderer(), doc: document });
    expect(outcome).toBe('rendered');
    const container = b.element.nextElementSibling as HTMLElement;
    expect(container.getAttribute('data-mermaid-preview')).toBe('rendered');
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('falls back to error when the renderer returns no SVG root (AC-2)', async () => {
    const b = block('graph TD\nA-->B');
    const notSvg: MermaidRenderer = {
      async render() {
        return { svg: '<div>not an svg</div>' };
      },
    };
    const outcome = await renderMermaidBlock(b, { renderer: notSvg });
    expect(outcome).toBe('error');
    expect((b.element.nextElementSibling as HTMLElement).getAttribute('data-mermaid-preview')).toBe(
      'error',
    );
  });

  it('uses the default mermaid-backed renderer when none is injected (AC-3)', async () => {
    const b1 = block('graph TD\nA-->B');
    expect(await renderMermaidBlock(b1)).toBe('rendered');
    // Theme is set via host config, not a directive (ADR-MAIN-006); no opaque
    // background in jsdom → 'default'.
    expect(mermaid.initialize).toHaveBeenCalledWith({ ...MERMAID_INIT_CONFIG, theme: 'default' });
    // Second default render at the same theme reuses the cached initialization.
    const b2 = block('pie title Pets');
    expect(await renderMermaidBlock(b2)).toBe('rendered');
    expect(mermaid.initialize).toHaveBeenCalledTimes(1);
  });

  it('falls back without throwing when rendering fails (AC-2)', async () => {
    const b = block('graph TD\nA--');
    const failing: MermaidRenderer = {
      render: vi.fn().mockRejectedValue(new Error('Parse error')),
    };
    const outcome = await renderMermaidBlock(b, { renderer: failing });
    expect(outcome).toBe('error');
    // Original code block is still present; no rendered SVG was inserted.
    expect(document.body.contains(b.element)).toBe(true);
    const sibling = b.element.nextElementSibling as HTMLElement | null;
    expect(sibling?.getAttribute('data-mermaid-preview')).toBe('error');
    expect(sibling?.querySelector('svg')).toBeNull();
  });

  it('is idempotent — a second call does not insert a second SVG (AC-4)', async () => {
    const b = block('graph TD\nA-->B');
    const renderer = okRenderer();
    expect(await renderMermaidBlock(b, { renderer })).toBe('rendered');
    expect(await renderMermaidBlock(b, { renderer })).toBe('skipped');
    const svgs = document.body.querySelectorAll('[data-mermaid-preview="rendered"] svg');
    expect(svgs).toHaveLength(1);
    expect(renderer.ids).toHaveLength(1);
  });

  it('inserts the SVG as a parsed node, not via innerHTML (AC-5)', async () => {
    // Structural guarantee: the container's child is a real parsed <svg> element
    // (DOMParser + importNode), so an embedded <script> ends up as an inert node.
    // NB: jsdom never executes inserted scripts, so the no-exec check below is a
    // weak proxy — the real XSS defense is mermaid securityLevel:'strict' (mocked
    // here) plus manual Phase-5 verification in a real browser.
    const b = block('graph TD\nA-->B');
    const evil: MermaidRenderer = {
      async render(id) {
        return { svg: `<svg id="${id}"><script>globalThis.__pwned = true;</script></svg>` };
      },
    };
    await renderMermaidBlock(b, { renderer: evil });
    const container = b.element.nextElementSibling as HTMLElement;
    const svg = container.firstElementChild as Element;
    expect(svg.nodeName.toLowerCase()).toBe('svg'); // appended as element node, not string
    expect((globalThis as Record<string, unknown>).__pwned).toBeUndefined();
  });

  it('gives each rendered diagram a unique id (AC-6)', async () => {
    const renderer = okRenderer();
    const b1 = block('graph TD\nA-->B');
    const b2 = block('pie title Pets');
    await renderMermaidBlock(b1, { renderer });
    await renderMermaidBlock(b2, { renderer });
    expect(renderer.ids[0]).not.toBe(renderer.ids[1]);
    const ids = Array.from(document.querySelectorAll('[data-mermaid-preview="rendered"] svg')).map(
      (s) => s.id,
    );
    expect(new Set(ids).size).toBe(2);
  });

  // US-004: a successful render attaches a preview/source toggle and hides the
  // source by default; the error path attaches none.
  it('attaches a toggle and hides the source on success (US-004 AC-1)', async () => {
    const b = block('graph TD\nA-->B');
    await renderMermaidBlock(b, { renderer: okRenderer(), doc: document });
    const button = document.querySelector(`[${TOGGLE_ATTR}]`);
    expect(button).not.toBeNull();
    expect(b.element.hidden).toBe(true); // source hidden by default (preview shown)
  });

  it('attaches no toggle on the error fallback; source stays visible (US-004 AC-3)', async () => {
    const b = block('graph TD\nA--');
    const failing: MermaidRenderer = {
      render: vi.fn().mockRejectedValue(new Error('Parse error')),
    };
    await renderMermaidBlock(b, { renderer: failing });
    expect(document.querySelector(`[${TOGGLE_ATTR}]`)).toBeNull();
    expect(b.element.hidden).toBe(false);
  });

  // US-006 AC-1: zoom button wired on success path only.
  it('attaches a zoom button on success path (US-006 AC-1)', async () => {
    const b = block('graph TD\nA-->B');
    await renderMermaidBlock(b, { renderer: okRenderer(), doc: document });
    const zoomBtn = document.querySelector(`[${ZOOM_ATTR}]`);
    expect(zoomBtn).not.toBeNull();
  });

  it('attaches no zoom button on the error fallback (US-006 AC-1)', async () => {
    const b = block('graph TD\nA--');
    const failing: MermaidRenderer = {
      render: vi.fn().mockRejectedValue(new Error('Parse error')),
    };
    await renderMermaidBlock(b, { renderer: failing });
    expect(document.querySelector(`[${ZOOM_ATTR}]`)).toBeNull();
  });

  // US-006 AC-2: idempotency via HANDLED_ATTR gate — second call is 'skipped',
  // so only one zoom button should exist.
  it('creates exactly one zoom button even after a redundant scan (US-006 AC-2)', async () => {
    const b = block('graph TD\nA-->B');
    const renderer = okRenderer();
    await renderMermaidBlock(b, { renderer, doc: document });
    await renderMermaidBlock(b, { renderer, doc: document }); // skipped
    expect(document.querySelectorAll(`[${ZOOM_ATTR}]`)).toHaveLength(1);
  });

  // US-005: theme passed to the renderer.
  it('passes the detected theme to the renderer (US-005 AC-1)', async () => {
    const surface = document.createElement('div');
    surface.style.backgroundColor = 'rgb(18, 18, 18)'; // dark
    document.body.appendChild(surface);
    const pre = document.createElement('pre');
    pre.textContent = 'graph TD\nA-->B';
    surface.appendChild(pre);

    const seen: (string | undefined)[] = [];
    const renderer: MermaidRenderer = {
      async render(id, _source, theme) {
        seen.push(theme);
        return { svg: `<svg id="${id}"></svg>` };
      },
    };
    await renderMermaidBlock(
      { element: pre, source: 'graph TD\nA-->B' },
      { renderer, doc: document },
    );
    expect(seen).toEqual(['dark']);
  });

  it('honours an explicit opts.theme override (US-005 AC-1)', async () => {
    const b = block('graph TD\nA-->B');
    const seen: (string | undefined)[] = [];
    const renderer: MermaidRenderer = {
      async render(id, _source, theme) {
        seen.push(theme);
        return { svg: `<svg id="${id}"></svg>` };
      },
    };
    await renderMermaidBlock(b, { renderer, theme: 'dark' });
    expect(seen).toEqual(['dark']);
  });
});

describe('resetPreviews', () => {
  it('removes the preview container + toggle, clears markers, unhides source (US-005 AC-5)', async () => {
    const b = block('graph TD\nA-->B');
    await renderMermaidBlock(b, { renderer: okRenderer(), doc: document });
    expect(b.element.hidden).toBe(true);
    expect(document.querySelector('[data-mermaid-preview="rendered"]')).not.toBeNull();
    expect(document.querySelector(`[${TOGGLE_ATTR}]`)).not.toBeNull();

    resetPreviews(document);

    expect(document.querySelector('[data-mermaid-preview="rendered"]')).toBeNull();
    expect(document.querySelector(`[${TOGGLE_ATTR}]`)).toBeNull();
    // US-006 AC-6: zoom button also removed.
    expect(document.querySelector(`[${ZOOM_ATTR}]`)).toBeNull();
    expect(b.element.hidden).toBe(false);
    expect(b.element.hasAttribute('data-mermaid-rendered')).toBe(false);
    expect(b.element.hasAttribute('data-mermaid-preview')).toBe(false);
  });

  it('lets a reset block render again (re-theme path, US-005 AC-4)', async () => {
    const b = block('graph TD\nA-->B');
    await renderMermaidBlock(b, { renderer: okRenderer(), doc: document });
    resetPreviews(document);
    // Second render after reset succeeds (not 'skipped').
    expect(await renderMermaidBlock(b, { renderer: okRenderer(), doc: document })).toBe('rendered');
    expect(document.querySelectorAll('[data-mermaid-preview="rendered"]')).toHaveLength(1);
  });

  it('cleans up an errored block too (US-005 AC-5)', async () => {
    const b = block('graph TD\nA--');
    const failing: MermaidRenderer = { render: vi.fn().mockRejectedValue(new Error('boom')) };
    await renderMermaidBlock(b, { renderer: failing, doc: document });
    expect(document.querySelector('[data-mermaid-preview="error"]')).not.toBeNull();
    resetPreviews(document);
    expect(document.querySelector('[data-mermaid-preview="error"]')).toBeNull();
    expect(b.element.hasAttribute('data-mermaid-rendered')).toBe(false);
  });

  // US-006 AC-6: overlay closed safely when reset fires while overlay is open.
  it('closes an open zoom overlay when resetPreviews runs (US-006 AC-6)', async () => {
    const b = block('graph TD\nA-->B');
    await renderMermaidBlock(b, { renderer: okRenderer(), doc: document });
    // Open the zoom overlay.
    const zoomBtn = document.querySelector(`[${ZOOM_ATTR}]`) as HTMLButtonElement;
    expect(zoomBtn).not.toBeNull();
    zoomBtn.click();
    expect(document.querySelector('[data-mermaid-zoom-overlay]')).not.toBeNull();
    // Reset should close the overlay without throwing.
    expect(() => resetPreviews(document)).not.toThrow();
    expect(document.querySelector('[data-mermaid-zoom-overlay]')).toBeNull();
  });

  it('does not throw when resetPreviews runs with no open overlay (US-006 AC-6 no-op path)', async () => {
    closeActiveOverlay(); // ensure nothing is open
    const b = block('graph TD\nA-->B');
    await renderMermaidBlock(b, { renderer: okRenderer(), doc: document });
    expect(() => resetPreviews(document)).not.toThrow();
  });
});
