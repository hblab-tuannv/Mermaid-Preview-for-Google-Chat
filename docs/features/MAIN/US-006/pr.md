---
version: "1.0"
date: "2026-06-11T16:49:55Z"
author: developer
status: open
---

## Summary

Add fullscreen-zoom overlay for rendered Mermaid diagrams, with zoom-in/out, drag-to-pan, and three close paths (Esc / backdrop / X button), wired idempotently via the renderMermaidBlock success path (ADR-MAIN-007).

## What & Why

Large Mermaid diagrams are hard to read inside Google Chat's narrow message boxes. This PR adds a zoom button to each rendered diagram that opens a full-viewport overlay containing a cloned SVG (the original SVG stays in the message, preserving the toggle from US-004). Inside the overlay, users can zoom in/out via buttons or mouse wheel, pan by dragging, and close via Esc, clicking the backdrop, or the X button.

The implementation follows ADR-MAIN-007:
- **New `src/lib/zoom.ts`**: `ZOOM_ATTR`, `attachZoom(preview, doc)`, and `closeActiveOverlay()` (module-level singleton handle for `resetPreviews`). Overlay state (scale + translate) is held in closure; CSS transform is applied for all zoom/pan operations. All document-level listeners (keydown for Esc; mousemove/mouseup for drag) are explicitly removed on every close path via a tracked listener registry — no leaks.
- **`src/lib/render.ts`** (success path only): `attachZoom(container, doc)` called immediately after `attachToggle`; error path untouched. `resetPreviews` extended to (1) call `closeActiveOverlay()` at the top and (2) remove all control siblings (toggle + zoom) by walking `nextElementSibling` and checking marker attributes — logic is order-independent per ADR guidance.
- **No new XSS surface**: only `cloneNode(true)` and `createElement`; never `innerHTML` for untrusted content; `securityLevel:'strict'` unchanged.

## Related

- US: MAIN-US-006
- ADR: ADR-MAIN-007

## Type of change

- [x] New feature

## How to test

1. Load the extension on `chat.google.com` and send a message with a Mermaid block, e.g.:
   ````
   ```mermaid
   graph TD
   A-->B-->C
   ```
   ````
2. Confirm a "Zoom" button appears next to the "View source" toggle button.
3. Click "Zoom" — a full-viewport overlay appears containing a clone of the SVG; original SVG remains in the message.
4. Click "+" / "−" to zoom in/out; scroll the mouse wheel to zoom; drag the SVG to pan.
5. Close by pressing Esc, clicking outside the SVG (backdrop), or clicking "✕" — overlay closes, focus returns to the Zoom button.
6. Open DevTools → Event Listeners on `document`; confirm no `keydown` listener remains after close.
7. Change Chat's theme (light ↔ dark) to trigger `resetPreviews`: confirm the overlay closes if open and the Zoom button is removed together with the preview container and toggle.

### Automated test evidence

```
 RUN  v4.1.8

 Test Files  11 passed (11)
      Tests  108 passed (108)
   Start at  23:49:35
   Duration  1.54s

 % Coverage report from v8
-------------|---------|----------|---------|---------|
File         | % Stmts | % Branch | % Funcs | % Lines |
-------------|---------|----------|---------|---------|
All files    |   99.06 |    89.47 |     100 |   99.34 |
 lib         |   98.98 |    88.46 |     100 |   99.29 |
  detect.ts  |     100 |       95 |     100 |     100 |
  render.ts  |     100 |       96 |     100 |     100 |
  theme.ts   |   95.12 |       92 |     100 |   94.59 |
  zoom.ts    |   99.18 |       60 |     100 |     100 |
-------------|---------|----------|---------|---------|

Statements : 99.06%  (319/322)
Branches   : 89.47%  (102/114)   > 80% threshold
Functions  : 100%    (67/67)
Lines      : 99.34%  (305/307)
```

AC coverage in `zoom.test.ts` (28 tests) and `render.test.ts` (5 new assertions):
- AC-1: button placement after preview container, not on error blocks
- AC-2: idempotency — single zoom button per block (HANDLED_ATTR gate)
- AC-3: overlay created on click, position:fixed, high z-index, SVG clone, zoom/close buttons present
- AC-4: zoom-in/zoom-out/wheel change scale; drag changes translate; mouseup ends drag and removes listeners
- AC-5: Esc/backdrop/X all close overlay + remove document-level listeners + return focus; mid-drag close removes mousemove/mouseup
- AC-6: `closeActiveOverlay()` no-op safe; closes open overlay; singleton (second open closes first); `resetPreviews` closes overlay + removes zoom button without throwing

## Checklist (Definition of Done)

- [x] Follows Coding Standards
- [x] Added/updated tests; CI passes
- [x] Documentation updated (if needed)
- [x] No secrets/PID logged; security considered
- [x] Self-reviewed my own diff

## Screenshots / Notes (optional)

- `zoom.ts` branch coverage is reported as 60% by V8 instrumentation due to null-guards (`?.()`, `if (onMouseMove)`) that are partially exercised by design — all actual AC branches are covered; overall branch coverage is 89.47% >> 80% threshold.
- Adjacency after US-006: `source → container → zoom → toggle` (zoom called after toggle, both use `preview.after()`). The `resetPreviews` walker is order-independent (scans by marker attribute), so future control additions won't break cleanup.
