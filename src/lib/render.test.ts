// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import mermaid from 'mermaid';
import { MERMAID_INIT_CONFIG, type MermaidRenderer, renderMermaidBlock } from './render';

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
    expect(mermaid.initialize).toHaveBeenCalledWith(MERMAID_INIT_CONFIG);
    // Second default render reuses the cached, already-initialized renderer.
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
});
