---
version: "1.0"
date: "2026-06-11T15:20:25Z"
author: "code-reviewer"
status: "Approve"
approver: "code-reviewer"
---

# REVIEW-MAIN-US-005 — Code Review

Story: `MAIN-US-005` · PR: `PR-MAIN-US-005` · Design: ADR-MAIN-006

## CI / automated checks
- `npm run typecheck` (tsc --noEmit, strict) → exit 0.
- `npm run lint` (eslint) → exit 0.
- `npm run format:check` (prettier) → exit 0.
- `npm test` (vitest --coverage) → 10 files, 75 tests pass.
- Coverage: 98.97% stmt / 95.69% branch / 100% func — well above the 80% threshold.

Entry gate satisfied (green CI). Reviewed independently; I did not author this code.

## AC traceability
- **AC-1** (luminance detect dark/light + passed to renderer) — `theme.test.ts` "returns 'dark'/'default' …", "walks up past transparent ancestors …"; `render.test.ts` "passes the detected theme to the renderer", "honours an explicit opts.theme override". Luminance math is WCAG-correct (verified numerically: white→1.0, rgb(32,33,36)→0.015, crossover ~rgb(187)).
- **AC-2** (transparent → 'default', no throw) — `theme.test.ts` "falls back to 'default' when no ancestor has an opaque background". `parseColor` returns alpha; `detectTheme` requires `rgba[3] > 0`, so jsdom/Chrome's `rgba(0,0,0,0)` for an unstyled ancestor is correctly skipped and the walk continues; exhausting the chain returns `'default'`.
- **AC-3** (theme via `initialize`, not directive; strict kept) — `render.test.ts` `MERMAID_INIT_CONFIG (AC-3)` and "uses the default mermaid-backed renderer …" assert `mermaid.initialize` is called with `{...MERMAID_INIT_CONFIG, theme}` and `securityLevel:'strict'` is retained. No `%%{init}%%` directive is emitted. Re-init-only-on-theme-change cache verified: two same-theme renders call `initialize` exactly once.
- **AC-4** (flip → reset+rerender all; no-op when unchanged) — `theme.test.ts` "calls onChange only when the page theme actually flips" + "coalesces a burst …"; `content/index.test.ts` "re-renders all diagrams at the new theme when Chat flips light→dark". The `current` comparison cannot get stuck: `current` is reassigned to `next` only when `next !== current`, inside the same scheduled tick, before `onChange`.
- **AC-5** (`resetPreviews` removes container+toggle, clears markers, unhides source — rendered AND error) — `render.test.ts` "removes the preview container + toggle, clears markers, unhides source", "lets a reset block render again", "cleans up an errored block too".
- **AC-6** (observer on html+body attributes, debounced, disconnect) — `theme.test.ts` "observes attribute mutations on <html> and <body>", "coalesces a burst …", "returns a disconnect function".

No regression to US-003/US-004: the toggle/observer wiring is intact and the changed `initialize-once` test is a **legitimate** update — it now asserts the host-config theme payload and still verifies a single `initialize` call when the theme is unchanged across renders (correctly exercising the new cache).

---

## 1. Design
- [x] Checked
Class-agnostic luminance detection is the right call and directly addresses INC-MAIN-2026-06-11-02 (no coupling to Google class names). Setting theme via `mermaid.initialize` host config rather than a `%%{init}%%` directive is sound under `securityLevel:'strict'`. Reset+rescan reuses the existing pipeline instead of surgical SVG re-theming (Mermaid bakes colors in), which is the simpler, correct trade-off. `theme.ts` is a pure, injectable module; placement in `src/lib/` matches the standards (DOM mutation stays in the content script). Good fit.

## 2. Functionality
- [x] Checked
Behavior matches all six ACs. `resetPreviews` was scrutinized for wrong-sibling removal and orphans across rendered-first, error-first, and mixed cases: it keys off the source `[data-mermaid-rendered]`, validates the next sibling's `data-mermaid-preview` marker is `rendered|error`, and guards toggle removal with `toggle?.hasAttribute(TOGGLE_ATTR)` — so error blocks (no toggle) leave no orphan and a rendered block removes exactly its own container+toggle. `nextElementSibling` walks a static reference, not a live list, so removals don't shift the target. Clean.

One real, newly-introduced latent fragility is called out below (Nit 1) — it is not a merge-blocker given Google Chat's single shared surface background, but it is not documented in the ADR and should be tracked.

## 3. Complexity
- [x] Checked
Functions are short and single-purpose (well under the <50-line / complexity-≤10 budget). The reset+rescan approach avoids a complex stateful re-theme path. Not over-engineered.

## 4. Tests
- [x] Tests fail when code is broken (theme assertions are value-specific: exact `['default','dark']` ordering, exact `initialize` payloads, exact call counts). jsdom limitations are handled honestly by setting inline `style.backgroundColor` on ancestors and injecting `ObserverCtor`/`schedule`. The AC-5 self-acknowledged note about jsdom not executing scripts (carried from US-003) remains honest. Coverage is high and meaningful, not padding.

## 5. Naming
- [x] Checked
`detectTheme`, `observeThemeChange`, `resetPreviews`, `initializedTheme`, `MermaidTheme` are clear and conventional (camelCase fns, PascalCase type, UPPER_SNAKE const). No overly long names.

## 6. Comments
- [x] Checked
TSDoc on all exports; comments explain *why* (directive vs host-config under strict mode, why the toggle sits after the container, the INC-02 rationale for class-agnostic detection). Good why-not-what discipline.

## 7. Style
- [x] Checked
Prettier and ESLint clean. Matches Coding-Standards.md (2-space, ≤100 cols, kebab-case files, camelCase, typed). No silent error swallowing — the render catch falls back to a visible code block per standard §5. No untrusted-HTML insertion (DOMParser + importNode), strict security retained per §7.

## 8. Documentation
- [x] Checked
ADR-MAIN-006 added and registered (`registry.md`), `story.md` + `pr.md` present and accurate. PR's "How to test" matches observed results.

---

## Findings

### Nit: 1 — Concurrent re-render race on global `initializedTheme` (newly introduced; not in ADR)
On a theme flip, `onChange` runs `resetPreviews(body)` (which removes container/toggle nodes — a childList mutation on `body`) then `previewMermaidIn(body)`. The US-004 childList observer watches `body` with `{childList:true, subtree:true}`, so those removals arm a *second* `previewMermaidIn(body)` that can overlap the theme handler's in-flight pass. Both default renderers share the module-global `initializedTheme` (and `mermaid.initialize` is itself global). If two concurrent passes ever used *different* themes, an interleave (`initialize(A)` → `await import` yields → `initialize(B)` → `render(A)`) could bake a diagram under the wrong theme until the next reset.

Why this does **not** block: in Google Chat all messages share one page-surface background, so `detectTheme(element)` returns the same theme for every block in a pass, and after a flip both the theme handler and the childList re-scan detect the same (new) theme. The interleave is therefore harmless in the real target. It is, however, a newly-introduced fragility that the ADR does not list among its accepted limitations (it only accepts the re-init cost and the 0.5 heuristic), and it also causes a redundant double render pass on every flip (the childList observer re-fires on the reset removals). Recommend a tracked follow-up: e.g. guard against overlapping passes, or pass the resolved theme explicitly through the pipeline rather than relying on global init state.

### Nit: 2 — `parseColor` only accepts comma-separated rgb()/rgba()
`color.match(/rgba?\(([^)]+)\)/)` + `split(',')` does not parse space-separated CSS Color 4 syntax (`rgb(32 33 36)`). Chrome's computed `backgroundColor` still serializes to the legacy comma form, so this is safe for the target browser — robustness only.

### Nit: 3 — detected-but-unrendered blocks not reset
`resetPreviews` queries `[data-mermaid-rendered]` (handled) only, so a block marked `detected` by `detectMermaidBlocks` but whose async render had not completed would keep its `detected` marker and be skipped on rescan. In the current flow renders are awaited in `previewMermaidIn` before the observer fires, so this is not reachable today. Minor.

None of the findings are must-fix.

---

## Reviewer sign-off
- [x] Checked all 8 areas above
- [x] CI / automated checks pass

Must-fix count: 0

Approve
