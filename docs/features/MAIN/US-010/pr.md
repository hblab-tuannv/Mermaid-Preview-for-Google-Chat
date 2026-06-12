# PR-MAIN-US-010 — Fix preview for `<br>` labels and C4 diagrams (parse SVG as text/html)

## Summary
Fix Mermaid diagrams that embed HTML inside `<foreignObject>` — line-break labels (`<br>` / `<br/>`) and the entire C4 family — wrongly falling back to the "could not render diagram" marker.

## What & Why
Implements US-010 per CR-MAIN-2026-06-12-04. `parseSvg` in `src/lib/render.ts` parsed mermaid's SVG output with the `image/svg+xml` MIME (strict XML). Mermaid emits HTML inside `<foreignObject>` for multi-line labels (void `<br>` tags) and for C4 boxes (`c4Diagram-*.mjs` uses `foreignObject`). That is valid HTML-in-SVG but NOT well-formed XML: an unclosed `<br>` makes the XML parser return a `<parsererror>` root instead of `<svg>`, so `parseSvg` returned `null` and the diagram hit the error fallback. Both reported bugs (`<br>` labels and `C4Context`) share this single root cause.

One-line fix:
- **`parseSvg`** now parses with `text/html` and selects the `<svg>` via `querySelector('svg')` instead of `documentElement`. The HTML parser is lenient about void tags and still places `<svg>`/children in the SVG namespace (foreignObject content in XHTML), so the imported node renders correctly. `DOMParser` builds an inert document — scripts never run and `importNode`'d `<script>` nodes stay inert — so the no-exec / no-`innerHTML` guarantee (ADR-MAIN-003) is preserved; the real XSS defense remains mermaid `securityLevel: 'strict'`.

No change to detect/observe/theme/zoom/download.

## Related
- US: MAIN-US-010
- ADR: none (no architectural decision reversed; ADR-MAIN-003 no-exec posture preserved)
- Source: CR-MAIN-2026-06-12-04

## Type of change
- [x] Bug fix (corrective, non-breaking)
- [ ] New feature
- [ ] Breaking change

## How verified
- TDD: added a red test reproducing the bug (SVG with `<foreignObject>` + unclosed `<br>`), then the fix made it green.
- `npx vitest run --coverage` → 189 pass.
- `npm run typecheck` (tsc --noEmit) → exit 0.
- `npm run lint` (eslint .) → exit 0.
- Empirical probe (jsdom, mermaid 11.15.0): confirmed `image/svg+xml` parse of an SVG containing `<br>` yields `parsererror`, while `text/html` parse finds the `<svg>` with the SVG namespace and the `foreignObject` intact.
