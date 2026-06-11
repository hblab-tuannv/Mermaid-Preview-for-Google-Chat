## Summary
Detect Mermaid code blocks in Google Chat messages and extract their source.

## What & Why
Implements `src/lib/detect.ts` per ADR-MAIN-002, separating the fragile DOM concern from the content heuristic:

- **`findCodeBlocks(root)`** — the single DOM-coupling point. Selects `<pre>` elements (each counted once; `textContent` already includes any inner `<code>`). Adjust here if Google Chat's markup changes.
- **`isMermaid(text)`** — trims, takes the first token, matches case-insensitively against the maintained `MERMAID_KEYWORDS` set. Empty/whitespace → false; a keyword only mid-text → false.
- **`detectMermaidBlocks(root)`** — returns `{ element, source }[]` in document order, source verbatim (untrimmed). Marks handled elements with `data-mermaid-preview="detected"` so repeated scans (the US-004 MutationObserver) never re-emit a block (idempotent).

No rendering yet — that's US-003, which consumes `{ element, source }`.

## Related
- US: MAIN-US-002
- ADR: ADR-MAIN-002-mermaid-detection

## Type of change
- [x] New feature
- [ ] Bug fix
- [ ] Breaking change
- [ ] Refactor / chore
- [ ] Documentation

## How to test
1. `npm test` → 23 tests pass, coverage 100% statements/lines, branches ≥80%.
2. `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run build` → exit 0.

Detection logic is unit-tested under jsdom (`src/lib/detect.test.ts`) — no live browser needed.

## Checklist (Definition of Done)
- [x] Follows Coding Standards
- [x] Added/updated tests; CI passes
- [x] Documentation updated (if needed)
- [x] No secrets/PII logged; security considered (reads `textContent` only — no `innerHTML`, no exec)
- [x] Self-reviewed my own diff

## Screenshots / Notes
AC coverage — AC-1 (keyword detect + verbatim source), AC-2 (no false positive on JS/JSON/text), AC-3 (only Mermaid among many, in order), AC-4 (empty/whitespace, no throw), AC-5 (leading-whitespace tolerant, source preserved), AC-6 (idempotent via data attr). **Implementation note:** the selector default is `pre` (not `pre code, pre` as sketched in the ADR) to avoid double-counting the same block — the ADR's decision (isolate the selector in one function) is unchanged.
