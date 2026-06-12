---
version: 1.0
date: 2026-06-12T04:38:54Z
author: code-reviewer
status: Approve
approver: code-reviewer
review: REVIEW-MAIN-US-008
story: MAIN-US-008
pr: PR-MAIN-US-008
adr: N/A
---

# Code Review — REVIEW-MAIN-US-008

Story: MAIN-US-008 (Phát hành công khai lần đầu lên Chrome Web Store — v1.0.0; packaging + icons + version reset)
PR: PR-MAIN-US-008 · ADR: N/A (design.md §1 — no decision meets the ADR threshold)
Scope of this PR: **AC-1, AC-2, AC-3 only.** AC-4/5/6 are deployment-phase docs and are EXPECTED to be absent here — not a defect.

## Reproduced evidence (run in the worktree, not trusted from pr.md)

| Gate | Result |
|---|---|
| `npm test` (vitest run --coverage) | **181 passed (13 files)** — incl. 30 new `tests/us008.test.ts` |
| Global branch coverage | **81.11%** (146/180) — ≥ 80% threshold met |
| Statements / Functions / Lines | 96.07% / 97.61% / 96.61% |
| `npm run lint` (eslint .) | clean (exit 0) |
| `npm run typecheck` (tsc --noEmit) | clean (exit 0) |
| `npm run package` end-to-end | build + zip OK → `mermaid-preview-google-chat-v1.0.0.zip` (847,986 bytes) |
| `unzip -l` of the produced zip | entries at ROOT: `manifest.json`, `content.js`, `background.js`, `icons/`, `icons/{16,48,128}.png` — NO `dist/` prefix |

Entry gate satisfied: all automated checks green.

## Evidence for the load-bearing focus areas

- **PNG validity (`scripts/gen-icons.mjs`):** Encoder uses Node built-ins only — `crc32` with the correct `0xEDB88320` polynomial, `IHDR` with bit-depth 8 / color-type 6 (RGBA), and `zlib.deflateSync` (RFC 1950 zlib-wrapped, exactly what IDAT requires — NOT `deflateRawSync`). Verified the three on-disk PNGs decode as real images: `sips` reports 16×16, 48×48, 128×128 each with `hasAlpha: yes`; each `IDAT` inflates to exactly `size*(1+size*4)` bytes (1040 / 9264 / 65664) with per-scanline filter byte 0. Signature + IHDR + IDAT + IEND + CRC structure all present and valid.
- **Determinism / re-runnable:** Regenerating with `node scripts/gen-icons.mjs` produced byte-identical files (matching shasum before/after; `git status` clean for `public/icons/`). The committed PNGs equal the generator output — no drift.
- **Packaging at archive ROOT (`scripts/package.mjs`):** `archive.directory(distPath, false)` (second arg `false` = no dest prefix) places all entries at root; `unzip -l` confirms `icons/` subdir is preserved (the `zip -j` flattening trap is avoided). Versioned filename is derived from `package.json` `version` → `mermaid-preview-google-chat-v1.0.0.zip`. The `output.on('close')` await is correct — it guarantees the file is flushed before the process exits, so the e2e test does not race.
- **`archiver` v8 API:** The named import `import { ZipArchive } from 'archiver'` is correct for v8 (verified: v8 `exports: "./index.js"` exposes `ZipArchive`/`TarArchive`/etc.; the instance has `directory`/`pipe`/`finalize`/`pointer`/`on`). I flagged this on read, then proved it end-to-end — resolved by evidence.
- **Build-chain wiring:** `build` = `clean → build:content → build:background → copy:manifest → copy:icons`; `package` = `npm run build && node scripts/package.mjs`. `copy:icons` runs before packaging, so `dist/icons/` exists before `archiver` reads `dist/**` — confirmed in the live run. `copy:icons` follows the repo's node-`-e` file-op convention (`fs.cpSync('public/icons','dist/icons',{recursive:true})`), consistent with `copy:manifest` — no shell CLI introduced.
- **Version reset:** Both `public/manifest.json` and `package.json` = `1.0.0` and match; `private: true` is retained. No `action` field added to the manifest. `content_scripts.matches` and the permission set are unchanged.
- **Supply chain:** `archiver` (and `@types/archiver`) are in `devDependencies` only, never in `dependencies`. `grep -rl archiver lib/` returns nothing — it is not referenced by shipped source and never lands in `dist/`. End-user supply-chain surface = 0.

## 8-area sign-off

- [x] **Design** — Matches design.md exactly: `archiver` dev-only zip lib chosen for cross-platform determinism over a `zip` CLI, and the load-bearing `copy:icons` build step added so the manifest `icons` field never points at missing files. No ADR needed (cosmetic/metadata/packaging; trivially reversible). Good fit; no over-reach into render logic (US-001..007 untouched).
- [x] **Functionality** — Verified by running the real pipeline, not by reading: valid PNGs at exact sizes with transparency, deterministic generation, zip with required entries at root and `icons/` preserved, version-derived filename. All AC-1/2/3 satisfied end-to-end.
- [x] **Complexity** — Appropriately simple. Hand-rolled PNG encoder is justified (zero runtime dep, deterministic placeholder) and well-structured (CRC table, chunk builder, IHDR/IDAT/IEND helpers). `package.mjs` is a thin, correct streaming packager.
- [x] **Tests** — `tests/us008.test.ts` asserts the AC substance, not vacuously: version equality across both files; manifest `icons` has exactly keys 16/48/128 pointing to existing files; **no `action` field**; PNG signature + IHDR dimensions per file; and an IDAT round-trip that inflates and checks the decompressed scanline length — that last one would fail on a malformed/garbage PNG, so it is a real validity guard. Build-script order is asserted via index ordering. The e2e test (`npm run package`) has a correct 120s vitest per-test timeout (default 5s is too short for a full vite build) and cleans up its zip in `afterAll`.
- [x] **Naming** — Clear and conventional (`gen-icons.mjs`, `package.mjs`, `copy:icons`, `encodePNG`, `makeIHDR`, `makeIDAT`, `buildPixels`).
- [x] **Comments** — Useful and explain *why* (e.g. "deflateSync produces RFC 1950 zlib-wrapped stream (required by PNG spec)"; "second arg false = no dest prefix"; the `output.on('close')` flush rationale). Module headers document intent.
- [x] **Style** — eslint + tsc clean repo-wide. The eslint config addition scopes Node globals (`Buffer`, `__dirname`, `require`, …) to `scripts/**/*.mjs` and `build/**` only — correctly narrow, does not loosen the main rule set. The zip output is gitignored (`mermaid-preview-google-chat-v*.zip`).
- [x] **Documentation** — story.md (AC-1..AC-6) and design.md are authoritative and consistent with the implementation; pr.md present. AC-4/5/6 docs are correctly deferred to deployment.

## Reviewer sign-off
- [x] Checked all 8 areas above
- [x] CI / automated checks pass (reproduced locally)
- [x] Author ≠ reviewer (independent review, small mode)

## Findings summary
- **Blocking (must-fix): 0**
- Non-blocking Nits:
  1. The e2e zip test asserts `manifest.json` / `content.js` / `icons/128.png` at root, but AC-3 also names `background.js` and `icons/16.png`/`48.png` as required entries — the zip *does* contain them (verified by `unzip -l`), but the test does not guard them. Consider asserting all four required entries.
  2. The root-placement guard relies on the paired `toContain(...)` + `not.toContain('dist/...')`; a lone `toContain('content.js')` would pass even if entries were nested. The pair is adequate, but the raw binary-string search over the zip bytes is somewhat fragile (e.g. a filename substring appearing inside a compressed blob). Parsing the central directory (or using an unzip lib) would be more robust.
  3. `package.mjs` wires `archive.on('error', rej)` but not the output write stream's `'error'` event; a disk/write failure on `output` would not reject the `done` promise as cleanly. Low risk for a local build script.

## Decision: **Approve**

The PR improves the codebase and faithfully implements AC-1/2/3 from the story and design: version reset to 1.0.0 in both files with no spurious `action`, valid deterministic placeholder PNGs at the exact required sizes, a cross-platform node-based packager that puts entries at the archive root with `icons/` preserved and a version-derived filename, and the load-bearing `copy:icons` build step so the shipped manifest never points at missing icons. `archiver` is dev-only and never ships. All gates are green (181 tests, 81.11% branch, lint + typecheck clean) and the full `npm run package` pipeline was reproduced successfully. No must-fixes.
