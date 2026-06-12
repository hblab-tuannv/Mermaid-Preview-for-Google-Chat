---
version: 1.0
date: 2026-06-12T02:42:21Z
author: code-reviewer
status: Approve
approver: code-reviewer
review: REVIEW-MAIN-US-007
story: MAIN-US-007
pr: PR-MAIN-US-007
adr: ADR-MAIN-008
---

# Code Review — REVIEW-MAIN-US-007

Story: MAIN-US-007 (PNG + SVG download buttons on rendered Mermaid diagrams)
PR: PR-MAIN-US-007 · ADR: ADR-MAIN-008 (Option A — PNG best-effort + deterministic SVG auto-fallback)

## Reproduced evidence (run in the worktree, not trusted from pr.md)

| Gate | Result |
|---|---|
| `npx vitest run --coverage` | **156 passed (12 files)** |
| Global branch coverage | **81.11%** (146/180) — ≥ 80% threshold met |
| Statements / Functions / Lines | 96.07% / 97.61% / 96.61% |
| `download.ts` per-file | 85.71% stmt / **62.26% branch** / 87.5% func — uncovered = browser-only raster (Image/canvas/toBlob, v8-ignored) + serializeSvg fallback branches (see Tests Nit) |
| `npx eslint .` | clean (exit 0) |
| `npx prettier --check .` | "All matched files use Prettier code style!" |
| `npx tsc --noEmit` | clean (exit 0) |
| `npm run build` | content.js + background.js + manifest built OK |

Entry gate satisfied: all automated checks green.

## 8-area sign-off

- [x] **Design** — Clean reuse of the established control model. `attachDownload(preview, doc, opts?)` mirrors `attachZoom`/`attachToggle`: created once on the idempotent success path, placed via `preview.after()`, removed by `resetPreviews`. Three injectable seams (`PngRasterizer`/`BlobSaver`/`Notifier`) + pure `pngScale` match the ADR-MAIN-008 testable-seam contract exactly. SVG is the universal lossless path; PNG is best-effort with deterministic fallback. No global Mermaid state touched (re-render correctly rejected per ADR). Good fit.

- [x] **Functionality** — Verified against the adversarial focus areas:
  - **Option-A fallback correctness (download.ts:360-369):** `saver.save(pngBlob, '...png')` is **OUTSIDE** the try (line 369); only `rasterizer.toPng` is inside (line 362). A saver failure is therefore NOT misread as a raster failure and cannot double-save. The catch (lines 363-368) saves the SVG blob with the correct `.svg` filename and calls `notifier.notify(...)` exactly once, then `return`s — no fall-through to the PNG save. Confirmed deterministic.
  - **No throw into render path:** all export work runs inside async click handlers (`void (async () => {...})()`), never on the synchronous success path. `attachDownload` itself only builds DOM. Cannot break `renderMermaidBlock`.
  - **Placement / idempotency (render.ts:126):** `attachDownload(container, doc)` called once, after `attachZoom`, on the success path only; error path does not call it (verified by render.test.ts "attaches no download control on the error fallback"). Idempotency is structural via the `HANDLED_ATTR` gate (render.test.ts "creates exactly one download control even after a redundant scan").
  - **resetPreviews (render.ts:157-168):** while-loop now also matches `DOWNLOAD_ATTR`; `next = control.nextElementSibling` is captured BEFORE `control.remove()` (line 164) — no lost reference, identical to the existing zoom/toggle pattern. The three controls are contiguous siblings right after the preview (all use `preview.after()`, yielding order preview → download → zoom → toggle), so the marker-order-independent loop removes all of them — no orphan. render.test.ts asserts `DOWNLOAD_ATTR` is null after reset.
  - **Filename parsing (download.ts:146-155):** regex `^mermaid-preview-(\d+)$` with graceful fallback to a module counter when id is missing/malformed — no crash; tested ("falls back to a local counter").
  - **No-SVG edge case:** both buttons early-return as a safe no-op when the preview has no `<svg>` (tested).

- [x] **Complexity** — Appropriately simple. No over-engineering; the `htmlLabels:false` re-render alternative was correctly avoided (documented in ADR). Default impls are thin wrappers.

- [x] **Tests** — Fallback paths genuinely exercised, not just happy path: a `securityErrorRasterizer` stub rejects with a real `DOMException('SecurityError')` → asserts an `image/svg+xml` blob saved with `.svg` filename + `notifier.notify` called **exactly once** + `saver.save` called **exactly once** (not zero, not twice). A separate `nullBlobRasterizer` rejection drives the same fallback (modeling the seam's null-blob→reject contract). Happy PNG path asserts no spurious notice. Default notifier and default saver each get one jsdom-path test. Tests fail when the code is broken (e.g. the save-outside-try invariant is what the "exactly once" assertions guard).
  - **Nit (non-blocking):** the `download.ts` 62% per-file branch number is not entirely "browser-only callbacks." The `serializeSvg` viewBox→width/height derivation and the `getBoundingClientRect` fallback (download.ts ~113-131) are jsdom-testable logic left uncovered only because every test SVG already sets explicit `width`/`height`. Adding one test with a width/height-less SVG (viewBox only) would cover that branch. The `/* v8 ignore */` annotations are honest — they sit on genuinely browser-only Image/canvas/timer code (lines 178-208, 262-266), and the serializeSvg gap shows up truthfully in the coverage number rather than being hidden by an ignore. Global ≥80% is legitimately met.

- [x] **Naming** — Clear and consistent with siblings (`attachDownload`, `DOWNLOAD_ATTR`, `pngScale`, `serializeSvg`, `parseDiagramIndex`, `makeDefault*`).

- [x] **Comments** — Useful, explain *why* (e.g. the "saver.save for PNG is intentionally OUTSIDE the try" comment at download.ts:358-359 captures the exact invariant; the transparency note explains the deliberate absence of `fillRect`). Module header documents the Option-A contract.

- [x] **Style** — eslint + prettier + tsc all clean repo-wide.
  - **Incidental zoom.ts / zoom.test.ts reformat (drive-by, outside US-007 scope) — accepted, non-blocking:** the changes are pure Prettier line-wrapping with zero logic change (verified by diff). Verified `main`'s `zoom.ts` is NOT prettier-compliant (`git show main:src/lib/zoom.ts | prettier --check` → exit 1), so the repo-wide `prettier --check .` gate only passes *because* of this reformat — reverting it would break the gate. Acceptance is the self-consistent call. `Nit:` ideally drive-by formatting lands in its own commit, but reverting here is counterproductive.

- [x] **Documentation** — story.md AC-1..AC-8 / AC-3b and ADR-MAIN-008 are authoritative and consistent with the implementation; pr.md present with test evidence (reproduced above).

## Reviewer sign-off
- [x] Checked all 8 areas above
- [x] CI / automated checks pass (reproduced locally)
- [x] Author ≠ reviewer (independent review, small mode)

## Findings summary
- **Blocking (must-fix): 0**
- Non-blocking Nits: (1) add a serializeSvg viewBox-derivation test for the uncovered branch; (2) prefer drive-by zoom.ts reformat in its own commit (do NOT revert).

## Decision: **Approve**

The PR improves the codebase: it delivers the user-facing capability, faithfully implements the ADR-MAIN-008 Option-A fallback with the save-outside-try invariant intact, leaves no orphan controls, adds no XSS surface (textContent + XMLSerializer, no innerHTML), and all gates are green. No must-fixes.
