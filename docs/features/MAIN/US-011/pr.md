# PR-MAIN-US-011 — Support `mail.google.com` (Google Chat embedded in Gmail)

## Summary
Extend the content-script injection so Mermaid previews also work when Google Chat is used inside Gmail (`https://mail.google.com`), not only on the standalone `chat.google.com`.

## What & Why
Implements US-011. The MV3 content script previously matched only `https://chat.google.com/*` on the top frame. In Gmail, the Chat/Spaces panel renders inside a **same-origin nested iframe** under `mail.google.com` (path `/chat/...`), so the message `<pre>` blocks live in that iframe and were never reached.

Two `public/manifest.json` changes:
- Add `https://mail.google.com/*` to `content_scripts[0].matches` (keep `https://chat.google.com/*`).
- Set `"all_frames": true` so the script is injected into the nested Chat iframe, not just the top frame.

Decision recorded inline (Hướng B — broad pattern + all_frames): the exact iframe path is not verified, so a broad `mail.google.com/*` pattern avoids breaking if Google changes the path. Injecting into other Gmail iframes is harmless — the detect pipeline is cheap and idempotent (`data-mermaid-preview` marker; only scans `<pre>`), so frames without Mermaid blocks are a no-op.

No change to detect/render/observe/theme/content logic — they are DOM-driven and URL-independent.

## Related
- US: MAIN-US-011
- ADR: none (no architectural decision reversed; least-privilege + no-exec posture preserved)
- Design: docs/features/MAIN/US-011/design.md

## Type of change
- [ ] Bug fix (corrective, non-breaking)
- [x] New feature
- [ ] Breaking change

## How verified
- TDD: updated `tests/manifest.test.ts` with two red assertions (matches now includes `mail.google.com/*`; `all_frames === true`), confirmed they failed, then the manifest change made them green.
- `npx vitest run` → 190 pass (13 files).
- `npm run typecheck` (tsc --noEmit) → exit 0.
- `npm run lint` (eslint .) → exit 0.
- `npm run build` → dist/manifest.json carries the two-host matches + `all_frames: true`.
- Least-privilege preserved (AC-4): no `<all_urls>`, no `permissions`/`host_permissions`; `matches` limited to the two Google hosts.
- Known limit: runtime iframe behavior on real Gmail is not unit-testable from a static manifest test — covered by a manual test case (TC-MAIN-US-011-03) in test.md.
