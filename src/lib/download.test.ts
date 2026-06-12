// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DOWNLOAD_ATTR,
  type BlobSaver,
  type Notifier,
  type PngRasterizer,
  attachDownload,
  pngScale,
} from './download';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a minimal rendered preview container with an <svg id="mermaid-preview-<n>">
 * inside it and append both source and preview to document.body.
 */
function setup(svgId = 'mermaid-preview-3'): {
  source: HTMLElement;
  preview: HTMLElement;
  svg: SVGElement;
} {
  const source = document.createElement('pre');
  source.textContent = 'graph TD\nA-->B';
  const preview = document.createElement('div');
  preview.setAttribute('data-mermaid-preview', 'rendered');
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('id', svgId);
  svg.setAttribute('viewBox', '0 0 200 150');
  svg.setAttribute('width', '200');
  svg.setAttribute('height', '150');
  preview.appendChild(svg);
  document.body.append(source, preview);
  return { source, preview, svg };
}

/** Create stub injectable seams for deterministic tests. */
function makeStubs() {
  const saver: BlobSaver & { calls: Array<{ blob: Blob; filename: string }> } = {
    calls: [],
    save(blob, filename) {
      this.calls.push({ blob, filename });
    },
  };
  const notifier: Notifier & { messages: string[] } = {
    messages: [],
    notify(message) {
      this.messages.push(message);
    },
  };
  const okRasterizer: PngRasterizer = {
    toPng: vi.fn().mockResolvedValue(new Blob(['png-data'], { type: 'image/png' })),
  };
  const securityErrorRasterizer: PngRasterizer = {
    toPng: vi
      .fn()
      .mockRejectedValue(
        Object.assign(
          new DOMException('Tainted canvases may not be exported', 'SecurityError'),
          {},
        ),
      ),
  };
  const nullBlobRasterizer: PngRasterizer = {
    toPng: vi.fn().mockRejectedValue(new Error('toBlob returned null')),
  };
  return { saver, notifier, okRasterizer, securityErrorRasterizer, nullBlobRasterizer };
}

beforeEach(() => {
  document.body.replaceChildren();
});

afterEach(() => {
  document.body.replaceChildren();
});

// ---------------------------------------------------------------------------
// pngScale — pure function, no canvas
// ---------------------------------------------------------------------------
describe('pngScale — pure unit tests', () => {
  it('rounds dpr 1.5 → clamps to minimum 2 (round 2, clamp [2,4])', () => {
    expect(pngScale(1.5)).toBe(2);
  });

  it('rounds dpr 1.0 → clamps to minimum 2', () => {
    expect(pngScale(1.0)).toBe(2);
  });

  it('rounds dpr 2.0 → 2 (exact, within [2,4])', () => {
    expect(pngScale(2.0)).toBe(2);
  });

  it('rounds dpr 3.0 → 3 (exact, within [2,4])', () => {
    expect(pngScale(3.0)).toBe(3);
  });

  it('rounds dpr 4.0 → 4 (exact, at maximum)', () => {
    expect(pngScale(4.0)).toBe(4);
  });

  it('clamps dpr 5.0 → 4 (rounds to 5, clamp to max 4)', () => {
    expect(pngScale(5.0)).toBe(4);
  });

  it('fallback 3 when dpr is 0 (round(0) = 0, falsy → fallback 3)', () => {
    expect(pngScale(0)).toBe(3);
  });

  it('fallback 3 when dpr is NaN (round(NaN) = NaN, falsy → fallback 3)', () => {
    expect(pngScale(NaN)).toBe(3);
  });

  it('negative dpr: round(-1.5) = -1, truthy, clamp(-1, 2, 4) → 2', () => {
    // -1 is truthy (non-zero), so no fallback; clamp to [2,4] gives 2
    expect(pngScale(-1.5)).toBe(2);
  });

  it('rounds 2.7 → 3', () => {
    expect(pngScale(2.7)).toBe(3);
  });

  it('rounds 3.5 → 4', () => {
    expect(pngScale(3.5)).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// AC-1: attachDownload — placed after preview, marker present, two buttons
// ---------------------------------------------------------------------------
describe('attachDownload — AC-1: container placement and structure', () => {
  it('returns a container element with DOWNLOAD_ATTR', () => {
    const { preview } = setup();
    const { saver, notifier, okRasterizer } = makeStubs();
    const container = attachDownload(preview, document, {
      rasterizer: okRasterizer,
      saver,
      notifier,
    });
    expect(container.hasAttribute(DOWNLOAD_ATTR)).toBe(true);
  });

  it('places the container directly after the preview container via preview.after()', () => {
    const { preview } = setup();
    const { saver, notifier, okRasterizer } = makeStubs();
    attachDownload(preview, document, { rasterizer: okRasterizer, saver, notifier });
    expect(preview.nextElementSibling?.hasAttribute(DOWNLOAD_ATTR)).toBe(true);
  });

  it('contains exactly two buttons labeled "PNG" and "SVG"', () => {
    const { preview } = setup();
    const { saver, notifier, okRasterizer } = makeStubs();
    const container = attachDownload(preview, document, {
      rasterizer: okRasterizer,
      saver,
      notifier,
    });
    const buttons = container.querySelectorAll('button');
    expect(buttons).toHaveLength(2);
    const labels = Array.from(buttons).map((b) => b.textContent);
    expect(labels).toContain('PNG');
    expect(labels).toContain('SVG');
  });

  it('appended container is in the document body', () => {
    const { preview } = setup();
    const { saver, notifier, okRasterizer } = makeStubs();
    const container = attachDownload(preview, document, {
      rasterizer: okRasterizer,
      saver,
      notifier,
    });
    expect(document.body.contains(container)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// AC-2: Idempotency — DOWNLOAD_ATTR marker lets the caller detect re-attachment
// (authoritative idempotency test is in render.test.ts via HANDLED_ATTR gate)
// ---------------------------------------------------------------------------
describe('attachDownload — AC-2: DOWNLOAD_ATTR marker for idempotency', () => {
  it('DOWNLOAD_ATTR is set on the returned container so a caller can guard re-attachment', () => {
    const { preview } = setup();
    const { saver, notifier, okRasterizer } = makeStubs();
    const container = attachDownload(preview, document, {
      rasterizer: okRasterizer,
      saver,
      notifier,
    });
    expect(container.getAttribute(DOWNLOAD_ATTR)).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// AC-4: SVG export — serializes clone, blob is image/svg+xml with xmlns
// ---------------------------------------------------------------------------
describe('SVG button — AC-4: SVG save path', () => {
  it('SVG button triggers saver.save with a blob of type image/svg+xml', async () => {
    const { preview } = setup();
    const { saver, notifier, okRasterizer } = makeStubs();
    const container = attachDownload(preview, document, {
      rasterizer: okRasterizer,
      saver,
      notifier,
    });
    const svgBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent === 'SVG',
    )!;
    svgBtn.click();
    await vi.waitFor(() => {
      expect(saver.calls.length).toBeGreaterThan(0);
    });
    expect(saver.calls[0].blob.type).toBe('image/svg+xml');
  });

  it('SVG blob contains xmlns="http://www.w3.org/2000/svg"', async () => {
    const { preview } = setup();
    const { saver, notifier, okRasterizer } = makeStubs();
    const container = attachDownload(preview, document, {
      rasterizer: okRasterizer,
      saver,
      notifier,
    });
    const svgBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent === 'SVG',
    )!;
    svgBtn.click();
    await vi.waitFor(() => {
      expect(saver.calls.length).toBeGreaterThan(0);
    });
    const text = await saver.calls[0].blob.text();
    expect(text).toContain('xmlns="http://www.w3.org/2000/svg"');
  });

  it('SVG save does not invoke the notifier (clean success path)', async () => {
    const { preview } = setup();
    const { saver, notifier, okRasterizer } = makeStubs();
    const container = attachDownload(preview, document, {
      rasterizer: okRasterizer,
      saver,
      notifier,
    });
    const svgBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent === 'SVG',
    )!;
    svgBtn.click();
    await vi.waitFor(() => {
      expect(saver.calls.length).toBeGreaterThan(0);
    });
    expect(notifier.messages).toHaveLength(0);
  });

  it('original SVG remains in the preview container (clone — not moved)', async () => {
    const { preview, svg } = setup();
    const { saver, notifier, okRasterizer } = makeStubs();
    const container = attachDownload(preview, document, {
      rasterizer: okRasterizer,
      saver,
      notifier,
    });
    const svgBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent === 'SVG',
    )!;
    svgBtn.click();
    await vi.waitFor(() => {
      expect(saver.calls.length).toBeGreaterThan(0);
    });
    expect(preview.contains(svg)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// AC-5: Filename parsing — mermaid-diagram-<n> from svg id
// ---------------------------------------------------------------------------
describe('filename parsing — AC-5', () => {
  it('SVG button saves with filename mermaid-diagram-3.svg (n=3 from id)', async () => {
    const { preview } = setup('mermaid-preview-3');
    const { saver, notifier, okRasterizer } = makeStubs();
    const container = attachDownload(preview, document, {
      rasterizer: okRasterizer,
      saver,
      notifier,
    });
    const svgBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent === 'SVG',
    )!;
    svgBtn.click();
    await vi.waitFor(() => {
      expect(saver.calls.length).toBeGreaterThan(0);
    });
    expect(saver.calls[0].filename).toBe('mermaid-diagram-3.svg');
  });

  it('PNG button (ok rasterizer) saves with filename mermaid-diagram-3.png (n=3)', async () => {
    const { preview } = setup('mermaid-preview-3');
    const { saver, notifier, okRasterizer } = makeStubs();
    const container = attachDownload(preview, document, {
      rasterizer: okRasterizer,
      saver,
      notifier,
    });
    const pngBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent === 'PNG',
    )!;
    pngBtn.click();
    await vi.waitFor(() => {
      expect(saver.calls.length).toBeGreaterThan(0);
    });
    expect(saver.calls[0].filename).toBe('mermaid-diagram-3.png');
  });

  it('filename uses a different index when svg id is mermaid-preview-7', async () => {
    const { preview } = setup('mermaid-preview-7');
    const { saver, notifier, okRasterizer } = makeStubs();
    const container = attachDownload(preview, document, {
      rasterizer: okRasterizer,
      saver,
      notifier,
    });
    const svgBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent === 'SVG',
    )!;
    svgBtn.click();
    await vi.waitFor(() => {
      expect(saver.calls.length).toBeGreaterThan(0);
    });
    expect(saver.calls[0].filename).toBe('mermaid-diagram-7.svg');
  });

  it('falls back to a local counter when svg id does not match mermaid-preview-<n>', async () => {
    const source = document.createElement('pre');
    const preview = document.createElement('div');
    preview.setAttribute('data-mermaid-preview', 'rendered');
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('id', 'custom-id-999');
    preview.appendChild(svg);
    document.body.append(source, preview);

    const { saver, notifier, okRasterizer } = makeStubs();
    const container = attachDownload(preview, document, {
      rasterizer: okRasterizer,
      saver,
      notifier,
    });
    const svgBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent === 'SVG',
    )!;
    svgBtn.click();
    await vi.waitFor(() => {
      expect(saver.calls.length).toBeGreaterThan(0);
    });
    // Fallback counter — filename must match the pattern (not empty)
    expect(saver.calls[0].filename).toMatch(/^mermaid-diagram-\d+\.svg$/);
  });
});

// ---------------------------------------------------------------------------
// AC-3: PNG resolve → PNG saved, no notice
// ---------------------------------------------------------------------------
describe('PNG button — AC-3: PNG resolve path', () => {
  it('calls saver.save with image/png blob when rasterizer resolves', async () => {
    const { preview } = setup();
    const { saver, notifier, okRasterizer } = makeStubs();
    const container = attachDownload(preview, document, {
      rasterizer: okRasterizer,
      saver,
      notifier,
    });
    const pngBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent === 'PNG',
    )!;
    pngBtn.click();
    await vi.waitFor(() => {
      expect(saver.calls.length).toBeGreaterThan(0);
    });
    expect(saver.calls[0].blob.type).toBe('image/png');
  });

  it('does NOT invoke notifier when PNG resolves successfully', async () => {
    const { preview } = setup();
    const { saver, notifier, okRasterizer } = makeStubs();
    const container = attachDownload(preview, document, {
      rasterizer: okRasterizer,
      saver,
      notifier,
    });
    const pngBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent === 'PNG',
    )!;
    pngBtn.click();
    await vi.waitFor(() => {
      expect(saver.calls.length).toBeGreaterThan(0);
    });
    expect(notifier.messages).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// AC-3b: PNG SecurityError → fallback SVG + notice once
// ---------------------------------------------------------------------------
describe('PNG button — AC-3b: SecurityError → auto-fallback SVG', () => {
  it('saves an SVG blob (not PNG) when rasterizer rejects with SecurityError', async () => {
    const { preview } = setup();
    const { saver, notifier, securityErrorRasterizer } = makeStubs();
    const container = attachDownload(preview, document, {
      rasterizer: securityErrorRasterizer,
      saver,
      notifier,
    });
    const pngBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent === 'PNG',
    )!;
    pngBtn.click();
    await vi.waitFor(() => {
      expect(saver.calls.length).toBeGreaterThan(0);
    });
    expect(saver.calls[0].blob.type).toBe('image/svg+xml');
  });

  it('saves with .svg filename on SecurityError fallback', async () => {
    const { preview } = setup('mermaid-preview-3');
    const { saver, notifier, securityErrorRasterizer } = makeStubs();
    const container = attachDownload(preview, document, {
      rasterizer: securityErrorRasterizer,
      saver,
      notifier,
    });
    const pngBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent === 'PNG',
    )!;
    pngBtn.click();
    await vi.waitFor(() => {
      expect(saver.calls.length).toBeGreaterThan(0);
    });
    expect(saver.calls[0].filename).toBe('mermaid-diagram-3.svg');
  });

  it('calls notifier.notify exactly once on SecurityError fallback', async () => {
    const { preview } = setup();
    const { saver, notifier, securityErrorRasterizer } = makeStubs();
    const container = attachDownload(preview, document, {
      rasterizer: securityErrorRasterizer,
      saver,
      notifier,
    });
    const pngBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent === 'PNG',
    )!;
    pngBtn.click();
    await vi.waitFor(() => {
      expect(notifier.messages.length).toBeGreaterThan(0);
    });
    expect(notifier.messages).toHaveLength(1);
  });

  it('saver.save is called exactly once (not zero, not twice) on fallback', async () => {
    const { preview } = setup();
    const { saver, notifier, securityErrorRasterizer } = makeStubs();
    const container = attachDownload(preview, document, {
      rasterizer: securityErrorRasterizer,
      saver,
      notifier,
    });
    const pngBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent === 'PNG',
    )!;
    pngBtn.click();
    await vi.waitFor(() => {
      expect(saver.calls.length).toBeGreaterThan(0);
    });
    expect(saver.calls).toHaveLength(1);
  });

  it('notifier.notify is not called if PNG resolves (no spurious notice)', async () => {
    const { preview } = setup();
    const { saver, notifier, okRasterizer } = makeStubs();
    const container = attachDownload(preview, document, {
      rasterizer: okRasterizer,
      saver,
      notifier,
    });
    const pngBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent === 'PNG',
    )!;
    pngBtn.click();
    await vi.waitFor(() => {
      expect(saver.calls.length).toBeGreaterThan(0);
    });
    expect(notifier.messages).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// AC-3b: PNG null blob → same fallback as SecurityError
// ---------------------------------------------------------------------------
describe('PNG button — AC-3b: null-blob reject → same fallback', () => {
  it('saves SVG + notifies when rasterizer rejects with a generic error (null blob path)', async () => {
    const { preview } = setup('mermaid-preview-5');
    const { saver, notifier, nullBlobRasterizer } = makeStubs();
    const container = attachDownload(preview, document, {
      rasterizer: nullBlobRasterizer,
      saver,
      notifier,
    });
    const pngBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent === 'PNG',
    )!;
    pngBtn.click();
    await vi.waitFor(() => {
      expect(saver.calls.length).toBeGreaterThan(0);
    });
    expect(saver.calls[0].blob.type).toBe('image/svg+xml');
    expect(saver.calls[0].filename).toBe('mermaid-diagram-5.svg');
    expect(notifier.messages).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// DOWNLOAD_ATTR constant export
// ---------------------------------------------------------------------------
describe('DOWNLOAD_ATTR constant', () => {
  it('is exported as a non-empty string', () => {
    expect(typeof DOWNLOAD_ATTR).toBe('string');
    expect(DOWNLOAD_ATTR.length).toBeGreaterThan(0);
  });

  it('equals "data-mermaid-download"', () => {
    expect(DOWNLOAD_ATTR).toBe('data-mermaid-download');
  });
});

// ---------------------------------------------------------------------------
// Edge case: no SVG found in preview — early-return branches
// ---------------------------------------------------------------------------
describe('edge cases — no SVG in preview', () => {
  it('SVG button is a no-op (no saver call) when preview has no <svg>', async () => {
    // Preview with no svg child
    const preview = document.createElement('div');
    preview.setAttribute('data-mermaid-preview', 'rendered');
    document.body.appendChild(preview);

    const { saver, notifier, okRasterizer } = makeStubs();
    const container = attachDownload(preview, document, {
      rasterizer: okRasterizer,
      saver,
      notifier,
    });
    const svgBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent === 'SVG',
    )!;
    svgBtn.click();
    // Wait a tick — no async work to flush, just verify no call happened.
    await Promise.resolve();
    expect(saver.calls).toHaveLength(0);
  });

  it('PNG button is a no-op (no saver call) when preview has no <svg>', async () => {
    const preview = document.createElement('div');
    preview.setAttribute('data-mermaid-preview', 'rendered');
    document.body.appendChild(preview);

    const { saver, notifier, okRasterizer } = makeStubs();
    const container = attachDownload(preview, document, {
      rasterizer: okRasterizer,
      saver,
      notifier,
    });
    const pngBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent === 'PNG',
    )!;
    pngBtn.click();
    await Promise.resolve();
    await Promise.resolve(); // two ticks for the async arrow
    expect(saver.calls).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Default notifier — exercises makeDefaultNotifier via jsdom DOM
// ---------------------------------------------------------------------------
describe('default notifier — makeDefaultNotifier', () => {
  it('appends a toast div to the body when notify is called', () => {
    // Call attachDownload with only rasterizer injected, letting notifier use default.
    // Then trigger the fallback path to invoke the default notifier.
    const { preview } = setup();
    const { saver, securityErrorRasterizer } = makeStubs();
    // Only inject rasterizer + saver; notifier uses the real default.
    const container = attachDownload(preview, document, {
      rasterizer: securityErrorRasterizer,
      saver,
    });
    const pngBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent === 'PNG',
    )!;
    pngBtn.click();
    // After the async handler resolves, a [data-mermaid-notice] toast should exist.
    return vi.waitFor(() => {
      expect(document.querySelector('[data-mermaid-notice]')).not.toBeNull();
    });
  });
});

// ---------------------------------------------------------------------------
// Default saver — exercises makeDefaultSaver via jsdom URL.createObjectURL
// ---------------------------------------------------------------------------
describe('default saver — makeDefaultSaver', () => {
  it('creates an anchor element and triggers click (URL.createObjectURL path)', async () => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);

    const { preview } = setup();
    // Let saver + notifier use defaults; rasterizer and notifier both injected.
    const { notifier, okRasterizer } = makeStubs();
    // Use the real default saver by not injecting saver.
    const container = attachDownload(preview, document, {
      rasterizer: okRasterizer,
      notifier,
    });
    const svgBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent === 'SVG',
    )!;
    // Spy on anchor click to avoid actual file download.
    const origCreate = document.createElement.bind(document);
    let anchorClicked = false;
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = origCreate(tag);
      if (tag === 'a') {
        vi.spyOn(el as HTMLAnchorElement, 'click').mockImplementation(() => {
          anchorClicked = true;
        });
      }
      return el;
    });

    svgBtn.click();
    await vi.waitFor(() => {
      expect(anchorClicked).toBe(true);
    });
    expect(URL.createObjectURL).toHaveBeenCalled();

    vi.restoreAllMocks();
  });
});
