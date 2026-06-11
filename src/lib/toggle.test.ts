// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { TOGGLE_ATTR, attachToggle } from './toggle';

beforeEach(() => {
  document.body.replaceChildren();
});

/** A rendered block: a source <pre> followed by a preview container holding an <svg>. */
function setup(): { source: HTMLElement; preview: HTMLElement; svg: SVGElement } {
  const source = document.createElement('pre');
  source.textContent = 'graph TD\nA-->B';
  const preview = document.createElement('div');
  preview.setAttribute('data-mermaid-preview', 'rendered');
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  preview.appendChild(svg);
  document.body.append(source, preview);
  return { source, preview, svg };
}

describe('attachToggle', () => {
  it('inserts a toggle button and defaults to preview: source hidden, diagram shown (AC-1)', () => {
    const { source, preview } = setup();
    attachToggle(source, preview, document);
    const button = document.querySelector(`[${TOGGLE_ATTR}]`) as HTMLButtonElement;
    expect(button).not.toBeNull();
    expect(button.getAttribute('data-state')).toBe('preview');
    expect(source.hidden).toBe(true);
    expect(preview.hidden).toBe(false);
  });

  it('places the button right after the preview container (always visible)', () => {
    const { source, preview } = setup();
    attachToggle(source, preview, document);
    // Button sits after the diagram; source -> preview adjacency (US-003) is kept.
    expect(preview.nextElementSibling?.getAttribute(TOGGLE_ATTR)).toBe('true');
    expect(source.nextElementSibling).toBe(preview);
  });

  it('flips preview <-> source on click without re-rendering the SVG (AC-2)', () => {
    const { source, preview, svg } = setup();
    const button = attachToggle(source, preview, document);

    button.click(); // -> source
    expect(button.getAttribute('data-state')).toBe('source');
    expect(source.hidden).toBe(false);
    expect(preview.hidden).toBe(true);
    // Same SVG node — toggling only changes visibility, never re-renders.
    expect(preview.firstElementChild).toBe(svg);

    button.click(); // -> preview again
    expect(button.getAttribute('data-state')).toBe('preview');
    expect(source.hidden).toBe(true);
    expect(preview.hidden).toBe(false);
    expect(preview.firstElementChild).toBe(svg);
  });

  it('uses an actionable label reflecting the next action', () => {
    const { source, preview } = setup();
    const button = attachToggle(source, preview, document);
    const previewLabel = button.textContent;
    button.click();
    const sourceLabel = button.textContent;
    expect(previewLabel).not.toBe(sourceLabel);
    expect(previewLabel?.length ?? 0).toBeGreaterThan(0);
    expect(sourceLabel?.length ?? 0).toBeGreaterThan(0);
  });
});
