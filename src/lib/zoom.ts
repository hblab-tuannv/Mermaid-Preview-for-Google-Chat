/**
 * Fullscreen-zoom overlay for a rendered Mermaid block (ADR-MAIN-007).
 *
 * {@link attachZoom} is called once per block from the *idempotent* success
 * path of `renderMermaidBlock`, immediately after `attachToggle`, so the zoom
 * button is created exactly once by construction — no separate idempotency
 * marker is needed. The rendered SVG is **cloned** into a full-viewport overlay;
 * the original SVG in the message is never moved. All overlay-scoped listeners
 * are GC'd when the overlay is removed; document-level listeners (keydown,
 * mousemove/mouseup during drag) are explicitly removed on every close path so
 * there is no listener leak. A module-level singleton handle `closeActiveOverlay`
 * lets `resetPreviews` close an open overlay without holding a direct reference.
 */

/** Attribute marking the zoom button (used by detection/tests/cleanup). */
export const ZOOM_ATTR = 'data-mermaid-zoom';

/** Scale step for zoom-in/zoom-out buttons. */
const SCALE_STEP = 0.25;
/** Minimum scale clamp (low enough to fit very large diagrams on open). */
const SCALE_MIN = 0.1;
/** Maximum scale clamp. */
const SCALE_MAX = 8;
/** Wheel scale sensitivity per 100px of deltaY. */
const WHEEL_SENSITIVITY = 0.001;
/** Fraction of the viewport the fitted diagram fills on open (leaves a margin). */
const FIT_MARGIN = 0.9;

/**
 * Compute the scale that makes a `width`x`height` diagram fit within a
 * `vw`x`vh` viewport (contain), leaving a {@link FIT_MARGIN} gap. Returns `null`
 * when any metric is non-positive (e.g. jsdom, where layout is unavailable) so
 * the caller can keep the natural scale of 1.
 */
function computeFitScale(width: number, height: number, vw: number, vh: number): number | null {
  if (width <= 0 || height <= 0 || vw <= 0 || vh <= 0) return null;
  const fit = Math.min((vw * FIT_MARGIN) / width, (vh * FIT_MARGIN) / height);
  return Math.min(SCALE_MAX, Math.max(SCALE_MIN, fit));
}

/** Apply the current scale + offset to the stage element. */
function applyTransform(stage: HTMLElement, scale: number, tx: number, ty: number): void {
  stage.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
}

/**
 * Open the zoom overlay, clone the SVG from `preview`, wire up zoom/pan/close
 * controls, and return a `close()` handle. On open, any prior overlay is closed
 * first (singleton guarantee). Document-level listeners are tracked so they can
 * be removed on any close path (Esc / backdrop / X / programmatic).
 */
function openZoomOverlay(
  preview: HTMLElement,
  doc: Document,
  opener: HTMLButtonElement,
): () => void {
  // Close any existing overlay first (singleton).
  closeActiveOverlay();

  // Find the SVG inside the preview container.
  const svg = preview.querySelector('svg');

  // Build the overlay backdrop.
  const overlay = doc.createElement('div');
  overlay.setAttribute('data-mermaid-zoom-overlay', 'true');
  overlay.style.cssText = [
    'position:fixed',
    'inset:0',
    'z-index:2147483647',
    'background:rgba(0,0,0,0.6)',
    // Blur the page (and the original diagram) behind the overlay so the zoomed
    // clone stands out. -webkit- prefix for Chromium coverage.
    'backdrop-filter:blur(6px)',
    '-webkit-backdrop-filter:blur(6px)',
    'display:flex',
    'align-items:center',
    'justify-content:center',
    'cursor:default',
  ].join(';');

  // Control bar (bottom-center).
  const controls = doc.createElement('div');
  controls.style.cssText = [
    'position:absolute',
    'bottom:24px',
    'left:50%',
    'transform:translateX(-50%)',
    'display:flex',
    'gap:8px',
    'z-index:1',
  ].join(';');

  const makeControlBtn = (label: string, attr: string): HTMLButtonElement => {
    const btn = doc.createElement('button');
    btn.type = 'button';
    btn.setAttribute(attr, 'true');
    btn.textContent = label;
    btn.style.cssText = [
      'padding:4px 10px',
      'font-size:16px',
      // Explicit font so the control glyphs render — without this the button
      // inherits Google Chat's icon font and '+'/'−'/'×' show up as tofu boxes.
      'font-family:Arial, Helvetica, sans-serif',
      'line-height:1',
      'color:#000',
      'cursor:pointer',
      'border:1px solid #888',
      'background:#fff',
      'border-radius:4px',
    ].join(';');
    return btn;
  };

  const zoomInBtn = makeControlBtn('+', 'data-zoom-in');
  // U+2212 minus and U+00D7 multiplication sign are standard Latin glyphs (in
  // Arial/Helvetica) — not icon-font-only codepoints.
  const zoomOutBtn = makeControlBtn('−', 'data-zoom-out');
  const closeBtn = makeControlBtn('×', 'data-zoom-close');
  controls.append(zoomInBtn, zoomOutBtn, closeBtn);
  overlay.appendChild(controls);

  // Stage: holds the cloned SVG; transform is applied here.
  const stage = doc.createElement('div');
  stage.setAttribute('data-mermaid-zoom-stage', 'true');
  stage.style.cssText = [
    'display:inline-flex',
    'align-items:center',
    'justify-content:center',
    'cursor:grab',
    'transform-origin:center center',
  ].join(';');

  // Clone the SVG (never move the original).
  if (svg) {
    const cloned = svg.cloneNode(true) as SVGElement;
    stage.appendChild(cloned);
  }
  overlay.appendChild(stage);

  // Zoom/pan state held in closure.
  let scale = 1;
  let tx = 0;
  let ty = 0;
  applyTransform(stage, scale, tx, ty);

  // Document-level listener registry for deterministic cleanup.
  type DocListener = [keyof DocumentEventMap, EventListener];
  const docListeners: DocListener[] = [];
  const addDocListener = <K extends keyof DocumentEventMap>(
    type: K,
    fn: (e: DocumentEventMap[K]) => void,
  ): void => {
    doc.addEventListener(type, fn as EventListener);
    docListeners.push([type, fn as EventListener]);
  };
  const removeAllDocListeners = (): void => {
    for (const [type, fn] of docListeners) {
      doc.removeEventListener(type, fn);
    }
    docListeners.length = 0;
  };

  // ── Close ─────────────────────────────────────────────────────────────────
  const close = (): void => {
    removeAllDocListeners();
    overlay.remove();
    activeOverlayClose = null;
    opener.focus();
  };

  // ── Esc key ───────────────────────────────────────────────────────────────
  const onKeydown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') {
      close();
    }
  };
  addDocListener('keydown', onKeydown);

  // ── Backdrop click (click directly on overlay, not stage/controls) ────────
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      close();
    }
  });

  // ── Control buttons ───────────────────────────────────────────────────────
  zoomInBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    scale = Math.min(SCALE_MAX, scale + SCALE_STEP);
    applyTransform(stage, scale, tx, ty);
  });

  zoomOutBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    scale = Math.max(SCALE_MIN, scale - SCALE_STEP);
    applyTransform(stage, scale, tx, ty);
  });

  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    close();
  });

  // ── Mouse-wheel zoom ──────────────────────────────────────────────────────
  overlay.addEventListener('wheel', (e) => {
    e.preventDefault();
    const delta = -e.deltaY * WHEEL_SENSITIVITY * 100;
    scale = Math.min(SCALE_MAX, Math.max(SCALE_MIN, scale + delta));
    applyTransform(stage, scale, tx, ty);
  });

  // ── Drag-to-pan ───────────────────────────────────────────────────────────
  let dragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let dragStartTx = 0;
  let dragStartTy = 0;

  // mousemove/mouseup are attached to document so pan continues if cursor
  // leaves the stage; they are removed on mouseup AND on overlay close.
  let onMouseMove: ((e: MouseEvent) => void) | null = null;
  let onMouseUp: ((e: MouseEvent) => void) | null = null;

  stage.addEventListener('mousedown', (e) => {
    dragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    dragStartTx = tx;
    dragStartTy = ty;
    stage.style.cursor = 'grabbing';

    onMouseMove = (ev: MouseEvent): void => {
      if (!dragging) return;
      tx = dragStartTx + (ev.clientX - dragStartX);
      ty = dragStartTy + (ev.clientY - dragStartY);
      applyTransform(stage, scale, tx, ty);
    };

    onMouseUp = (): void => {
      dragging = false;
      stage.style.cursor = 'grab';
      if (onMouseMove) doc.removeEventListener('mousemove', onMouseMove);
      if (onMouseUp) doc.removeEventListener('mouseup', onMouseUp);
      // Remove from tracked list too (already fired, avoid double-remove on close).
      const mmIdx = docListeners.findIndex(([t, fn]) => t === 'mousemove' && fn === onMouseMove);
      if (mmIdx !== -1) docListeners.splice(mmIdx, 1);
      const muIdx = docListeners.findIndex(([t, fn]) => t === 'mouseup' && fn === onMouseUp);
      if (muIdx !== -1) docListeners.splice(muIdx, 1);
      onMouseMove = null;
      onMouseUp = null;
    };

    addDocListener('mousemove', onMouseMove);
    addDocListener('mouseup', onMouseUp);
  });

  doc.body.appendChild(overlay);

  // Fit the diagram to the viewport on open (contain). Measured AFTER the
  // overlay is in the DOM so the stage has real layout; guarded so jsdom (rect 0)
  // keeps the natural scale of 1.
  const view = doc.defaultView;
  const rect = stage.getBoundingClientRect();
  const fit = computeFitScale(
    rect.width,
    rect.height,
    view?.innerWidth ?? 0,
    view?.innerHeight ?? 0,
  );
  if (fit !== null) {
    scale = fit;
    applyTransform(stage, scale, tx, ty);
  }

  return close;
}

/**
 * Module-level handle to the currently active overlay's `close` function.
 * `null` when no overlay is open. Set by `openZoomOverlay`, cleared by `close`.
 * Allows `resetPreviews` to close the overlay via `closeActiveOverlay()` without
 * holding a direct teardown reference.
 */
let activeOverlayClose: (() => void) | null = null;

/**
 * Close the currently open zoom overlay, if any. No-op safe: calling when no
 * overlay is open does nothing and does not throw. Used by `resetPreviews` to
 * close any open overlay before tearing down the preview DOM (AC-6).
 */
export function closeActiveOverlay(): void {
  activeOverlayClose?.();
}

/**
 * Attach a fullscreen-zoom button for a rendered Mermaid block. The button is
 * placed immediately after the preview container so it remains visible in both
 * preview and source states (same placement as `attachToggle`). Returns the
 * button so callers/tests can drive it.
 *
 * Called exactly once per block from the success path of `renderMermaidBlock`
 * (idempotent by construction — no separate marker needed).
 */
export function attachZoom(preview: HTMLElement, doc: Document): HTMLButtonElement {
  const button = doc.createElement('button');
  button.type = 'button';
  button.setAttribute(ZOOM_ATTR, 'true');
  button.textContent = 'Zoom';
  // Gap so the zoom button is not flush against the following toggle button.
  // Only margin is set (no background/border) so it keeps the page's button look.
  button.style.marginRight = '8px';

  button.addEventListener('click', () => {
    // Set the singleton handle so resetPreviews can close it via closeActiveOverlay().
    activeOverlayClose = openZoomOverlay(preview, doc, button);
  });

  // Place the control AFTER the preview container — mirrors attachToggle placement
  // so the button survives preview/source toggling. Because attachZoom is called
  // after attachToggle, and both use preview.after(), the zoom button lands between
  // the container and the toggle: container → zoom → toggle.
  preview.after(button);
  return button;
}
