## Summary
Add a preview/source toggle per diagram and auto-render Mermaid in dynamically loaded messages.

## What & Why
Implements US-004 per ADR-MAIN-004 on top of US-003's renderer:

- **`src/lib/observe.ts` — `observeChildList(target, onBatch, opts?)`** — a Mermaid-agnostic wrapper over `MutationObserver`. Watches `{ childList: true, subtree: true }`, ignores mutations that add no nodes, and coalesces a burst of additions into one `onBatch` per scheduled tick. Returns a **disconnect** function (AC-6). The observer constructor and debounce scheduler are injectable for deterministic jsdom tests.
- **`src/lib/toggle.ts` — `attachToggle(source, preview, doc)`** — inserts a `data-mermaid-toggle` button after the preview container (so it stays visible in both states and keeps US-003's `source → container` adjacency). Default state **preview**: source `<pre>` hidden, diagram shown (the approved hide-code-by-default UX). Clicking flips the `hidden` attribute between source and preview — **no re-render** (AC-2); button label names the next action.
- **`src/lib/render.ts`** — the idempotent success path now calls `attachToggle` exactly once per block, so the toggle is created once **by construction** (no separate idempotency marker needed — AC-5). The error/fallback path attaches no toggle and leaves the source visible (AC-3).
- **`src/content/index.ts`** — after the initial scan, `initContentScript` wires `observeChildList(document.body, () => previewMermaidIn(document.body))` and returns the disconnect function. Re-running detection over the subtree is safe because US-002/US-003 markers short-circuit already-handled blocks (AC-4, AC-5).

## Related
- US: MAIN-US-004
- ADR: ADR-MAIN-004-live-observe-toggle

## Type of change
- [x] New feature
- [ ] Bug fix
- [ ] Breaking change
- [ ] Refactor / chore
- [ ] Documentation

## How to test
1. `npm test` → 50 tests pass; coverage 100% stmt/func/line, branches 97.87% (≥80% threshold).
2. `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run build` → exit 0.
3. `dist/content.js` + `dist/background.js` build cleanly.

Observer and toggle logic are unit-tested under jsdom with an injected fake `MutationObserver` + synchronous scheduler (`src/lib/observe.test.ts`, `src/content/index.test.ts`) and direct DOM assertions (`src/lib/toggle.test.ts`). Live behaviour in a real Google Chat session is verified manually in Phase 5.

## Checklist (Definition of Done)
- [x] Follows Coding Standards
- [x] Added/updated tests; CI passes
- [x] Documentation updated (ADR-MAIN-004 + registry)
- [x] No secrets/PII logged; security considered (toggle flips `hidden` only — no new untrusted-HTML insertion, no added XSS surface; consistent with ADR-MAIN-003)
- [x] Self-reviewed my own diff

## Screenshots / Notes
AC coverage — AC-1 (toggle attached, source hidden by default), AC-2 (flip preview↔source, no re-render, same SVG node), AC-3 (error path → no toggle, source visible), AC-4 (observer renders blocks added after load), AC-5 (re-scan does not double-render or double-toggle), AC-6 (no-Mermaid mutation produces nothing; observer disconnect tears down cleanly).

**Performance note (per ADR-MAIN-004):** the observer watches `document.body` subtree and re-scans on each coalesced batch; cost is bounded by debounce + the O(1) marker short-circuit on already-handled blocks. Scanning only `addedNodes` instead of the root is a tracked optimisation deferred as tech debt.
