---
version: "1.0"
date: "2026-06-12T02:54:12Z"
author: developer
status: open
---

## Summary

Add PNG and SVG download buttons on each rendered Mermaid diagram, with auto-fallback from PNG to SVG when the canvas is tainted (flowchart foreignObject), wired idempotently via the renderMermaidBlock success path (ADR-MAIN-008).

## What & Why

Users viewing Mermaid diagrams in Google Chat had no way to export them for use in external documents, slides, or tickets. This PR adds two download buttons ("PNG" and "SVG") to each successfully-rendered diagram, following the established control pattern (US-003/US-006): placed after the preview container via `preview.after()`, created exactly once on the success path, and cleaned up by `resetPreviews`.

Key design decisions (ADR-MAIN-008, human-approved Option A, CR-MAIN-2026-06-12-01):
- **SVG** is the universal quality path: clone the rendered SVG, ensure self-contained xmlns + width/height, serialize via XMLSerializer, save as `image/svg+xml`. Always works, no canvas, no taint risk — the "quality download" for every diagram type.
- **PNG** is best-effort: rasterize the on-screen SVG clone via `blob:URL → Image → canvas.toBlob` at `clamp(round(devicePixelRatio) || 3, 2, 4)` scale, transparent background (no fillRect). Flowchart labels render as `<foreignObject>` HTML in Mermaid 11.15.0 (empirically verified), which taints the canvas and causes `toBlob` to throw `SecurityError`. Rather than failing silently, the PNG handler **auto-falls back to saving the SVG** + shows a light non-blocking notice. Clicking PNG always yields a usable file (never a no-op).
- **Three injectable seams** (`PngRasterizer`, `BlobSaver`, `Notifier`) + pure `pngScale()` helper mirror the `MermaidRenderer` pattern from render.ts, enabling full jsdom test coverage of all logic paths including the Option-A fallback — without needing a real canvas.
- **No new XSS surface**: only `cloneNode(true)`, `createElement`, `XMLSerializer`, `Blob`; never `innerHTML` on untrusted content; `securityLevel:'strict'` unchanged; anchor-click `<a download>` (no `chrome.downloads` permission needed).

Implementation:
- **New `src/lib/download.ts`**: exports `DOWNLOAD_ATTR`, `pngScale`, interfaces (`PngRasterizer`, `BlobSaver`, `Notifier`, `DownloadOptions`), and `attachDownload(preview, doc, opts?)`. The PNG handler uses `let pngBlob: Blob; try { pngBlob = await rasterizer.toPng(...) } catch { ... return; } saver.save(pngBlob, ...)` so `saver.save` is strictly outside the try — only rasterizer rejection triggers the SVG fallback, not a saver failure.
- **`src/lib/render.ts`** (success path only): imports and calls `attachDownload(container, doc)` immediately after `attachZoom`; extends the `resetPreviews` while-condition to also remove elements with `DOWNLOAD_ATTR`.
- **New `src/lib/download.test.ts`**: 38 tests (plus 3 new test cases + 2 assertions in `render.test.ts`) covering all ACs.

## Related

- US: MAIN-US-007
- ADR: ADR-MAIN-008-download

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
2. Confirm two download buttons ("PNG" and "SVG") appear next to the "Zoom" and "View source" buttons.
3. Click "SVG" — a file `mermaid-diagram-<n>.svg` downloads; open it and verify it's a valid vector SVG with the diagram content.
4. Click "PNG" on a **flowchart** — because flowchart labels use `<foreignObject>`, the canvas becomes tainted: you should see a light toast notice ("Đã tải SVG thay PNG cho sơ đồ này") and receive the SVG file instead.
5. Click "PNG" on a **sequenceDiagram** (or other `<text>`-native diagram): PNG downloads with transparent background and crisp labels at 3x scale.
6. Verify both buttons remain visible and functional when toggling between "View source" and "View diagram" states (toggle preserves the control row).
7. Change Chat's theme (light ↔ dark) to trigger `resetPreviews`: confirm the download buttons are removed together with the preview container, zoom button, and toggle — no orphaned buttons.
8. Send two diagrams in the same message; verify filenames are `mermaid-diagram-<n>.png/svg` with different `<n>` values matching the sequential order.

### Automated test evidence

```
 RUN  v4.1.8

 Test Files  12 passed (12)
      Tests  156 passed (156)
   Start at  09:54:06
   Duration  2.01s (transform 664ms, setup 0ms, import 1.08s, tests 1.66s, environment 6.95s)

 % Coverage report from v8
--------------|---------|----------|---------|---------|
File          | % Stmts | % Branch | % Funcs | % Lines |
--------------|---------|----------|---------|---------|
All files     |   96.06 |    81.11 |   97.61 |   96.61 |
 lib          |   95.82 |       80 |    97.4 |   96.39 |
  detect.ts   |     100 |       95 |     100 |     100 |
  download.ts |   85.56 |    62.26 |    87.5 |   87.23 |
  render.ts   |     100 |    96.15 |     100 |     100 |
  theme.ts    |   95.12 |       92 |     100 |   94.59 |
  zoom.ts     |   99.25 |    68.75 |     100 |     100 |
--------------|---------|----------|---------|---------|

Statements : 96.06%  (415/432)
Branches   : 81.11%  (146/180)   > 80% threshold
Functions  : 97.61%  (82/84)
Lines      : 96.61%  (399/413)
```

AC coverage in `download.test.ts` (38 tests) and `render.test.ts` (3 new test cases + 2 new assertions):
- **AC-1**: download control attached on success path; not attached on error path (render.test.ts + download.test.ts)
- **AC-2**: DOWNLOAD_ATTR marker enables idempotency by construction (HANDLED_ATTR gate in renderMermaidBlock; render.test.ts asserts exactly one control after redundant scan)
- **AC-3**: pngScale clamping (11 unit tests); PNG rasterizer-resolve → PNG blob saved, no notice
- **AC-3b**: SecurityError → SVG blob saved + notifier.notify called exactly once; null-blob reject → same fallback; saver.save called exactly once (no double-save)
- **AC-4**: SVG button → blob type image/svg+xml containing xmlns="http://www.w3.org/2000/svg"; original SVG not moved (clone)
- **AC-5**: filename mermaid-diagram-3.png/svg from id mermaid-preview-3; mermaid-diagram-7.svg from id mermaid-preview-7; fallback counter for non-matching id
- **AC-6**: resetPreviews removes download container (render.test.ts; download.test.ts DOWNLOAD_ATTR presence check)
- **AC-7**: control placed via preview.after() — survives toggle; assertion in render.test.ts
- **AC-8**: container has exactly two buttons labeled "PNG" and "SVG"

Note on `download.ts` branch coverage (62.26% per-file): the default `PngRasterizer` implementation contains `Image.onload`/`img.onerror` callbacks that cannot fire in jsdom (no real browser Image loading). These are annotated `/* v8 ignore */` per ADR-MAIN-008 smoke gate acknowledgement. Global branch coverage 81.11% > 80% threshold. The per-file zoom.ts branch at 68.75% (same rationale as US-006 — null-guards on optional drag listeners) and download.ts raster callbacks are the only sub-80% per-file branches; all are documented and gated by the smoke gate.

## Checklist (Definition of Done)

- [x] Follows Coding Standards
- [x] Added/updated tests; CI passes
- [x] Documentation updated (if needed)
- [x] No secrets/PID logged; security considered
- [x] Self-reviewed my own diff

## Screenshots / Notes (optional)

- Sibling order after US-007: `source → container → download-container → zoom-button → toggle-button` (each uses `preview.after()`, last call wins the immediate-next slot). The `resetPreviews` walker is marker-based and order-independent — no order constraint needed.
- The `pngScale` function uses `|| 3` (not `?? 3`) because `Math.round(0) === 0` which is falsy, so DPR=0 (jsdom) correctly falls back to 3.
- `/* v8 ignore */` annotations are scoped tightly to the two browser-only code regions: `Image.onload/onerror` callback bodies in `makeDefaultRasterizer` and the 3.6s/400ms setTimeout chain in `makeDefaultNotifier`. No business logic is hidden from coverage.
