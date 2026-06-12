---
id: REVIEW-MAIN-US-009
version: 1.0
date: "2026-06-12T06:52:18Z"
author: code-reviewer
status: Approve
approver: code-reviewer
---

# Code Review — REVIEW-MAIN-US-009

- Story: MAIN-US-009 (Mở rộng độ phủ loại sơ đồ Mermaid — tin fence + mở rộng keyword)
- PR: PR-MAIN-US-009
- ADR: ADR-MAIN-009-detect-coverage (supersedes ADR-MAIN-002-mermaid-detection)
- Scope reviewed: working-tree changes to `src/lib/detect.ts` and `src/lib/detect.test.ts` (plus docs: ADR registry).

## Automated checks (independently re-run)
- `npx vitest run src/lib/detect.test.ts` → 27 passed.
- `npm run typecheck` (tsc --noEmit) → exit 0.
- `npm run lint` (eslint .) → exit 0.
- Installed renderer: mermaid 11.15.0 (the oracle used for keyword-name checks).

## 8-area sign-off

- [x] **Design** — Sound and a good fit. The two-tier model (trust the explicit ` ```mermaid ` fence; fall back to the keyword heuristic only for unfenced blocks) preserves both pillars of ADR-MAIN-002 it claims to keep: the `findCodeBlocks`/content-recognition split is untouched, and the detect path still imports nothing (verified: zero imports in `detect.ts`, no mermaid library pulled in). The branch lives in exactly the right place (`detectMermaidBlocks`), and `stripLanguageTag` returning `{ source, hadTag }` is the minimal, cohesive way to thread the fence signal through. No external callers of `stripLanguageTag` exist, so the return-type change is internal.

- [x] **Functionality** — Does what the AC require; correctness traps all checked:
  - AC-1 (fence-trust, type outside allowlist): `xychart-beta` fenced is detected, tag stripped — test L211-218. PASS.
  - AC-2 (expanded keywords, unfenced): new types detected case-insensitively — tests L63-74, L220-225. PASS.
  - AC-3 (no false positive, unfenced): `function foo(){}` / `{"a":1}` ignored — test L237-238. PASS.
  - AC-4 (fenced invalid body → detected, render falls back): `function foo(){}` under a `mermaid` tag is detected — test L227-235. PASS.
  - AC-5 (`mindmap` never mis-stripped): `stripLanguageTag` exact-matches `firstLine === 'mermaid'`, so `mindmap` is preserved — test L197-202. PASS.
  - AC-6 (idempotent): `DETECTED_ATTR` guard unchanged; second scan returns 0 — test L167-171. PASS.
  - Bare empty fence still ignored: `isCandidate = hadTag ? source.trim() !== '' : …` → empty body returns false — test L204-207. Traced and confirmed. PASS.
  - contenteditable/composer guard unchanged — test L173-178 still green. PASS.
  - Legacy 14 keywords untouched in the array; `covers every declared keyword` test green. No regression. PASS.

- [x] **Complexity** — Minimal. A single ternary added to the hot loop; no new control-flow depth, no premature abstraction. Not over-engineered.

- [x] **Tests** — Appropriate and discriminating. New tests target each new AC and the accepted behavior change; the suite uses the real Chat sent-message DOM shape (`<br>`-split `<pre>` + leading `mermaid` text tag) rather than a synthetic newline string, so they exercise the production code path. Tests would fail if the fence-trust branch or the empty-body guard regressed (e.g. AC-4 expects length 1; the empty-fence test expects 0).

- [x] **Naming** — Clear. `hadTag`, `isCandidate`, `stripLanguageTag`, `MERMAID_KEYWORDS` are all meaningful and appropriately scoped; no over-long names.

- [x] **Comments** — Good. The inline comment in `detectMermaidBlocks` and the updated `stripLanguageTag` JSDoc explain the *why* (trust the user signal, future-proofing, render-fallback) and cite ADR-MAIN-009.

- [x] **Style** — Conforms to the repo style; lint and typecheck clean; `as const` keyword tuple and `Set` lowercasing pattern preserved.

- [x] **Documentation** — ADR-MAIN-009 added (Accepted) and ADR-MAIN-002 marked `Superseded by ADR-MAIN-009` in `docs/03-design/adr/registry.md` (registry diff inspected directly). PR description accurate.

## Findings

### Must-fix (blocking)
None.

### Nits (non-blocking)
- **Nit (Functionality / keyword names):** Against the installed renderer (mermaid 11.15.0), `radar` and `treemap` are registered as `radar-beta` and `treemap-beta` — the two new entries were added without the `-beta` suffix that their sibling beta types (`xychart-beta`, `sankey-beta`, `block-beta`, `packet-beta`, `architecture-beta`) correctly carry. This affects ONLY the **unfenced** allowlist (a user pasting the canonical `radar-beta` opening keyword without a fence would not be matched). It does not block because (a) the unfenced allowlist is explicitly best-effort per ADR-MAIN-009, (b) the canonical fenced path detects these types regardless of the keyword list, and (c) matching is case-insensitive, so no existing behavior regresses. Suggest reconciling the two entries to the renderer's actual opening keyword (likely `radar-beta` / `treemap-beta`) in a follow-up, or confirming the bare form against the author-facing grammar. (`requirementDiagram`, `C4Context`, `zenuml`, `kanban` match the documented author-facing opening keywords and are fine.)
- **Nit (Comments):** The module-header JSDoc (`src/lib/detect.ts` L1-10) still describes detection purely as the keyword-allowlist model and references only ADR-MAIN-002; it does not mention the new fence-trust tier. Function-level docs are updated, but the file header is now slightly stale. Cosmetic.

## Reviewer sign-off
- [x] Checked all 8 areas above
- [x] CI / automated checks pass (tests, typecheck, lint all green, re-run independently)
- Decision: **Approve**

Author ≠ reviewer confirmed (independent review). Approve: the change improves the codebase, cuts the keyword-treadmill for the canonical fenced path, and is well-tested; the two nits are non-blocking and can be addressed in a follow-up.
