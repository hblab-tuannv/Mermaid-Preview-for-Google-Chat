---
id: REVIEW-MAIN-US-002
version: "1.0"
date: "2026-06-11T12:18:42Z"
author: "code-reviewer"
status: "Approve"
approver: "code-reviewer"
story: "MAIN-US-002"
pr: "PR-MAIN-US-002"
adr: "ADR-MAIN-002-mermaid-detection"
---

# Code Review — REVIEW-MAIN-US-002

Story: MAIN-US-002 · PR: PR-MAIN-US-002 · ADR: ADR-MAIN-002-mermaid-detection
Reviewer is independent (did not author the code).

## CI / automated checks (run by reviewer)
- `npm test` → 23 tests pass (5 files). Coverage: statements 100%, lines 100%, functions 100%, branches 90.9% overall / 87.5% on `detect.ts` (≥ 80% min). Green.
- `npm run typecheck` (`tsc --noEmit`, strict) → exit 0.
- `npm run lint` (eslint) → exit 0.
- `npm run format:check` (prettier) → exit 0.
- `npm run build` (content + background + manifest copy) → exit 0.

Entry gate satisfied: CI is green.

## AC coverage verification
Each AC is exercised by a test that fails if the behavior breaks:
- **AC-1** (keyword detect + verbatim source, no HTML tags) — covered by `isMermaid` accept/case-insensitive tests and `detectMermaidBlocks` verbatim-source test. The "verbatim text, no HTML tags" half is asserted by construction only (test blocks set `code.textContent`, so there are no child tags to strip). The code is correct (`textContent` concatenates descendant text and drops tags), but the no-tags guarantee is not directly exercised. See Nit-1.
- **AC-2** (no false positive on JS/JSON/prose) — covered (`isMermaid` reject test + `detectMermaidBlocks` ignore test). Fails if heuristic broadens.
- **AC-3** (only Mermaid among many, in document order) — covered; asserts exact ordered source list `['graph TD...', 'pie title Pets']`.
- **AC-4** (empty / whitespace, no throw) — covered for both `isMermaid` and `detectMermaidBlocks`.
- **AC-5** (leading blank lines tolerated; source preserved untrimmed) — covered; asserts returned source equals the raw leading-newline input.
- **AC-6** (idempotent across repeated scans) — covered; second `detectMermaidBlocks` call on the same root returns 0.

## 1. Design
- [x] Clean separation of the fragile concern (DOM selector in `findCodeBlocks`) from the pure heuristic (`isMermaid`) and the orchestrator (`detectMermaidBlocks`), matching ADR-MAIN-002's core decision.
- Pure logic correctly placed in `src/lib/` per Coding Standards §4; content script only consumes it later (US-003).
- Idempotency via a `data-mermaid-preview` marker attribute is a sound, framework-agnostic choice that prepares US-004's MutationObserver.
- Selector implemented as `pre` rather than the ADR's `pre code, pre`: this is the correct call — `pre code, pre` would match both the `<code>` child and its `<pre>` parent and double-count the same logical block. Reading `<pre>.textContent` (which already includes inner `<code>`) counts each block once. The "isolate the selector in one function" decision is honored. The deviation is disclosed in pr.md but the Accepted ADR body (design.md) still reads `pre code, pre` — see Nit-2.

## 2. Functionality
- [x] Does what the author intended across the AC set; edge cases (empty, whitespace-only, leading blank lines, mixed blocks) behave correctly and without throwing.
- `split(/\s+/, 1)` after `trim()` correctly extracts the first token; mid-text keywords (`const graph = ...`) are rejected as required.
- `textContent ?? ''` defensively guards a null and feeds `isMermaid`, which returns false on empty — no throw on degenerate DOM.
- Forward-looking (non-blocking): once a block is marked, an edited message re-using the same element won't be re-detected. That is explicitly US-004 territory — see Nit-3.

## 3. Complexity
- [x] Minimal and appropriate. Three short single-purpose functions, no over-engineering. Keyword set centralized as a constant for easy extension, as the story asked.

## 4. Tests
- [x] Sensible, behavior-focused jsdom unit tests; each AC has a test that fails on regression. A "covers every declared keyword" loop guards the keyword set. Coverage exceeds the 80% minimum.
- Nit-1: add a test with inner highlight markup (e.g. `<pre><code><span>graph</span> TD</code></pre>`) to lock the AC-1 "verbatim source, no HTML tags" guarantee against real Google Chat syntax-highlight spans.

## 5. Naming
- [x] Clear and conventional: `detectMermaidBlocks`, `findCodeBlocks`, `isMermaid`, `MERMAID_KEYWORDS` (UPPER_SNAKE constant), `MermaidBlock`. Matches Coding Standards §3.

## 6. Comments
- [x] TSDoc on every export explains the *why* (selector is the single break point; trim-on-match-not-on-source; idempotency rationale) rather than restating code, per Coding Standards §8.

## 7. Style
- [x] Prettier-clean, ESLint-clean, strict TypeScript. 2-space indent, within line length. `as const` on the keyword tuple is idiomatic.

## 8. Documentation
- [x] pr.md, story.md, ADR registry, and design.md are present and consistent except the one selector wording gap (Nit-2). README/build instructions unaffected by this change.

## Findings summary
- Must-fix (blocking): none.
- Nit-1: add a test exercising inner-markup stripping for AC-1's no-HTML-tags guarantee.
- Nit-2: update design.md (Accepted ADR-MAIN-002) so the selector reads `pre` to match the implementation; pr.md disclosure does not amend the durable ADR.
- Nit-3: note the marker-based idempotency limitation for edited messages — to be handled in US-004.
- Nit-4 (optional): the uncovered defensive branch at detect.ts:78 (`textContent ?? ''`); branches remain 87.5% ≥ 80%, so no action required.

## Reviewer sign-off
- [x] Checked all 8 areas above
- [x] CI / automated checks pass

Decision: Approve
