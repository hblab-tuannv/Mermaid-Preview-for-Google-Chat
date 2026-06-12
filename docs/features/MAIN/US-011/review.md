---
id: REVIEW-MAIN-US-011
version: 1.0
date: "2026-06-12T10:21:16Z"
author: code-reviewer
status: Approve
approver: code-reviewer
---

# Code Review — REVIEW-MAIN-US-011

- Story: MAIN-US-011 (Hỗ trợ thêm domain `mail.google.com` — Google Chat nhúng trong Gmail)
- PR: PR-MAIN-US-011
- ADR: none (no architectural decision reversed; ADR-MAIN-003 no-exec posture preserved)
- Scope reviewed: working-tree changes to `public/manifest.json` and `tests/manifest.test.ts` (plus orchestration bookkeeping in `backlog/`, out of review scope).

## Automated checks (independently re-run)
- `npx vitest run` → 190 passed (13 files).
- `npm run typecheck` (tsc --noEmit) → exit 0.
- `npm run lint` (eslint .) → exit 0.
- `git diff --stat` confirms only `public/manifest.json` + `tests/manifest.test.ts` are production/test changes; no `src/` files touched.

## Checklist (8 areas)
1. [x] **Design** — Right layer for the fix: Chat embedded in Gmail renders in a same-origin nested iframe under `mail.google.com`, so the change is purely an injection-scope expansion (add `https://mail.google.com/*` + `all_frames: true`) with no change to the URL-independent DOM pipeline. Matches MV3 content-script mechanics. ✔
2. [x] **Functionality** — Manifest now matches both Google hosts and injects into nested frames, which is exactly what reaching the Gmail Chat iframe requires. Detect/render/observe are DOM-driven and unchanged, so identical Chat DOM inside the iframe yields identical previews. ✔
3. [x] **Complexity** — Two-line manifest change; broad-pattern (Hướng B) chosen over a path-specific pattern because the exact iframe path is unverified — a sound trade-off given the pipeline is idempotent (`data-mermaid-preview` marker, scans `<pre>` only) so superfluous Gmail-iframe injection is a harmless no-op. Not over-engineered. ✔
4. [x] **Tests** — Updated `tests/manifest.test.ts` asserts the two-host `matches` array (AC-1/AC-3), `all_frames === true` (AC-2), single content_scripts entry, `js === ['content.js']`, and least-privilege (no `<all_urls>`, `permissions`/`host_permissions` undefined). The exact `toEqual` array also enforces "only two Google hosts." Static manifest tests cannot exercise runtime iframe injection — an inherent limit, acceptable for a manifest-only change. ✔
5. [x] **Naming** — Test descriptions clear and AC-cited; no production identifiers introduced. ✔
6. [x] **Comments** — Decision rationale (broad pattern + all_frames, idempotency) documented in design.md / pr.md; manifest needs no inline comment. ✔
7. [x] **Style** — JSON + test style match surrounding code; lint clean. ✔
8. [x] **Documentation** — Story, design (inline decision, no ADR), and PR all describe the change and the broad-pattern rationale. See Nit on the test.md reference. ✔

## Security / least-privilege note
No `permissions`, `host_permissions`, or `<all_urls>` added; `matches` stays limited to exactly the two Google hosts. Content-script `matches` self-grant injection in MV3, so no host_permissions are needed. The no-exec/anti-XSS render path is untouched. Least-privilege is genuinely preserved (AC-4).

## Honest note on AC-3 ("chat.google.com unchanged")
`all_frames: true` is a behavioral expansion on `chat.google.com` as well as `mail.google.com`: the script will now inject into chat.google.com **sub-frames**, not only the top frame as before. This is harmless — the pipeline is idempotent and only acts on `<pre>` Mermaid blocks — and the structural AC-3 assertions (single entry, `js`, host still present) still hold. Flagging for transparency; not blocking.

## Findings
- `Nit:` Test labels are slightly off vs the story's AC numbering: the least-privilege test is titled "(AC-5)" but asserts the story's AC-4 (least-privilege); the DOM-unchanged criterion is the story's AC-5. Assertion content is correct — only the cited numbers are mislabeled.
- `Nit:` PR.md ("How verified") cites a manual test case "TC-MAIN-US-011-03 in test.md", but `docs/features/MAIN/US-011/test.md` does not exist yet. The real-Gmail iframe behavior is the documented known-limit and a QA/manual-phase deliverable; the reference is forward-looking. Recommend adding the manual test case to test.md in the testing phase (the backlog claim already carries `tc: TC-MAIN-US-011`).

## Verdict
**Approve.** Minimal, correct, least-privilege-preserving manifest-only change with green CI and TDD manifest assertions covering all five acceptance criteria. The two findings are non-blocking nits (documentation/labeling). Runtime iframe verification on real Gmail is an inherent static-test limit appropriately deferred to manual QA.
