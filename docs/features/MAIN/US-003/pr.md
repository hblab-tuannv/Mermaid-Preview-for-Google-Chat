## Summary
Render detected Mermaid blocks to inline SVG with a safe fallback.

## What & Why
Implements `src/lib/render.ts` per ADR-MAIN-003 and wires the content script to scan-and-render on load:

- **`renderMermaidBlock({ element, source }, opts?)`** — renders one block to an `<svg>` inserted in a `data-mermaid-preview="rendered"` container right after the code block. On failure it keeps the original block and adds a light `data-mermaid-preview="error"` marker (never throws). Idempotent via a `data-mermaid-rendered` marker; each diagram gets a unique `mermaid-preview-<n>` id.
- **Safe insertion (AC-5):** SVG strings are parsed with `DOMParser(..., 'image/svg+xml')` and `importNode`d — never `innerHTML` of untrusted content, so embedded scripts do not execute.
- **`MERMAID_INIT_CONFIG`** — `securityLevel: 'strict'`, `startOnLoad: false` (AC-3).
- **Injectable `MermaidRenderer`** — the heavy `mermaid` dependency is reached only through this interface and lazily `import()`ed in the default, so all logic is unit-tested under jsdom with mocks.
- **`previewMermaidIn(root?, opts?)`** in `src/content/index.ts` — detects (US-002) then renders each block; called once on content-script load. The MutationObserver for dynamic messages is US-004.

## Related
- US: MAIN-US-003
- ADR: ADR-MAIN-003-mermaid-render

## Type of change
- [x] New feature
- [ ] Bug fix
- [ ] Breaking change
- [ ] Refactor / chore
- [ ] Documentation

## How to test
1. `npm test` → 34 tests pass; coverage 100% stmt/line, branches ≥80%.
2. `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run build` → exit 0.
3. `dist/content.js` builds (bundles Mermaid; ~3MB — see known trade-off below).

Render logic is unit-tested under jsdom with a mock renderer (`src/lib/render.test.ts`) and a `vi.mock('mermaid')` path for the default renderer. Real SVG output is verified manually in Phase 5.

## Checklist (Definition of Done)
- [x] Follows Coding Standards
- [x] Added/updated tests; CI passes
- [x] Documentation updated (ADR-MAIN-003)
- [x] No secrets/PII logged; security considered (DOMParser insertion, strict mode, no remote code)
- [x] Self-reviewed my own diff

## Screenshots / Notes
AC coverage — AC-1 (SVG inserted after block), AC-2 (syntax error → fallback, no throw; also non-SVG output → error), AC-3 (strict + startOnLoad false), AC-4 (idempotent), AC-5 (no script execution from SVG), AC-6 (unique ids).

**Known trade-off (per ADR-MAIN-003):** Mermaid is bundled eagerly, so `content.js` is ~3MB (gzip ~856kB) and loads on every Google Chat page. This is tracked tech debt; a follow-up ADR may introduce lazy-loading (`web_accessible_resources` + dynamic import) if size becomes a problem. Vite emits a chunk-size warning (non-fatal).
