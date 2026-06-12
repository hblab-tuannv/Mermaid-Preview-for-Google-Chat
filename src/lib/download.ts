/**
 * Download controls (PNG + SVG) for a rendered Mermaid block (ADR-MAIN-008).
 *
 * {@link attachDownload} is called once per block from the *idempotent* success
 * path of `renderMermaidBlock`, immediately after `attachZoom`, so the two
 * download buttons are created exactly once by construction — no separate
 * idempotency marker is needed. The rendered SVG is **cloned** for both export
 * paths; the original SVG in the message is never moved. All export work runs
 * inside async click handlers and never throws into the render path.
 *
 * PNG is best-effort (ADR-MAIN-008 Option A): when the canvas is tainted (most
 * commonly a flowchart whose labels are rendered as {@code <foreignObject>}
 * HTML), `toBlob` throws a SecurityError. The handler catches this and
 * **automatically falls back to saving the SVG** with a light non-blocking
 * notice — the user always receives a usable file, never a silent no-op.
 *
 * SVG export is the universal quality path: clone → self-contained xmlns +
 * width/height → XMLSerializer → Blob → save. No canvas, no taint risk.
 */

import { LOG_PREFIX } from './logger';

/** Attribute marking the download control container (used by cleanup/tests). */
export const DOWNLOAD_ATTR = 'data-mermaid-download';

// ---------------------------------------------------------------------------
// Injectable seams (mirror MermaidRenderer from render.ts)
// ---------------------------------------------------------------------------

/**
 * Injectable raster seam: turns a self-contained SVG string into a PNG blob.
 * Default impl uses blob-URL + {@code <img>} + {@code <canvas>.toBlob};
 * tests inject a stub.
 *
 * Option-A fallback contract: on a tainted canvas (flowchart foreignObject)
 * the default impl REJECTS with a DOMException 'SecurityError' from
 * `canvas.toBlob`, and if toBlob yields a null blob it also REJECTS. The PNG
 * handler keys off any rejection to fall back to SVG.
 */
export interface PngRasterizer {
  toPng(svgString: string, width: number, height: number, scale: number): Promise<Blob>;
}

/**
 * Injectable file-save seam: {@code <a download>} + objectURL + revoke.
 * Separated so filename/cleanup logic is testable without URL.createObjectURL.
 */
export interface BlobSaver {
  save(blob: Blob, filename: string): void;
}

/**
 * Injectable non-blocking user notice (Option-A fallback message).
 * Default impl shows a light transient toast in the page; tests inject a spy.
 * Must never throw or block.
 */
export interface Notifier {
  notify(message: string): void;
}

/** Injectable options — all optional; defaults are the real browser implementations. */
export interface DownloadOptions {
  /** Default: real canvas-raster path (blob-URL + img + canvas.toBlob). */
  rasterizer?: PngRasterizer;
  /** Default: anchor-click path with URL.createObjectURL / revokeObjectURL. */
  saver?: BlobSaver;
  /** Default: light transient toast; fired by PNG → SVG fallback. */
  notifier?: Notifier;
}

// ---------------------------------------------------------------------------
// Module-level fallback counter for filenames when the SVG id regex misses.
// ---------------------------------------------------------------------------
let fallbackCounter = 0;

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

/**
 * Compute the integer raster scale from `devicePixelRatio`.
 * Formula: `clamp(round(dpr) || 3, 2, 4)`.
 * - Rounds to the nearest integer first.
 * - Falls back to 3 when the rounded value is 0, NaN, or otherwise falsy
 *   (e.g. jsdom where dpr is 0 or undefined).
 * - Clamps to [2, 4] for a balance of quality vs memory.
 *
 * This is a pure function (no canvas) so it is unit-testable directly.
 */
export function pngScale(dpr: number): number {
  const rounded = Math.round(dpr) || 3;
  return Math.min(4, Math.max(2, rounded));
}

/**
 * Serialize the clone of `svgEl` into a self-contained SVG string.
 * Ensures `xmlns` and `width`/`height` are set so the file is valid as a
 * standalone document (required for both SVG export and PNG rasterization).
 */
function serializeSvg(svgEl: SVGElement, doc: Document): string {
  const clone = svgEl.cloneNode(true) as SVGElement;

  // Ensure the SVG namespace is present (required for standalone file validity).
  if (!clone.getAttribute('xmlns')) {
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  }
  // Preserve xhtml namespace if any <foreignObject> content is present.
  if (clone.querySelector('foreignObject') && !clone.getAttribute('xmlns:xhtml')) {
    clone.setAttribute('xmlns:xhtml', 'http://www.w3.org/1999/xhtml');
  }

  // Ensure explicit width/height for standalone use (derive from viewBox if absent).
  if (!clone.getAttribute('width') || !clone.getAttribute('height')) {
    const vb = clone.getAttribute('viewBox');
    if (vb) {
      const parts = vb.trim().split(/[\s,]+/);
      if (parts.length === 4) {
        if (!clone.getAttribute('width')) clone.setAttribute('width', parts[2]);
        if (!clone.getAttribute('height')) clone.setAttribute('height', parts[3]);
      }
    }
    // If still missing, fall back to the rendered bounding rect.
    if (!clone.getAttribute('width') || !clone.getAttribute('height')) {
      const rect = svgEl.getBoundingClientRect();
      if (rect.width > 0 && !clone.getAttribute('width')) {
        clone.setAttribute('width', String(rect.width));
      }
      if (rect.height > 0 && !clone.getAttribute('height')) {
        clone.setAttribute('height', String(rect.height));
      }
    }
  }

  // Use a scratch <div> so XMLSerializer gets a properly-namespaced node.
  const scratch = doc.createElement('div');
  scratch.appendChild(clone);
  return new XMLSerializer().serializeToString(scratch.firstElementChild!);
}

/**
 * Parse the diagram index `<n>` from the rendered SVG's id attribute
 * (`mermaid-preview-<n>`, set by `nextDiagramId` in render.ts, US-003).
 * Returns the string index on match, or increments and returns a local
 * fallback counter when the id does not match.
 */
function parseDiagramIndex(preview: HTMLElement): string {
  const svg = preview.querySelector('svg');
  const id = svg?.getAttribute('id') ?? '';
  const match = /^mermaid-preview-(\d+)$/.exec(id);
  if (match) {
    return match[1];
  }
  fallbackCounter += 1;
  return String(fallbackCounter);
}

// ---------------------------------------------------------------------------
// Default browser implementations
// ---------------------------------------------------------------------------

/**
 * Real PNG rasterizer: self-contained SVG → blob-URL → Image → canvas.toBlob.
 * NOT testable in jsdom (Image/canvas are unavailable) — covered by smoke gate
 * (ADR-MAIN-008). Tests inject a stub instead.
 *
 * Revokes the blob-URL on both success and error paths (no object-URL leak).
 * Rejects on SecurityError (tainted canvas from foreignObject) or null blob —
 * the caller's PNG handler catches these and falls back to SVG.
 */
function makeDefaultRasterizer(): PngRasterizer {
  return {
    toPng(svgString, width, height, scale): Promise<Blob> {
      return new Promise<Blob>((resolve, reject) => {
        const svgBlob = new Blob([svgString], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(svgBlob);

        const img = new Image();
        /* v8 ignore start — Image.onload/onerror require a real browser; covered by smoke gate (ADR-MAIN-008) */
        img.onload = () => {
          URL.revokeObjectURL(url);
          try {
            const canvas = document.createElement('canvas');
            canvas.width = width * scale;
            canvas.height = height * scale;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              reject(new Error('Could not get 2d context'));
              return;
            }
            ctx.scale(scale, scale);
            ctx.drawImage(img, 0, 0);
            // No ctx.fillRect — canvas is transparent by default (AC-3).
            canvas.toBlob((blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error('canvas.toBlob returned null'));
              }
            }, 'image/png');
          } catch (err) {
            reject(err);
          }
        };
        img.onerror = () => {
          URL.revokeObjectURL(url);
          reject(new Error('Failed to load SVG as image'));
        };
        /* v8 ignore stop */
        img.src = url;
      });
    },
  };
}

/**
 * Real BlobSaver: creates an anchor element with the object URL, clicks it,
 * then revokes the URL on the next tick (so the download navigation is not
 * interrupted by an immediate revoke).
 */
function makeDefaultSaver(): BlobSaver {
  return {
    save(blob, filename) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      // Revoke after the browser has initiated the download.
      setTimeout(() => URL.revokeObjectURL(url), 0);
    },
  };
}

/**
 * Real Notifier: injects a light transient toast into the page. The toast
 * appears in the top-right corner and fades out after 4 seconds. Uses only
 * DOM the extension owns (createElement + inline style) — no innerHTML of
 * untrusted content, no added XSS surface (ADR-MAIN-008 NFR).
 */
function makeDefaultNotifier(doc: Document): Notifier {
  return {
    notify(message) {
      const toast = doc.createElement('div');
      toast.setAttribute('data-mermaid-notice', 'true');
      toast.textContent = message;
      toast.style.cssText = [
        'position:fixed',
        'top:16px',
        'right:16px',
        'z-index:2147483646',
        'background:rgba(0,0,0,0.75)',
        'color:#fff',
        'padding:8px 14px',
        'border-radius:6px',
        'font-family:Arial,Helvetica,sans-serif',
        'font-size:13px',
        'pointer-events:none',
        'transition:opacity 0.4s',
      ].join(';');
      doc.body.appendChild(toast);
      // Begin fade-out after 3.6 s, fully gone at 4 s.
      /* v8 ignore next 4 — long timers not fired in unit tests; visual fade tested by smoke gate */
      setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 400);
      }, 3600);
    },
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Attach PNG and SVG download buttons for a rendered Mermaid block. Returns
 * the control container (two buttons) placed via {@code preview.after()},
 * mirroring {@link attachZoom} placement so the buttons survive preview/source
 * toggling (AC-7) and are removed by `resetPreviews` (AC-6).
 *
 * Called exactly once per block from the success path of `renderMermaidBlock`
 * (idempotent by construction — no separate marker needed).
 * The error path intentionally does NOT call this (AC-1).
 *
 * @param preview - The rendered preview container (`data-mermaid-preview="rendered"`).
 * @param doc - The owner document; used to create nodes.
 * @param opts - Optional injectable seams (rasterizer / saver / notifier) for testing.
 */
export function attachDownload(
  preview: HTMLElement,
  doc: Document,
  opts: DownloadOptions = {},
): HTMLElement {
  const rasterizer = opts.rasterizer ?? makeDefaultRasterizer();
  const saver = opts.saver ?? makeDefaultSaver();
  const notifier = opts.notifier ?? makeDefaultNotifier(doc);

  // Parse the diagram index from the inner SVG id for stable filenames (AC-5).
  const index = parseDiagramIndex(preview);
  const baseName = `mermaid-diagram-${index}`;

  // Build the control container.
  const container = doc.createElement('div');
  container.setAttribute(DOWNLOAD_ATTR, 'true');
  container.style.cssText = 'display:inline-flex;gap:4px;margin-right:4px;';

  const makeBtn = (label: string): HTMLButtonElement => {
    const btn = doc.createElement('button');
    btn.type = 'button';
    btn.textContent = label;
    btn.style.cssText = [
      'padding:2px 8px',
      'font-size:12px',
      'font-family:Arial,Helvetica,sans-serif',
      'line-height:1.4',
      'color:#000',
      'cursor:pointer',
      'border:1px solid #888',
      'background:#fff',
      'border-radius:4px',
    ].join(';');
    return btn;
  };

  // ── SVG button ─────────────────────────────────────────────────────────────
  // Always works: clone → self-contained → Blob → save. No canvas, no taint.
  const svgBtn = makeBtn('SVG');
  svgBtn.addEventListener('click', () => {
    const svgEl = preview.querySelector('svg') as SVGElement | null;
    if (!svgEl) {
      console.debug(`${LOG_PREFIX} download: no SVG found in preview`);
      return;
    }
    const svgString = serializeSvg(svgEl, doc);
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    saver.save(blob, `${baseName}.svg`);
  });

  // ── PNG button ─────────────────────────────────────────────────────────────
  // Best-effort: rasterize via Image + canvas. On SecurityError (tainted canvas
  // from foreignObject) or any other raster failure: AUTO-FALLBACK to SVG +
  // notice (Option A — ADR-MAIN-008). Never throws into the render path.
  const pngBtn = makeBtn('PNG');
  pngBtn.addEventListener('click', () => {
    void (async () => {
      const svgEl = preview.querySelector('svg') as SVGSVGElement | null;
      if (!svgEl) {
        console.debug(`${LOG_PREFIX} download: no SVG found in preview for PNG export`);
        return;
      }
      const svgString = serializeSvg(svgEl, doc);
      const w = svgEl.viewBox.baseVal.width || svgEl.getBoundingClientRect().width || 300;
      const h = svgEl.viewBox.baseVal.height || svgEl.getBoundingClientRect().height || 200;
      const scale = pngScale(window.devicePixelRatio);

      // Rasterize. On any failure (SecurityError from tainted canvas, null blob, etc.)
      // fall back to saving the SVG with a notice (Option A — ADR-MAIN-008 §2).
      // saver.save for PNG is intentionally OUTSIDE the try: only rasterizer rejection
      // triggers the SVG fallback; a saver error is not a rasterization failure.
      let pngBlob: Blob;
      try {
        pngBlob = await rasterizer.toPng(svgString, w, h, scale);
      } catch {
        const svgBlob = new Blob([svgString], { type: 'image/svg+xml' });
        saver.save(svgBlob, `${baseName}.svg`);
        notifier.notify('Đã tải SVG thay PNG cho sơ đồ này');
        return;
      }
      saver.save(pngBlob, `${baseName}.png`);
    })();
  });

  container.append(pngBtn, svgBtn);

  // Place AFTER the preview container — mirrors attachZoom/attachToggle so the
  // control survives toggle and is removed by resetPreviews (AC-6, AC-7).
  preview.after(container);

  return container;
}
