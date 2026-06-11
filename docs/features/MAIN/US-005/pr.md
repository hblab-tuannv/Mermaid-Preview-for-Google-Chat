## Summary
Auto-render Mermaid in a light/dark theme matching Google Chat, and re-theme all diagrams when Chat's theme flips.

## What & Why
Implements US-005 per ADR-MAIN-006:

- **`src/lib/theme.ts`**
  - **`detectTheme(el)`** — walks up to the first ancestor with an opaque background and picks `'dark'` vs `'default'` by WCAG relative luminance (threshold 0.5). Reads the *rendered background color*, not any Google Chat class name — deliberately class-agnostic so it survives DOM churn (the coupling that caused INC-MAIN-2026-06-11-02). Falls back to `'default'`.
  - **`observeThemeChange(doc, onChange, opts?)`** — observes attribute mutations on `<html>`+`<body>`, debounced, and calls `onChange(theme)` only when the page-level detected theme actually flips. Returns a disconnect function. Observer/scheduler injectable for jsdom tests.
- **`src/lib/render.ts`**
  - `MermaidRenderer.render(id, source, theme?)`; the default renderer sets the theme via **`mermaid.initialize({...config, theme})`** (host config, re-init only when theme changes) — **not** a `%%{init}%%` directive, which is constrained under `securityLevel: 'strict'`. `renderMermaidBlock` passes `opts.theme ?? detectTheme(element)`.
  - **`resetPreviews(root)`** — removes each rendered/errored container + its toggle, clears the detect/render markers, unhides the source, so a fresh detect→render pass re-themes from scratch.
- **`src/content/index.ts`** — wires `observeThemeChange`: on a theme flip it calls `resetPreviews(body)` then `previewMermaidIn(body)`, re-rendering every diagram at the new theme. Disconnect tears down both observers.

## Related
- US: MAIN-US-005
- ADR: ADR-MAIN-006-auto-theme

## Type of change
- [x] New feature
- [ ] Bug fix
- [ ] Breaking change
- [ ] Refactor / chore
- [ ] Documentation

## How to test
1. `npm test` → 75 tests pass; coverage 98.97% stmt / 95.69% branch (≥80%).
2. `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run build` → exit 0; `dist/content.js` verified ASCII-only.

Detection, themed render, reset and the theme-change observer are unit-tested under jsdom with injected fakes and inline background colors (`theme.test.ts`, `render.test.ts`, `content/index.test.ts`). Real light↔dark behaviour in Google Chat is verified manually (Phase 5).

## Checklist (Definition of Done)
- [x] Follows Coding Standards
- [x] Added/updated tests; CI passes
- [x] Documentation updated (ADR-MAIN-006 + registry)
- [x] No secrets/PII logged; security considered (securityLevel stays 'strict'; theme via host config, no directive; no untrusted HTML)
- [x] Self-reviewed my own diff

## Screenshots / Notes
AC coverage — AC-1 (dark/light by background luminance + passed to renderer), AC-2 (transparent → 'default' fallback), AC-3 (theme via `initialize`, strict kept), AC-4 (theme flip resets + re-renders all; no-op when unchanged), AC-5 (`resetPreviews` clears containers/toggles/markers, unhides source, incl. error blocks), AC-6 (observes html/body attributes, debounced, disconnect).

**Trade-off (per ADR-MAIN-006):** reset+rescan returns a diagram showing "source" back to "preview" on a theme flip (rare); the 0.5 luminance threshold is a heuristic.
