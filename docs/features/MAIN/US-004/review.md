---
version: 1.0
date: 2026-06-11T13:45:29Z
author: code-reviewer
status: Approve
approver: code-reviewer
---

# REVIEW-MAIN-US-004 — Code Review: Toggle preview/source + observe dynamic messages

Story: MAIN-US-004 · PR: PR-MAIN-US-004 · ADR: ADR-MAIN-004-live-observe-toggle

## CI / automated checks
- [x] `npm run typecheck` → exit 0
- [x] `npm run lint` → exit 0
- [x] `npm run format:check` → all files match Prettier
- [x] `npm test` → 8 files, 50 tests pass; coverage 100% stmt/func/line, **97.87% branch** (≥ 80% threshold). The single uncovered branch is `detect.ts:78`, pre-existing US-002 code not in this diff.

## 1. Design — [x]
The split is clean and matches ADR-MAIN-004: `observe.ts` is a Mermaid-agnostic `MutationObserver` wrapper returning a disconnect fn; `toggle.ts` owns the DOM-only flip; `render.ts` wires `attachToggle` into its already-idempotent success path; `content/index.ts` connects the observer to `previewMermaidIn`. Placing `attachToggle` on the success path (which sets `data-mermaid-rendered` before any async work) makes "toggle exactly once" a structural property rather than a new marker — a good simplicity win, and faithfully reasoned in the ADR. Injectable `ObserverCtor`/`schedule`/`doc` keep everything testable. Components interact sensibly and live in the right modules.

Nit (non-blocking): `onBatch` (= `previewMermaidIn`) mutates the very subtree the observer watches — each real batch inserts the preview `<div>` container and the `<button>` after each `<pre>`, which are themselves `childList` additions under `document.body`. With the real `MutationObserver`, this self-triggers one extra scheduled scan per real batch; that scan finds nothing new (the `detected`/`rendered` markers short-circuit synchronously) and terminates. So it is bounded and self-terminating — not a blocker — but it is one wasted empty scan per batch and is not exercised by the suite (the fake observers emit by hand; the "real MutationObserver" test uses a no-op `vi.fn()` onBatch that inserts nothing, so the self-retrigger never surfaces). Worth a one-line comment and, if the deferred "scan only addedNodes" optimisation is taken on, this disappears.

## 2. Functionality — [x]
Does what the author intended across the six ACs (mapping in §4). Edge cases handled: no-document → no-op disconnect; attribute/text-only mutations ignored (no wasted scan); error path attaches no toggle and leaves source visible. Concurrency/idempotency: `renderMermaidBlock` sets `HANDLED_ATTR` synchronously before the first `await`, so a re-entrant scan during an in-flight render returns `'skipped'` — no double render, no second toggle. The pending-flag coalescing sets `pending = false` *before* calling `onBatch`, so a throwing `onBatch` cannot wedge the observer permanently. Toggle state lives on the DOM (`data-state` + `hidden`), each block independent — correct.

## 3. Complexity — [x]
Minimal and not over-engineered. `observeChildList` is ~25 lines of logic; `attachToggle` is a single closure over `apply(state)`. The ADR explicitly rejects a separate toggle-idempotency marker and a narrow Chat-container selector — both correct calls that avoid speculative complexity. The "scan addedNodes only" optimisation is consciously deferred as tracked tech debt (PR §Performance), which is the right scope decision.

## 4. Tests — [x]
Tests are behavioural, assert real DOM outcomes, and would fail if the code broke (e.g. AC-2 asserts the *same* SVG node identity after two flips; AC-5 asserts exactly 1 rendered + 1 toggle after a re-scan). Fake observer + synchronous scheduler make the timing deterministic; one test also exercises the real `MutationObserver` + timeout path. Every AC is exercised:
- **AC-1** — `toggle.test.ts` "defaults to preview: source hidden, diagram shown" + `render.test.ts` "attaches a toggle and hides the source on success".
- **AC-2** — `toggle.test.ts` "flips preview <-> source on click without re-rendering the SVG" (asserts `preview.firstElementChild` is the same `svg` node across both flips → genuine no-re-render).
- **AC-3** — `render.test.ts` "attaches no toggle on the error fallback; source stays visible".
- **AC-4** — `index.test.ts` "renders a Mermaid block added after load" + `observe.test.ts` coalesce/observe-target tests.
- **AC-5** — `index.test.ts` "does not double-render an already-handled block across scans" (1 rendered + 1 toggle after second burst).
- **AC-6** — `index.test.ts` "produces nothing for a mutation with no Mermaid block" + "returns a disconnect function that tears down the observer" + "no-op disconnect when there is no document"; `observe.test.ts` disconnect + ignore-no-additions.

Nit (non-blocking): no test drives a *real* batch through the *real* `MutationObserver` (i.e. onBatch actually inserting nodes), so the self-retrigger described in §1 is untested. Low value to add given the synchronous-marker termination guarantee; noting for completeness.

## 5. Naming — [x]
`observeChildList`, `attachToggle`, `onBatch`, `ObserverCtor`, `schedule`, `TOGGLE_ATTR`, `ToggleState`, `apply(state)` are all clear and appropriately scoped. No misleading or over-long names.

## 6. Comments — [x]
Comments explain *why*, not what: the coalesce rationale, why the button is placed *after* the preview container (so it survives the source state), why the toggle lives on the success path, and the XSS-surface reasoning. JSDoc on exported APIs is accurate.

## 7. Style — [x]
Conforms to Coding-Standards (TypeScript strict, ESLint and Prettier both clean). Consistent with the existing US-002/US-003 module conventions.

## 8. Documentation — [x]
ADR-MAIN-004 is written with Context/Decision/Consequences/Alternatives/NFR and is listed in `docs/03-design/adr/registry.md`. PR doc documents AC coverage, the performance trade-off, and the deferred optimisation. No README API surface change needed for this internal extension.

## Reviewer sign-off
- [x] Checked all 8 areas above
- [x] CI / automated checks pass
- Must-fix (blocking): **0**
- Nits (non-blocking): 2 (observer self-retrigger comment; optional real-batch self-retrigger test)

Decision: **Approve**
