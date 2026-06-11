// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { MERMAID_KEYWORDS, detectMermaidBlocks, findCodeBlocks, isMermaid } from './detect';

/** Build a `<pre><code>` block with the given raw text as its textContent. */
function codeBlock(text: string): HTMLElement {
  const pre = document.createElement('pre');
  const code = document.createElement('code');
  code.textContent = text;
  pre.appendChild(code);
  return pre;
}

function mount(...blocks: HTMLElement[]): HTMLElement {
  const root = document.createElement('div');
  blocks.forEach((b) => root.appendChild(b));
  document.body.replaceChildren(root);
  return root;
}

describe('isMermaid', () => {
  it('accepts text starting with a Mermaid keyword (AC-1)', () => {
    expect(isMermaid('graph TD\nA-->B')).toBe(true);
    expect(isMermaid('sequenceDiagram\nAlice->>Bob: hi')).toBe(true);
  });

  it('is case-insensitive on the keyword (AC-1)', () => {
    expect(isMermaid('FlowChart LR\nA-->B')).toBe(true);
  });

  it('covers every declared keyword', () => {
    for (const kw of MERMAID_KEYWORDS) {
      expect(isMermaid(`${kw}\n  rest`)).toBe(true);
    }
  });

  it('rejects non-Mermaid code (AC-2)', () => {
    expect(isMermaid('function foo(){}')).toBe(false);
    expect(isMermaid('{"a":1}')).toBe(false);
    expect(isMermaid('just some prose')).toBe(false);
  });

  it('rejects empty or whitespace-only text without throwing (AC-4)', () => {
    expect(isMermaid('')).toBe(false);
    expect(isMermaid('   \n\t  ')).toBe(false);
  });

  it('tolerates leading blank lines/whitespace before the keyword (AC-5)', () => {
    expect(isMermaid('\n\n   sequenceDiagram\nAlice->>Bob: hi')).toBe(true);
  });

  it('does not match a keyword that only appears mid-text', () => {
    expect(isMermaid('const graph = makeGraph()')).toBe(false);
  });
});

describe('findCodeBlocks', () => {
  it('returns the code block elements under the root', () => {
    const root = mount(codeBlock('graph TD'), codeBlock('noop'));
    expect(findCodeBlocks(root)).toHaveLength(2);
  });
});

describe('detectMermaidBlocks', () => {
  it('returns the Mermaid block with its verbatim source (AC-1)', () => {
    const root = mount(codeBlock('graph TD\nA-->B'));
    const found = detectMermaidBlocks(root);
    expect(found).toHaveLength(1);
    expect(found[0].source).toBe('graph TD\nA-->B');
  });

  it('ignores non-Mermaid blocks (AC-2)', () => {
    const root = mount(codeBlock('function foo(){}'));
    expect(detectMermaidBlocks(root)).toHaveLength(0);
  });

  it('returns only the Mermaid blocks among many, in order (AC-3)', () => {
    const root = mount(
      codeBlock('function a(){}'),
      codeBlock('graph TD\nA-->B'),
      codeBlock('{"x":1}'),
      codeBlock('pie title Pets'),
    );
    const found = detectMermaidBlocks(root);
    expect(found.map((f) => f.source)).toEqual(['graph TD\nA-->B', 'pie title Pets']);
  });

  it('does not crash on empty blocks (AC-4)', () => {
    const root = mount(codeBlock(''), codeBlock('   '));
    expect(detectMermaidBlocks(root)).toHaveLength(0);
  });

  it('preserves the original source including leading blank lines (AC-5)', () => {
    const raw = '\n\n   sequenceDiagram\nAlice->>Bob: hi';
    const root = mount(codeBlock(raw));
    const found = detectMermaidBlocks(root);
    expect(found).toHaveLength(1);
    expect(found[0].source).toBe(raw);
  });

  it('is idempotent — an already-detected block is not returned again (AC-6)', () => {
    const root = mount(codeBlock('graph TD\nA-->B'));
    expect(detectMermaidBlocks(root)).toHaveLength(1);
    expect(detectMermaidBlocks(root)).toHaveLength(0);
  });
});
