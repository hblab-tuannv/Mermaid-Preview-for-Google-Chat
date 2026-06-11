/**
 * Preview/source toggle for a rendered Mermaid block (ADR-MAIN-004).
 *
 * {@link attachToggle} is called once per block from the *idempotent* success
 * path of `renderMermaidBlock`, so the toggle is created exactly once by
 * construction — no separate idempotency marker is needed. Toggling only flips
 * the `hidden` attribute between the source and the preview; it never
 * re-renders (the original code block is left in the DOM by US-003), so there
 * is no new untrusted-HTML insertion and no added XSS surface.
 */

/** Attribute marking the toggle button (used by detection/tests). */
export const TOGGLE_ATTR = 'data-mermaid-toggle';

type ToggleState = 'preview' | 'source';

/**
 * Attach a preview/source toggle for a rendered Mermaid block. Defaults to
 * `preview` (source hidden, diagram shown — the approved hide-code-by-default
 * UX). Returns the button so callers/tests can drive it.
 */
export function attachToggle(
  source: HTMLElement,
  preview: HTMLElement,
  doc: Document,
): HTMLButtonElement {
  const button = doc.createElement('button');
  button.type = 'button';
  button.setAttribute(TOGGLE_ATTR, 'true');

  const apply = (state: ToggleState): void => {
    const showPreview = state === 'preview';
    preview.hidden = !showPreview;
    source.hidden = showPreview;
    button.setAttribute('data-state', state);
    // Label names the action the click will perform next.
    button.textContent = showPreview ? 'Xem mã' : 'Xem sơ đồ';
  };

  apply('preview');
  button.addEventListener('click', () => {
    const next: ToggleState =
      button.getAttribute('data-state') === 'preview' ? 'source' : 'preview';
    apply(next);
  });

  // Place the control AFTER the preview container — it must stay visible in both
  // states (a button inside the container would vanish when switched to source),
  // and this keeps US-003's `source.after(container)` adjacency intact.
  preview.after(button);
  return button;
}
