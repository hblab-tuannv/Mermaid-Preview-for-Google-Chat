---
id: REVIEW-MAIN-US-003
story: MAIN-US-003
pr: PR-MAIN-US-003
version: "1.0"
date: "2026-06-11T12:54:03Z"
author: "code-reviewer"
status: "Approve"
approver: "code-reviewer"
---

# Code Review — REVIEW-MAIN-US-003

Story: **MAIN-US-003** · PR: **PR-MAIN-US-003** · ADR: **ADR-MAIN-003**
Branch: `story/MAIN-US-003-render-svg`

## CI / automated checks (entry gate)
All green on `main...HEAD`:
- `npm test` → **34 passed (6 files)**; coverage **100% stmt / 100% line / 100% func / 96.77% branch** (≥80% min). Only uncovered branch is `detect.ts:78`, pre-existing from US-002, not in this diff.
- `npm run typecheck` (tsc --noEmit, strict) → exit 0.
- `npm run lint` (eslint) → exit 0.
- `npm run format:check` (prettier) → exit 0.
- `npm run build` → exit 0; `dist/content.js` 3,142 kB / gzip 856 kB (chunk-size warning, non-fatal).
- `npm audit` → 0 vulnerabilities.

## 8-area review

### 1. Design
- [x] Checked.
Clean separation: all DOM/insertion/fallback/idempotency/id logic lives in `src/lib/render.ts` (framework-agnostic per Coding-Standards §4), DOM-mutating wiring in `src/content/index.ts`. The injectable `MermaidRenderer` interface decouples the heavy `mermaid` dependency, faithfully realizing ADR-MAIN-003 decisions 2–7. `previewMermaidIn(root?, opts?)` is correctly shaped for the US-004 observer re-run. Good fit, right places.

### 2. Functionality
- [x] Checked.
AC-by-AC verification against the tests:
- **AC-1** — `renderMermaidBlock` inserts an `<svg>` inside a `data-mermaid-preview="rendered"` container via `element.after(container)`. Test "renders a valid block... (AC-1)" asserts the sibling container, attribute, and `querySelector('svg')`. Exercised.
- **AC-2** — Two failure modes both verified: renderer **rejects** (test "falls back without throwing... (AC-2)") and renderer returns **non-SVG** (`parseSvg` returns null → throws internally → caught; test "falls back to error when the renderer returns no SVG root (AC-2)"). Both yield `'error'`, keep the original block, insert no SVG, never throw. Genuinely robust.
- **AC-3** — `MERMAID_INIT_CONFIG` is `securityLevel:'strict'`, `startOnLoad:false`; asserted directly, and the default renderer is verified to call `mermaid.initialize(MERMAID_INIT_CONFIG)` exactly once across two renders (init-once). Exercised.
- **AC-4** — `HANDLED_ATTR` marker → second call returns `'skipped'`, one SVG, one renderer call. Note the marker is set **synchronously before the first `await`** (line 83), which is the correct guard: concurrent observer re-entry cannot double-render or produce duplicate error markers. Good.
- **AC-5** — DOMParser + `importNode` path (see Security). Functionally correct by construction.
- **AC-6** — Module `idCounter` yields `mermaid-preview-<n>`; test asserts distinct ids across two diagrams. Counter is monotonic for the page lifetime (content scripts get a fresh module instance per page load), so no reset/collision across observer re-runs within a page. Exercised.

Edge case worth noting (not a defect): because `HANDLED_ATTR` is set before the try/catch, a block whose render **fails** is permanently marked and returns `'skipped'` on any later re-run — transient failures never auto-recover. AC-4 only requires not re-rendering a *successful* block, so this **satisfies** the AC; it is a deliberate "attempted, do not retry" semantic that US-004 inherits. Flagged for awareness, not blocking.

### 3. Complexity
- [x] Checked.
Functions are short, single-purpose, well under the §4 limits. No over-engineering — the indirection (`MermaidRenderer`, `cachedDefault`) is justified by testability and init-once, not speculation.

### 4. Tests
- [x] Checked.
All six ACs are exercised; tests are independent (`replaceChildren` in `beforeEach`) and assert observable outcomes, not implementation. See the Security area for the one materially weak test (AC-5). The non-SVG and reject paths for AC-2 are both covered, which is the right rigor.

### 5. Naming
- [x] Checked.
`renderMermaidBlock`, `parseSvg`, `nextDiagramId`, `MERMAID_INIT_CONFIG`, `HANDLED_ATTR`/`RENDERED_ATTR` are clear and follow §3 conventions (camelCase / UPPER_SNAKE).

### 6. Comments
- [x] Checked.
TSDoc on exports; comments explain *why* (fallback rationale, AC references). One mildly misleading phrase — see Nit below.

### 7. Style
- [x] Checked.
Prettier-clean, ESLint-clean, strict TS. Files are kebab-case, 2-space indent, ≤100 cols.

### 8. Documentation
- [x] Checked.
ADR-MAIN-003 is Accepted (architect, Gate-3) and accurately documents the eager-bundle trade-off, DOMParser insertion, strict mode, and unique-id strategy. PR doc matches the code.

---

## Security focus (AC-5) — accurate but worth precision
The **production code is safe by construction**: `parseSvg` uses `new DOMParser().parseFromString(svg, 'image/svg+xml')` then `doc.importNode(el, true)` and `appendChild` — it never assigns untrusted strings to `innerHTML`, satisfying Coding-Standards §7 and ADR decision 4. In a real browser, script nodes produced by `DOMParser` are flagged non-executable, and mermaid `securityLevel:'strict'` strips event-handler attributes upstream.

However, the AC-5 **test is low-value (false confidence)** — see Nit-1: jsdom executes scripts in neither the `importNode` path nor an `innerHTML` path, so the test would pass identically against unsafe code and proves nothing about the production path. Additionally, `parseSvg` itself does **not** strip event-handler attributes (`onload=`, `onclick=`); that defense lives entirely in mermaid `strict`, which is **mocked out in every unit test**. So neither safety layer is meaningfully exercised automatically — the real verification is the Phase-5 manual SVG check. Design is correct; the gap is test rigor only, hence a Nit.

## Bundle trade-off — accepted, tracked (Comment)
Build confirms `content.js` is 3.14 MB (gzip 856 kB) loaded on every chat page. Because MV3 content scripts are IIFE (`formats:['iife']` forces `inlineDynamicImports`), the `import('mermaid')` is **inlined**, not code-split — so it provides test-mockability, not load deferral; Mermaid is eager. This exactly matches the ADR-MAIN-003 documented decision (eager bundle, lazy-load deferred to a follow-up ADR) with architect Gate-3 sign-off. Tracked tech debt, **not relitigated here**.

## Findings

### Blocking (must-fix)
None.

### Nits (non-blocking)
- **Nit-1 (Tests/Security):** The AC-5 test asserts `__pwned` undefined, but jsdom never executes scripts in either the safe or unsafe path, so it does not discriminate safe from unsafe code. Recommend a test that proves the actual mechanism — e.g. assert no connected `<script>` node exists under the inserted container, or assert the inserted node is an `SVGElement` reached via `importNode`. Optionally add a unit-level check (or a §5 follow-up) that strict-mode-stripped attributes / event handlers are absent, since `parseSvg` does not strip them itself.
- **Nit-2 (Comments):** The `render.ts` header and `defaultRenderer` comments say mermaid is "lazily imported in the default." Given the IIFE/`inlineDynamicImports` reality, this can mislead a future dev into thinking initial load is deferred. Suggest clarifying that the dynamic `import()` is for test-mockability/init-once and that the bundle is eager (cross-reference the ADR trade-off).

## Reviewer sign-off
- [x] Checked all 8 areas above
- [x] CI / automated checks pass

The PR clearly improves the codebase, meets all six acceptance criteria, and introduces no blocking issues. The two Nits are quality improvements for a follow-up.

Decision: **Approve**
