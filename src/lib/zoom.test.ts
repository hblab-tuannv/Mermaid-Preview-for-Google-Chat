// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ZOOM_ATTR, attachZoom, closeActiveOverlay } from './zoom';

beforeEach(() => {
  document.body.replaceChildren();
  // Reset module-level singleton between tests by closing any open overlay.
  closeActiveOverlay();
});

afterEach(() => {
  closeActiveOverlay();
});

/**
 * A rendered block: a source <pre> followed by a preview container holding an
 * <svg>, both appended to document.body.
 */
function setup(): { source: HTMLElement; preview: HTMLElement; svg: SVGElement } {
  const source = document.createElement('pre');
  source.textContent = 'graph TD\nA-->B';
  const preview = document.createElement('div');
  preview.setAttribute('data-mermaid-preview', 'rendered');
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '200');
  svg.setAttribute('height', '150');
  preview.appendChild(svg);
  document.body.append(source, preview);
  return { source, preview, svg };
}

/** Find the overlay in the document body (if present). */
function getOverlay(): HTMLElement | null {
  return document.body.querySelector('[data-mermaid-zoom-overlay]') as HTMLElement | null;
}

/** Find the SVG stage inside the overlay. */
function getStage(overlay: HTMLElement): HTMLElement | null {
  return overlay.querySelector('[data-mermaid-zoom-stage]') as HTMLElement | null;
}

// ---------------------------------------------------------------------------
// AC-1: Button placement — after preview container, not on error blocks
// ---------------------------------------------------------------------------
describe('attachZoom — AC-1: button placement', () => {
  it('inserts a zoom button after the preview container', () => {
    const { preview } = setup();
    attachZoom(preview, document);
    const button = document.querySelector(`[${ZOOM_ATTR}]`) as HTMLButtonElement;
    expect(button).not.toBeNull();
    expect(button.tagName).toBe('BUTTON');
  });

  it('places the zoom button directly after the preview container', () => {
    const { preview } = setup();
    attachZoom(preview, document);
    // zoom button is the first sibling after preview (before toggle).
    expect(preview.nextElementSibling?.getAttribute(ZOOM_ATTR)).toBeTruthy();
  });

  it('returns the created button', () => {
    const { preview } = setup();
    const btn = attachZoom(preview, document);
    expect(btn instanceof HTMLButtonElement).toBe(true);
    expect(btn.getAttribute(ZOOM_ATTR)).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// AC-2: Idempotency — second call via renderMermaidBlock is skipped
// (the direct-call form of this test just verifies the marker/attribute exists;
// render.test.ts verifies no double-button via the HANDLED_ATTR gate)
// ---------------------------------------------------------------------------
describe('attachZoom — AC-2: single button per block', () => {
  it('ZOOM_ATTR is set on the button so the caller can guard re-attachment', () => {
    const { preview } = setup();
    const btn = attachZoom(preview, document);
    // Idempotency is enforced by callers (renderMermaidBlock HANDLED_ATTR gate);
    // the module just stamps the attribute so a query guard is possible.
    expect(btn.hasAttribute(ZOOM_ATTR)).toBe(true);
    expect(btn.getAttribute(ZOOM_ATTR)).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// AC-3: Overlay open — position:fixed, backdrop, SVG clone
// ---------------------------------------------------------------------------
describe('attachZoom click — AC-3: overlay creation', () => {
  it('creates an overlay on click', () => {
    const { preview } = setup();
    const btn = attachZoom(preview, document);
    expect(getOverlay()).toBeNull();
    btn.click();
    expect(getOverlay()).not.toBeNull();
  });

  it('overlay is appended to document.body', () => {
    const { preview } = setup();
    const btn = attachZoom(preview, document);
    btn.click();
    const overlay = getOverlay();
    expect(overlay).not.toBeNull();
    expect(document.body.contains(overlay)).toBe(true);
  });

  it('overlay has position:fixed style', () => {
    const { preview } = setup();
    const btn = attachZoom(preview, document);
    btn.click();
    const overlay = getOverlay()!;
    expect(overlay.style.position).toBe('fixed');
  });

  it('overlay has a high z-index', () => {
    const { preview } = setup();
    const btn = attachZoom(preview, document);
    btn.click();
    const overlay = getOverlay()!;
    expect(Number(overlay.style.zIndex)).toBeGreaterThan(999);
  });

  it('SVG is cloned into the overlay — original SVG remains in preview', () => {
    const { preview, svg } = setup();
    const btn = attachZoom(preview, document);
    btn.click();
    const overlay = getOverlay()!;
    const stage = getStage(overlay)!;
    const clonedSvg = stage.querySelector('svg');
    // Clone exists in overlay.
    expect(clonedSvg).not.toBeNull();
    // Original SVG is still in preview (not moved).
    expect(preview.contains(svg)).toBe(true);
    // They are different nodes.
    expect(clonedSvg).not.toBe(svg);
  });

  it('overlay has zoom-in, zoom-out and close (X) buttons', () => {
    const { preview } = setup();
    const btn = attachZoom(preview, document);
    btn.click();
    const overlay = getOverlay()!;
    expect(overlay.querySelector('[data-zoom-in]')).not.toBeNull();
    expect(overlay.querySelector('[data-zoom-out]')).not.toBeNull();
    expect(overlay.querySelector('[data-zoom-close]')).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Smoke-fix (REL-MAIN-2026-06-11-2): control icons rendered as tofu because the
// overlay buttons inherited Google Chat's icon font; the zoom button sat flush
// against the toggle; and the diagram opened at scale 1 instead of fitting.
// ---------------------------------------------------------------------------
describe('overlay controls — rendering robustness (smoke-fix)', () => {
  it('zoom-in/out/close buttons set an explicit sans-serif font-family (no icon-font inheritance)', () => {
    const { preview } = setup();
    const btn = attachZoom(preview, document);
    btn.click();
    const overlay = getOverlay()!;
    for (const sel of ['[data-zoom-in]', '[data-zoom-out]', '[data-zoom-close]']) {
      const b = overlay.querySelector(sel) as HTMLElement;
      expect(b.style.fontFamily).toMatch(/sans-serif/);
    }
  });

  it('close button uses a standard Latin glyph (U+00D7), not an icon-font-only codepoint', () => {
    const { preview } = setup();
    const btn = attachZoom(preview, document);
    btn.click();
    const overlay = getOverlay()!;
    const close = overlay.querySelector('[data-zoom-close]') as HTMLElement;
    expect(close.textContent).toBe('×');
  });

  it('overlay backdrop is blurred so the page/diagram behind stands down', () => {
    const { preview } = setup();
    const btn = attachZoom(preview, document);
    btn.click();
    const overlay = getOverlay()!;
    expect(overlay.getAttribute('style')).toMatch(/blur\(/);
  });

  it('control bar is anchored to the bottom and horizontally centered', () => {
    const { preview } = setup();
    const btn = attachZoom(preview, document);
    btn.click();
    const overlay = getOverlay()!;
    // The control bar is the parent of the zoom-in/out/close buttons.
    const controls = overlay.querySelector('[data-zoom-in]')!.parentElement as HTMLElement;
    expect(controls.style.bottom).not.toBe('');
    expect(controls.style.top).toBe('');
    // Centered via left:50% + translateX(-50%).
    expect(controls.style.left).toBe('50%');
    expect(controls.style.transform).toMatch(/translateX\(-50%\)/);
  });
});

describe('attachZoom — spacing (smoke-fix)', () => {
  it('zoom button has a right margin so it is not flush against the toggle', () => {
    const { preview } = setup();
    const btn = attachZoom(preview, document);
    expect(parseFloat(btn.style.marginRight)).toBeGreaterThan(0);
  });
});

describe('overlay open — fit to viewport (smoke-fix)', () => {
  it('scales the diagram to fit the viewport on open when layout metrics are available', () => {
    const { preview } = setup();
    // Natural stage 1000x800 in an 800x600 viewport → fit = min(0.72, 0.675).
    const rectSpy = vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
      width: 1000,
      height: 800,
      top: 0,
      left: 0,
      right: 1000,
      bottom: 800,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect);
    const origW = window.innerWidth;
    const origH = window.innerHeight;
    Object.defineProperty(window, 'innerWidth', { value: 800, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: 600, configurable: true });

    const btn = attachZoom(preview, document);
    btn.click();
    const overlay = getOverlay()!;
    const stage = getStage(overlay)!;
    const scale = parseFloat(stage.style.transform.match(/scale\(([^)]+)\)/)?.[1] ?? '1');
    expect(scale).toBeLessThan(1);
    expect(scale).toBeCloseTo(0.675, 2);

    rectSpy.mockRestore();
    Object.defineProperty(window, 'innerWidth', { value: origW, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: origH, configurable: true });
  });

  it('keeps scale 1 when layout metrics are unavailable (jsdom default rect 0)', () => {
    const { preview } = setup();
    const btn = attachZoom(preview, document);
    btn.click();
    const overlay = getOverlay()!;
    const stage = getStage(overlay)!;
    const scale = parseFloat(stage.style.transform.match(/scale\(([^)]+)\)/)?.[1] ?? '1');
    expect(scale).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// AC-4: Zoom in / zoom out / wheel changes CSS transform scale
// ---------------------------------------------------------------------------
describe('zoom controls — AC-4', () => {
  it('zoom-in button increases the scale (transform string changes)', () => {
    const { preview } = setup();
    const btn = attachZoom(preview, document);
    btn.click();
    const overlay = getOverlay()!;
    const stage = getStage(overlay)!;
    const before = stage.style.transform;
    const zoomIn = overlay.querySelector('[data-zoom-in]') as HTMLButtonElement;
    zoomIn.click();
    expect(stage.style.transform).not.toBe(before);
    // Scale should have increased.
    const scaleAfter = parseFloat(stage.style.transform.match(/scale\(([^)]+)\)/)?.[1] ?? '1');
    const scaleBefore = parseFloat(before.match(/scale\(([^)]+)\)/)?.[1] ?? '1');
    expect(scaleAfter).toBeGreaterThan(scaleBefore);
  });

  it('zoom-out button decreases the scale', () => {
    const { preview } = setup();
    const btn = attachZoom(preview, document);
    btn.click();
    const overlay = getOverlay()!;
    const stage = getStage(overlay)!;
    const before = stage.style.transform;
    const zoomOut = overlay.querySelector('[data-zoom-out]') as HTMLButtonElement;
    zoomOut.click();
    const scaleAfter = parseFloat(stage.style.transform.match(/scale\(([^)]+)\)/)?.[1] ?? '1');
    const scaleBefore = parseFloat(before.match(/scale\(([^)]+)\)/)?.[1] ?? '1');
    expect(scaleAfter).toBeLessThan(scaleBefore);
  });

  it('mouse wheel zooms in (negative deltaY)', () => {
    const { preview } = setup();
    const btn = attachZoom(preview, document);
    btn.click();
    const overlay = getOverlay()!;
    const stage = getStage(overlay)!;
    const before = stage.style.transform;
    const wheelEvent = new WheelEvent('wheel', { deltaY: -100, cancelable: true, bubbles: true });
    overlay.dispatchEvent(wheelEvent);
    const scaleAfter = parseFloat(stage.style.transform.match(/scale\(([^)]+)\)/)?.[1] ?? '1');
    const scaleBefore = parseFloat(before.match(/scale\(([^)]+)\)/)?.[1] ?? '1');
    expect(scaleAfter).toBeGreaterThan(scaleBefore);
  });

  it('mouse wheel zooms out (positive deltaY)', () => {
    const { preview } = setup();
    const btn = attachZoom(preview, document);
    btn.click();
    const overlay = getOverlay()!;
    const stage = getStage(overlay)!;
    const wheelEvent = new WheelEvent('wheel', { deltaY: 100, cancelable: true, bubbles: true });
    overlay.dispatchEvent(wheelEvent);
    const scaleAfter = parseFloat(stage.style.transform.match(/scale\(([^)]+)\)/)?.[1] ?? '1');
    expect(scaleAfter).toBeLessThan(1);
  });

  it('wheel event default is prevented (to stop page scroll)', () => {
    const { preview } = setup();
    const btn = attachZoom(preview, document);
    btn.click();
    const overlay = getOverlay()!;
    const wheelEvent = new WheelEvent('wheel', { deltaY: -100, cancelable: true, bubbles: true });
    overlay.dispatchEvent(wheelEvent);
    expect(wheelEvent.defaultPrevented).toBe(true);
  });

  it('drag changes the translate offset in the transform', () => {
    const { preview } = setup();
    const btn = attachZoom(preview, document);
    btn.click();
    const overlay = getOverlay()!;
    const stage = getStage(overlay)!;
    // Arm the drag.
    stage.dispatchEvent(new MouseEvent('mousedown', { clientX: 50, clientY: 50, bubbles: true }));
    // Move.
    document.dispatchEvent(
      new MouseEvent('mousemove', { clientX: 80, clientY: 70, bubbles: true }),
    );
    // Translate should have changed.
    const transform = stage.style.transform;
    // Transform includes translate with non-zero values.
    expect(transform).toMatch(/translate\(/);
    const match = transform.match(/translate\(([^,]+),\s*([^)]+)\)/);
    expect(match).not.toBeNull();
    const tx = parseFloat(match![1]);
    const ty = parseFloat(match![2]);
    expect(tx).not.toBe(0);
    expect(ty).not.toBe(0);
  });

  it('mouseup ends drag and removes document mousemove/mouseup listeners normally', () => {
    const { preview } = setup();
    const btn = attachZoom(preview, document);
    btn.click();
    const overlay = getOverlay()!;
    const stage = getStage(overlay)!;

    const addSpy = vi.spyOn(document, 'addEventListener');
    const removeSpy = vi.spyOn(document, 'removeEventListener');

    // Start drag.
    stage.dispatchEvent(new MouseEvent('mousedown', { clientX: 10, clientY: 10, bubbles: true }));
    expect(addSpy.mock.calls.map(([t]) => t)).toContain('mousemove');

    // End drag via normal mouseup.
    document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    const removedTypes = removeSpy.mock.calls.map(([t]) => t);
    expect(removedTypes).toContain('mousemove');
    expect(removedTypes).toContain('mouseup');

    // Cursor reverts to grab.
    expect(stage.style.cursor).toBe('grab');

    addSpy.mockRestore();
    removeSpy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// AC-5: Close paths — Esc, backdrop click, X button
//        + listener removal + focus return
// ---------------------------------------------------------------------------
describe('overlay close paths — AC-5', () => {
  it('Esc key removes the overlay from the DOM', () => {
    const { preview } = setup();
    const btn = attachZoom(preview, document);
    btn.click();
    expect(getOverlay()).not.toBeNull();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(getOverlay()).toBeNull();
  });

  it('backdrop click removes the overlay', () => {
    const { preview } = setup();
    const btn = attachZoom(preview, document);
    btn.click();
    const overlay = getOverlay()!;
    // Click on overlay itself (the backdrop area, not the stage).
    overlay.dispatchEvent(new MouseEvent('click', { bubbles: false }));
    expect(getOverlay()).toBeNull();
  });

  it('X button removes the overlay', () => {
    const { preview } = setup();
    const btn = attachZoom(preview, document);
    btn.click();
    const overlay = getOverlay()!;
    const closeBtn = overlay.querySelector('[data-zoom-close]') as HTMLButtonElement;
    closeBtn.click();
    expect(getOverlay()).toBeNull();
  });

  it('Esc returns focus to the zoom button that opened the overlay', () => {
    const { preview } = setup();
    const btn = attachZoom(preview, document);
    btn.click();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(document.activeElement).toBe(btn);
  });

  it('X close returns focus to the zoom button', () => {
    const { preview } = setup();
    const btn = attachZoom(preview, document);
    btn.click();
    const overlay = getOverlay()!;
    const closeBtn = overlay.querySelector('[data-zoom-close]') as HTMLButtonElement;
    closeBtn.click();
    expect(document.activeElement).toBe(btn);
  });

  it('document keydown listener is removed after Esc close (no listener leak)', () => {
    const addSpy = vi.spyOn(document, 'addEventListener');
    const removeSpy = vi.spyOn(document, 'removeEventListener');

    const { preview } = setup();
    const btn = attachZoom(preview, document);
    btn.click();

    // Capture all event types added during open.
    const addedTypes = addSpy.mock.calls.map(([type]) => type);
    expect(addedTypes).toContain('keydown');

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    // Every document-level listener added should have a matching remove.
    const removedTypes = removeSpy.mock.calls.map(([type]) => type);
    for (const t of addedTypes) {
      expect(removedTypes).toContain(t);
    }

    addSpy.mockRestore();
    removeSpy.mockRestore();
  });

  it('document-level drag listeners are removed when overlay closes mid-drag', () => {
    const { preview } = setup();
    const btn = attachZoom(preview, document);
    btn.click();
    const overlay = getOverlay()!;
    const stage = getStage(overlay)!;

    const addSpy = vi.spyOn(document, 'addEventListener');
    const removeSpy = vi.spyOn(document, 'removeEventListener');

    // Arm drag (adds mousemove/mouseup to document).
    stage.dispatchEvent(new MouseEvent('mousedown', { clientX: 10, clientY: 10, bubbles: true }));
    const addedTypes = addSpy.mock.calls.map(([type]) => type);
    expect(addedTypes).toContain('mousemove');
    expect(addedTypes).toContain('mouseup');

    // Close overlay mid-drag.
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    const removedTypes = removeSpy.mock.calls.map(([type]) => type);
    expect(removedTypes).toContain('mousemove');
    expect(removedTypes).toContain('mouseup');

    addSpy.mockRestore();
    removeSpy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// AC-6: resetPreviews integration — via closeActiveOverlay singleton
// ---------------------------------------------------------------------------
describe('closeActiveOverlay — AC-6', () => {
  it('is a no-op when no overlay is open', () => {
    expect(() => closeActiveOverlay()).not.toThrow();
  });

  it('closes an open overlay when called', () => {
    const { preview } = setup();
    const btn = attachZoom(preview, document);
    btn.click();
    expect(getOverlay()).not.toBeNull();
    closeActiveOverlay();
    expect(getOverlay()).toBeNull();
  });

  it('opening a second overlay closes the first (singleton)', () => {
    // First block.
    const source1 = document.createElement('pre');
    const preview1 = document.createElement('div');
    preview1.setAttribute('data-mermaid-preview', 'rendered');
    const svg1 = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    preview1.appendChild(svg1);
    document.body.append(source1, preview1);

    // Second block.
    const source2 = document.createElement('pre');
    const preview2 = document.createElement('div');
    preview2.setAttribute('data-mermaid-preview', 'rendered');
    const svg2 = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    preview2.appendChild(svg2);
    document.body.append(source2, preview2);

    const btn1 = attachZoom(preview1, document);
    const btn2 = attachZoom(preview2, document);

    btn1.click();
    expect(document.querySelectorAll('[data-mermaid-zoom-overlay]')).toHaveLength(1);

    btn2.click();
    // Only one overlay at a time.
    expect(document.querySelectorAll('[data-mermaid-zoom-overlay]')).toHaveLength(1);
  });

  it('calling closeActiveOverlay a second time is safe (idempotent)', () => {
    const { preview } = setup();
    const btn = attachZoom(preview, document);
    btn.click();
    closeActiveOverlay();
    expect(() => closeActiveOverlay()).not.toThrow();
  });
});
