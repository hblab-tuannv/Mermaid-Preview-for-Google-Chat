/**
 * Light/dark theme detection for Mermaid rendering (ADR-MAIN-006).
 *
 * Mermaid bakes colors into the SVG at render time and has no auto light/dark
 * theme, so we pick `'dark'` vs `'default'` ourselves. Detection reads the
 * *rendered background color* behind a diagram (relative luminance) rather than
 * any Google Chat class name — that coupling is what broke before
 * (INC-MAIN-2026-06-11-02), and a luminance check survives DOM/class churn.
 */

export type MermaidTheme = 'dark' | 'default';

/** Parse an `rgb()/rgba()` color string to `[r, g, b, a]`, or null. */
function parseColor(color: string): [number, number, number, number] | null {
  const m = color.match(/rgba?\(([^)]+)\)/);
  if (!m) {
    return null;
  }
  const parts = m[1].split(',').map((s) => parseFloat(s.trim()));
  const [r, g, b] = parts;
  if ([r, g, b].some((n) => Number.isNaN(n))) {
    return null;
  }
  return [r, g, b, parts.length >= 4 ? parts[3] : 1];
}

/** WCAG relative luminance (0–1) from 0–255 sRGB channels. */
function luminance(r: number, g: number, b: number): number {
  const lin = (c: number): number => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/**
 * Choose the Mermaid theme that matches the effective background behind `el`:
 * walk up to the first ancestor with an opaque background color and compare its
 * luminance to 0.5 (dark → `'dark'`, light → `'default'`). Falls back to
 * `'default'` when nothing opaque is found.
 */
export function detectTheme(el: HTMLElement): MermaidTheme {
  const view = el.ownerDocument?.defaultView;
  let node: HTMLElement | null = el;
  while (node && view) {
    const rgba = parseColor(view.getComputedStyle(node).backgroundColor);
    if (rgba && rgba[3] > 0) {
      return luminance(rgba[0], rgba[1], rgba[2]) < 0.5 ? 'dark' : 'default';
    }
    node = node.parentElement;
  }
  return 'default';
}

export interface ThemeObserveOptions {
  /** Observer constructor; defaults to the global `MutationObserver`. */
  ObserverCtor?: typeof MutationObserver;
  /** Debounce scheduler; defaults to a `setTimeout(fn, 0)` macrotask. */
  schedule?: (fn: () => void) => void;
}

/**
 * Watch for a Google Chat theme switch. Observes *attribute* mutations on
 * `<html>` and `<body>` (where Chat flips its theme), coalesces a burst into one
 * check, and calls `onChange` only when the page-level detected theme actually
 * flips. Returns a disconnect function so the listener can be torn down (AC-6).
 */
export function observeThemeChange(
  doc: Document,
  onChange: (theme: MermaidTheme) => void,
  opts: ThemeObserveOptions = {},
): () => void {
  const ObserverCtor = opts.ObserverCtor ?? MutationObserver;
  const schedule = opts.schedule ?? ((fn) => setTimeout(fn, 0));

  let current = detectTheme(doc.body);
  let pending = false;
  const observer = new ObserverCtor(() => {
    if (pending) {
      return;
    }
    pending = true;
    schedule(() => {
      pending = false;
      const next = detectTheme(doc.body);
      if (next !== current) {
        current = next;
        onChange(next);
      }
    });
  });

  observer.observe(doc.documentElement, { attributes: true });
  observer.observe(doc.body, { attributes: true });
  return () => observer.disconnect();
}
