## Summary
Scaffold the MV3 extension (Vite + TypeScript) and inject a content script into Google Chat.

## What & Why
US-001 lays the foundation for every later story. It establishes the build toolchain and project structure decided in ADR-MAIN-001:

- **Build:** Vite multi-entry IIFE build (`BUILD_TARGET` selects content vs background, chained in `npm run build`) because MV3 content scripts must be classic bundles; rollup can't emit IIFE for a multi-entry split build.
- **Manifest:** hand-authored `public/manifest.json`, copied verbatim into `dist/`. Manifest V3, service worker `background.js`, content script matched only to `https://chat.google.com/*`, no `permissions`/`host_permissions`/`<all_urls>` (truly minimal for this story).
- **Code:** `src/lib/logger.ts` (prefixed, injectable, framework-agnostic), `src/content/index.ts` and `src/background/index.ts` (thin entry points that log their startup). Detection/rendering arrive in later stories.
- **Toolchain:** TypeScript strict, ESLint (flat config), Prettier, Vitest + v8 coverage (threshold 80%).

## Related
- US: MAIN-US-001
- ADR: ADR-MAIN-001-mv3-vite-toolchain

## Type of change
- [x] New feature
- [ ] Bug fix
- [ ] Breaking change
- [ ] Refactor / chore
- [ ] Documentation

## How to test
1. `npm install`
2. `npm test` → 8 tests pass, coverage 100% (≥80%).
3. `npm run typecheck` and `npm run lint` → exit 0.
4. `npm run build` → `dist/` contains `content.js`, `background.js`, `manifest.json`.
5. Load `dist/` unpacked in Chrome (`chrome://extensions`, Developer mode). Open https://chat.google.com → console shows `[mermaid-preview] content script loaded`. Open another origin → no log (AC-4).

## Checklist (Definition of Done)
- [x] Follows Coding Standards
- [x] Added/updated tests; CI passes
- [x] Documentation updated (if needed)
- [x] No secrets/PII logged; security considered
- [x] Self-reviewed my own diff

## Screenshots / Notes
AC coverage: AC-1 (build → dist), AC-2 (manifest v3 + SW, `manifest.test.ts`), AC-3 (content log once, `content/index.test.ts` + `logger.test.ts`), AC-4 (matches limited to chat.google.com, `manifest.test.ts`), AC-5 (no broad/surplus permissions, `manifest.test.ts`). Manual browser verification (load unpacked) pending in Phase 5.
