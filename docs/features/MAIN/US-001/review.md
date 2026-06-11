---
version: "1.0"
date: "2026-06-11T11:15:19Z"
author: "code-reviewer"
status: "Approve"
approver: "code-reviewer"
review: REVIEW-MAIN-US-001
story: MAIN-US-001
pr: PR-MAIN-US-001
adr: ADR-MAIN-001
---

# Code Review — REVIEW-MAIN-US-001

Story: **MAIN-US-001** (Scaffold MV3 extension + inject content-script into Google Chat)
PR: **PR-MAIN-US-001** · Branch: `story/MAIN-US-001-scaffold-mv3` · ADR: **ADR-MAIN-001**

## CI / automated checks (verified by running)

| Check | Command | Result |
|---|---|---|
| Tests | `npm test` | 4 files, **8/8 passed** |
| Coverage | v8 (`vitest --coverage`) | **100%** stmts (11/11), branches (3/3), funcs (6/6), lines (11/11) — threshold 80% ✓. Confirmed all three `src/*.ts` files instrumented via `coverage-final.json` (logger 5/5, content 3/3, background 3/3). |
| Typecheck | `npm run typecheck` (`tsc --noEmit`, strict) | exit 0 |
| Lint | `npm run lint` (`eslint .`) | exit 0 |
| Build | `npm run build` | exit 0 → `dist/{content.js,background.js,manifest.json}` |
| Security scan | `npm audit` | **0 vulnerabilities** |

Entry gate satisfied: green CI, coverage ≥ minimum.

## Acceptance-criteria → evidence

| AC | What it requires | Coverage |
|---|---|---|
| AC-1 | `npm run build` → `dist/` with manifest + bundled scripts, exit 0 | Verified by running build; `dist/` contains all three files. No automated assertion on dist contents, but build exit code + manual artifact inspection are an adequate proxy for a scaffold story. |
| AC-2 | Load unpacked, MV3, SW registered | `tests/manifest.test.ts` asserts `manifest_version===3` and `background.service_worker==='background.js'`; `background/index.test.ts` asserts SW entry logs once. Actual "load unpacked, no errors badge" is **deferred to Phase-5 manual verification** — acceptable, cannot be unit-tested. |
| AC-3 | Content-script logs `[mermaid-preview] ...` once per page load | `content/index.test.ts` asserts `info` called exactly once; `logger.test.ts` asserts the `[mermaid-preview]` prefix; built `dist/content.js` confirmed to emit the prefixed string and invoke init once. See Tests Nit on end-to-end prefix wiring. |
| AC-4 | No script on other origins; host limited to `chat.google.com` | `tests/manifest.test.ts` asserts `content_scripts[0].matches === ['https://chat.google.com/*']`. (Runtime non-execution on other origins deferred to Phase-5 manual.) |
| AC-5 | Minimal permissions, no `<all_urls>`, no surplus | `tests/manifest.test.ts` asserts no `<all_urls>`, `permissions` undefined, `host_permissions` undefined. Manifest is genuinely minimal — no `permissions` block at all. |

## 1. Design
- [x] Checked.
- Clean MV3 layout matching ADR-MAIN-001 and Coding-Standards §4: `src/content/`, `src/background/`, `src/lib/`. Framework-agnostic `logger` in `src/lib/` is correctly the only unit under test for logic.
- Vite multi-entry IIFE strategy is correct: MV3 content scripts must be classic (non-ESM) bundles. Building each entry separately (via `BUILD_TARGET`) with `formats:['iife']` and `emptyOutDir:false` is a sound workaround for rollup's inability to code-split an IIFE multi-entry build; `npm run clean` runs first so stale artifacts don't survive. Verified both `dist/*.js` are valid IIFEs that self-invoke their init.
- Hand-authored manifest copied verbatim (no `@crxjs`) is a defensible, low-dependency choice, documented in the ADR with trade-offs (loss of HMR).

## 2. Functionality
- [x] Checked.
- Build, typecheck, lint, tests, audit all pass. `dist/content.js` emits `[mermaid-preview] content script loaded` and `dist/background.js` emits `[mermaid-preview] service worker started`, each invoked exactly once at module load. Behavior matches author intent and AC-3.
- `Nit:` Content script has no idempotency guard against double-injection. Not a defect for US-001 (MV3 injects once per document load by default), but worth a note when SPA re-injection / `chrome.scripting` is introduced in later stories.

## 3. Complexity
- [x] Checked.
- Minimal and not over-engineered. Functions are tiny (<15 lines), well within Coding-Standards §4 limits. Injectable `Sink`/`Logger` is the right amount of abstraction — it exists specifically to make logging unit-testable, not speculative generality.

## 4. Tests
- [x] Checked.
- 8 tests, 100% coverage, each tagged to its AC. Tests are meaningful (assert call count and exact message), not coverage-padding. Mutating a message constant or the prefix would fail `logger.test.ts`.
- `Nit:` (blocking? **no**) The entry-point tests (`content/index.test.ts`, `background/index.test.ts`) assert against the *unprefixed* constants (`CONTENT_LOADED_MESSAGE`, `SW_STARTED_MESSAGE`) using a **mock** logger. So a regression that broke the prefix wiring *in the entry path* (e.g. an entry that bypassed `createLogger`) would not fail these two tests — the prefix is guarded centrally only by `logger.test.ts` plus manual artifact inspection. End-to-end prefix is verified by composition + the built bundle, not by a single test. Suggest one composed test: `initContentScript(createLogger(sink))` asserting the full `[mermaid-preview] content script loaded`. Low cost, closes the gap.

## 5. Naming
- [x] Checked.
- Clear and convention-compliant: camelCase functions (`initContentScript`, `createLogger`), `UPPER_SNAKE` constants (`LOG_PREFIX`, `CONTENT_LOADED_MESSAGE`), PascalCase types (`Logger`, `Sink`, `Target`). Names are descriptive without being verbose.

## 6. Comments
- [x] Checked.
- Comments explain *why*, not *what*: the logger TSDoc cites Coding-Standards §6 (no PII), the vite.config block explains the IIFE-per-entry rationale and cites the ADR, and entry-point comments scope the work to US-001. No noise.

## 7. Style
- [x] Checked.
- Lint and (implicitly) Prettier config present; `eslint .` clean. 2-space indent, consistent. ESLint flat config is reasonable (`no-console: off` is correct for an extension that logs diagnostics).
- `Nit:` Coding-Standards §2/§10 expect Prettier enforced in CI; there is no `format:check` script and no CI workflow file in the repo. Arguably out of scope for a scaffold story, but worth adding before more contributors land code.

## 8. Documentation
- [x] Checked.
- `README.md` has accurate build + load-unpacked instructions and points to the ADR. PR doc and ADR are consistent with the implementation. ADR-MAIN-001 is registered in `docs/03-design/adr/registry.md` (Accepted, traced to MAIN-US-001).
- `Nit:` Diff hygiene — `.sdlc/logs/bash-commands.log` is tracked and appears in the diff (+11) even though `.gitignore` lists `*.log`. Harness artifact; consider untracking. Non-blocking.

## Reviewer sign-off
- [x] Checked all 8 areas above
- [x] CI / automated checks pass
- Must-fix (blocking): **none (0)**
- Nits (non-blocking): entry-path prefix lacks a dedicated end-to-end test; no Prettier `format:check`/CI workflow; tracked `.sdlc/logs/bash-commands.log`; no double-injection guard (future story).

This PR is a clean, minimal, well-tested MV3 scaffold that improves the codebase and faithfully implements ADR-MAIN-001. AC-2/AC-3/AC-4 runtime behavior is appropriately deferred to Phase-5 manual verification; the automated proxies are adequate.

Decision: **Approve**
