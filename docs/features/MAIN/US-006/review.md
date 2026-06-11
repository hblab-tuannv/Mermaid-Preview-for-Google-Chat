---
version: "1.0"
date: "2026-06-11T16:57:47Z"
author: code-reviewer
status: Approve
approver: code-reviewer
---

# REVIEW-MAIN-US-006 — Fullscreen-zoom overlay for Mermaid diagrams

- Story: MAIN-US-006
- PR: PR-MAIN-US-006
- ADR: ADR-MAIN-007
- Commit reviewed: `1b851ae` on `worktree-agent-a8b320b8f70b15540` (diff vs `main`)
- Verdict: **Approve**

## Scope reviewed

- New: `src/lib/zoom.ts`, `src/lib/zoom.test.ts`
- Changed: `src/lib/render.ts` (attachZoom wiring + resetPreviews extension), `src/lib/render.test.ts`
- Changed: `backlog/MAIN/US-006.md` (PR id stamp), `docs/features/MAIN/US-006/pr.md` (new)

## CI verification (run independently in the worktree)

- `npx vitest run --coverage` → **11 files / 108 tests passed**.
- Coverage: Statements 99.06%, Branch 89.47%, Funcs 100%, Lines 99.34% — all above the 80% threshold.
- `npx tsc --noEmit` → clean (exit 0).
- `npx eslint .` → exit 0 (0 errors, 1 warning; no `--max-warnings 0` in CI, so CI is green).

## 8-area sign-off

- [x] **Design** — Good fit. Rendering/DOM logic stays in `src/lib/` per Coding-Standards §4. `attachZoom` mirrors `attachToggle`'s placement contract (`preview.after(...)`), and the singleton `closeActiveOverlay()` handle is a clean way to let `resetPreviews` tear down an open overlay without holding a teardown reference. The SVG is cloned (`cloneNode(true)`), never moved, preserving the US-004 toggle. **Listener-leak gate: PASS** — every `doc.addEventListener` is routed through `addDocListener` (keydown at open; mousemove/mouseup on mousedown), and all four close paths (Esc / backdrop / X / programmatic `closeActiveOverlay`) funnel through the single `close()` → `removeAllDocListeners()`. No document-level listener escapes cleanup.
- [x] **Functionality** — Behavior matches all six AC (mapping below). Adjacency is `source → container → zoom → toggle`: `element.after(container)`, then `attachToggle` does `container.after(toggle)`, then `attachZoom` does `container.after(zoom)`, inserting zoom between container and toggle. The `resetPreviews` walker starts at `container.nextElementSibling` and removes every following sibling carrying `TOGGLE_ATTR` or `ZOOM_ATTR` — order-independent, removes exactly both controls, no over/under-removal. `nextElementSibling` is captured before `remove()`. Error path correctly does not call `attachZoom`.
- [x] **Complexity** — Reasonable for the feature. `openZoomOverlay` is long but linear and single-responsibility (build DOM, wire handlers, return `close`). No speculative generality. Closure-held zoom/pan state is appropriate.
- [x] **Tests** — 28 zoom tests + 5 new render assertions, each tied to an AC and behavior-asserting (DOM presence, transform string changes, focus return, add/remove listener spies). They fail if behavior breaks (e.g., the spy-based listener-removal tests would fail on a leak). On the flagged **zoom.ts 60% V8 branch coverage**: this is not a test gap. Line coverage is 100%, so `openZoomOverlay` fully executes; the uncovered branches are the false-sides of defensive guards — `if (svg)` (l.104), the two `findIndex(...) !== -1` splice guards (l.216/218), and `if (!dragging) return`. Every AC behavior (clone, zoom in/out, wheel both directions, drag-pan, mouseup-ends-drag, all close paths, singleton, reset) is exercised. Overall branch 89.47% >> 80%. Acceptable.
- [x] **Naming** — Clear and conventional. `attachZoom`, `openZoomOverlay`, `closeActiveOverlay`, `applyTransform`, `ZOOM_ATTR`/`SCALE_STEP`/`SCALE_MIN`/`SCALE_MAX`/`WHEEL_SENSITIVITY` follow Coding-Standards §3.
- [x] **Comments** — TSDoc on all exports; comments explain *why* (singleton handle rationale, why listeners are on `document` for off-stage drag, clone-not-move rationale). Good.
- [x] **Style** — Prettier-conformant, 2-space, ≤100 cols. TS strict passes.
- [x] **Documentation** — `pr.md` is thorough and accurate (test evidence, AC mapping, adjacency note). README needs no change (no new load/build step).
- [x] CI / automated checks pass.

## AC coverage map

- AC-1 (placement; not on error): `attachZoom — AC-1` tests + render.test `attaches a zoom button on success path` / `attaches no zoom button on the error fallback`.
- AC-2 (idempotency / one button): render.test `creates exactly one zoom button even after a redundant scan` (HANDLED_ATTR gate).
- AC-3 (overlay opens, fixed, high z-index, SVG clone, controls present): `AC-3: overlay creation` suite.
- AC-4 (zoom in/out + wheel + drag-pan change transform; mouseup ends drag): `zoom controls — AC-4` suite.
- AC-5 (Esc / backdrop / X close + remove all document listeners + return focus): `overlay close paths — AC-5` suite, incl. mid-drag-close listener removal.
- AC-6 (resetPreviews closes open overlay + removes zoom button): render.test `closes an open zoom overlay when resetPreviews runs` + `closeActiveOverlay — AC-6` suite.

## Must-fix items

None (0).

## Nits (non-blocking)

- `Nit:` `src/lib/zoom.ts:237` carries an unused `eslint-disable prefer-const` directive — the `let activeOverlayClose` is genuinely reassigned so `prefer-const` never fires; the disable can be dropped (lint reports it as a warning).
- `Nit:` Backdrop-close test asserts overlay removal but not focus-return / listener-removal (those are asserted for Esc and X). Since all three share `close()`, coverage is adequate; an explicit backdrop assertion would add symmetry.
- `Nit:` Adjacency `container→zoom→toggle` is verified by reasoning and by the render-level `resetPreviews` test (both controls present), but not by a unit test in `zoom.test.ts` with a toggle sibling present. Functionally covered; optional to add.
- `Nit:` `attachToggle`'s placement comment (`toggle.ts`) predates US-006 and still implies toggle sits directly after the container; after US-006 zoom is inserted between them. Comment is now slightly stale (no behavior impact).

## Review limitations (not defects)

- `story.md` and the `design.md` (ADR-MAIN-007 body) are not present in the worktree's `docs/features/MAIN/US-006/`. AC were reviewed from `backlog/MAIN/US-006.md` (goal narrative) and the ADR-MAIN-007 decisions as described in `pr.md`. The implementation matches the documented decisions; this is a context-availability note, not a code issue.

## Decision

**Approve.** The change improves the codebase, all 8 areas clear, CI is green, no must-fix items. The four nits are optional follow-ups.
