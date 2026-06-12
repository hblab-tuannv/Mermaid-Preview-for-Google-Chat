---
id: REVIEW-MAIN-US-010
version: 1.0
date: "2026-06-12T07:50:03Z"
author: code-reviewer
status: Approve
approver: code-reviewer
---

# Code Review — REVIEW-MAIN-US-010

- Story: MAIN-US-010 (Sửa preview lỗi với label `<br>` và sơ đồ C4 — parse SVG bằng text/html)
- PR: PR-MAIN-US-010
- ADR: none (ADR-MAIN-003 no-exec posture preserved)
- Scope reviewed: working-tree changes to `src/lib/render.ts` (only `parseSvg`) and `src/lib/render.test.ts`.

## Automated checks (independently re-run)
- `npx vitest run src/lib/render.test.ts` → 24 passed (incl. new `<br>`/foreignObject case).
- `npx vitest run --coverage` → 189 passed.
- `npm run typecheck` (tsc --noEmit) → exit 0.
- `npm run lint` (eslint .) → exit 0.

## Checklist (8 areas)
1. **Design** — Correct root-cause fix at the right layer: the defect was strict-XML parsing of HTML-in-SVG, fixed by parsing as `text/html`. No new abstraction, no scope creep. ✔
2. **Functionality** — Resolves both reported cases (`<br>` labels + C4) via one mechanism; root cause empirically verified (XML→parsererror, HTML→svg). ✔
3. **Complexity** — One-line MIME/selector change; comment explains the why. ✔
4. **Tests** — New red→green test asserts `'rendered'`, SVG namespace, and `foreignObject` survival; existing AC-2 (non-svg→error) and AC-5 (script inert) still pass, guarding the no-exec contract. ✔
5. **Naming** — Unchanged; `parseSvg` still accurate. ✔
6. **Comments** — Updated doc comment records the XML-vs-HTML rationale and the preserved security guarantee. ✔
7. **Style** — Matches surrounding code; lint clean. ✔
8. **Documentation** — CR-MAIN-2026-06-12-04 + story AC + PR describe behavior and rationale. ✔

## Security note
`DOMParser` (text/html) produces an inert document — scripts do not execute, and `importNode`'d `<script>` nodes remain inert. The no-`innerHTML` insertion path is unchanged. Primary XSS defense (mermaid `securityLevel: 'strict'`) untouched. AC-3/AC-5 test passes.

## Verdict
**Approve.** Minimal, correct corrective fix with TDD coverage; no regressions, security posture preserved.
