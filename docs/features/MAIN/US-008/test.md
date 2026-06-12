---
us: "MAIN-US-008"
suite: "Packaging + Icons + Version Reset v1.0.0"
version: "1.0"
author: "qa-engineer"
date: "2026-06-12T04:41:17Z"
status: "pass"
tc: "TC-MAIN-US-008"
---

# Test Case Specification

Story MAIN-US-008 — Phát hành công khai lần đầu lên Chrome Web Store (v1.0.0). Scope: **AC-1** (version 1.0.0 in manifest + package.json), **AC-2** (manifest `icons` 16/48/128 → valid PNGs, no `action`), **AC-3** (`npm run package` → versioned zip at archive root incl. `icons/`, `copy:icons` wired). AC-4/5/6 are deployment-phase docs — deferred, not tested here.

## Test Cases

### TC-MAIN-US-008-01: Versi 1.0.0 khớp nhau giữa package.json và manifest.json
| Field | Value |
|---|---|
| **Requirement / AC** | AC-1 |
| **Priority** | High |
| **Type** | Functional |
| **Preconditions** | Worktree `story/MAIN-US-008-packaging-icons-v1.0.0`; both files present |
| **Test data** | `package.json`, `public/manifest.json` |

**Steps:**
| # | Action | Expected result |
|---|---|---|
| 1 | Read `package.json` `.version` | `"1.0.0"` |
| 2 | Read `public/manifest.json` `.version` | `"1.0.0"` |
| 3 | Assert both values equal | Equal — no mismatch |
| 4 | Confirm `package.json` has `"private": true` | `true` — npm publish warning suppressed |

**Overall expected result:** Both version fields are `1.0.0` and match; `private: true` retained.
**Actual result:** Pass — `tests/us008.test.ts` AC-1 suite: 3 tests pass (`package.json has version 1.0.0`, `public/manifest.json has version 1.0.0`, `both versions match`). `npm run typecheck` clean confirms `package.json` is well-formed.
**Status:** Pass

---

### TC-MAIN-US-008-02: Manifest có trường `icons` với 3 khoá (16/48/128), không có `action`
| Field | Value |
|---|---|
| **Requirement / AC** | AC-2 |
| **Priority** | High |
| **Type** | Functional |
| **Preconditions** | `public/manifest.json` present; icon files at `public/icons/` |
| **Test data** | manifest parsed as JSON; `public/icons/{16,48,128}.png` |

**Steps:**
| # | Action | Expected result |
|---|---|---|
| 1 | Assert `manifest.icons` is defined | Present |
| 2 | Assert `Object.keys(manifest.icons)` sorted = `["16","48","128"]` | Exactly 3 keys |
| 3 | Assert each path in `manifest.icons` resolves to an existing file | `public/icons/16.png`, `public/icons/48.png`, `public/icons/128.png` all exist |
| 4 | Assert `manifest.action` is undefined | No `action` field — YAGNI, not requested |
| 5 | Assert each PNG file starts with the 8-byte PNG signature `\x89PNG\r\n\x1a\n` | Valid PNG magic bytes |

**Overall expected result:** `icons` has exactly 3 keys pointing to real files; `action` absent; all files are valid PNGs.
**Actual result:** Pass — `tests/us008.test.ts` AC-2 suite: 8 tests pass (`manifest has an icons field`, `icons has exactly keys 16, 48, 128`, `icons paths point to existing files`, `manifest does NOT have an action field`, `16.png is a valid PNG with 16x16 dimensions`, `48.png is a valid PNG with 48x48 dimensions`, `128.png is a valid PNG with 128x128 dimensions`, `each PNG has a valid PNG signature`). Plus IDAT round-trip test passes.
**Status:** Pass

---

### TC-MAIN-US-008-03: PNG kích thước đúng — 16×16, 48×48, 128×128
| Field | Value |
|---|---|
| **Requirement / AC** | AC-2 |
| **Priority** | High |
| **Type** | Functional / Structural |
| **Preconditions** | `public/icons/` present; `sips` available (macOS) |
| **Test data** | `public/icons/16.png`, `public/icons/48.png`, `public/icons/128.png` |

**Steps:**
| # | Action | Expected result |
|---|---|---|
| 1 | `sips -g pixelWidth -g pixelHeight public/icons/16.png` | `pixelWidth: 16`, `pixelHeight: 16` |
| 2 | `sips -g pixelWidth -g pixelHeight public/icons/48.png` | `pixelWidth: 48`, `pixelHeight: 48` |
| 3 | `sips -g pixelWidth -g pixelHeight public/icons/128.png` | `pixelWidth: 128`, `pixelHeight: 128` |
| 4 | Assert IDAT payload inflates to `size*(1+size*4)` bytes per scanline model | 16→1040 B, 48→9264 B, 128→65664 B (round-trip via Node `zlib.inflateSync`) |

**Overall expected result:** All three PNGs are valid images at the exact required dimensions; each IDAT is well-formed zlib.
**Actual result:** Pass — `sips` output: `16.png` 16×16, `48.png` 48×48, `128.png` 128×128. Unit test `each PNG IDAT is a valid zlib-deflate stream (round-trip check)` passes. Reviewer evidence: IHDR color-type 6 (RGBA), `hasAlpha: yes` confirmed via `sips`.
**Status:** Pass

---

### TC-MAIN-US-008-04: Script `copy:icons` tồn tại và được wire vào `build`
| Field | Value |
|---|---|
| **Requirement / AC** | AC-3 |
| **Priority** | High |
| **Type** | Functional / Build-chain |
| **Preconditions** | `package.json` present |
| **Test data** | `package.json` scripts object |

**Steps:**
| # | Action | Expected result |
|---|---|---|
| 1 | Assert `scripts["copy:icons"]` is defined | Present |
| 2 | Assert `copy:icons` uses `node -e` with `fs.cpSync` convention | Pattern matches `fs.cpSync('public/icons','dist/icons',{recursive:true})` |
| 3 | Assert `scripts.build` contains `copy:icons` | `copy:icons` is part of the build chain |
| 4 | Assert build order: `clean` → `build:content` → `build:background` → `copy:manifest` → `copy:icons` | Correct left-to-right ordering (icons copied after bundles) |
| 5 | Assert `scripts.package` exists and contains `npm run build` | Package triggers build first |
| 6 | Assert `scripts.package` delegates to `scripts/package.mjs` | Node-based packager used |

**Overall expected result:** `copy:icons` is a real script wired in `build` before packaging; `package.mjs` handles zip creation.
**Actual result:** Pass — `tests/us008.test.ts` AC-3 wiring suite: 9 tests pass (copy:icons script present, uses node -e/cpSync, build includes copy:icons, order correct, package includes npm run build, delegates to package.mjs, scripts/package.mjs exists, scripts/gen-icons.mjs exists).
**Status:** Pass

---

### TC-MAIN-US-008-05: `npm run package` → zip đúng tên, entries ở gốc archive
| Field | Value |
|---|---|
| **Requirement / AC** | AC-3 |
| **Priority** | High |
| **Type** | End-to-end / Functional |
| **Preconditions** | Node/npm available; worktree checked out |
| **Test data** | Full build pipeline |

**Steps:**
| # | Action | Expected result |
|---|---|---|
| 1 | Run `npm run package` | Exits 0; stdout contains `Created mermaid-preview-google-chat-v1.0.0.zip` |
| 2 | Assert zip file exists: `mermaid-preview-google-chat-v1.0.0.zip` | File present (847,986 bytes) |
| 3 | `unzip -l` — check `manifest.json` at root | Entry `manifest.json` (no `dist/` prefix) |
| 4 | `unzip -l` — check `content.js` at root | Entry `content.js` at root |
| 5 | `unzip -l` — check `background.js` at root | Entry `background.js` at root (see Nit 1) |
| 6 | `unzip -l` — check `icons/16.png` at root | Entry `icons/16.png` (no `dist/` prefix) (see Nit 1) |
| 7 | `unzip -l` — check `icons/48.png` at root | Entry `icons/48.png` (no `dist/` prefix) (see Nit 1) |
| 8 | `unzip -l` — check `icons/128.png` at root | Entry `icons/128.png` at root (see Nit 1) |
| 9 | Assert NO entry has `dist/` prefix | Archive root is flat — no nesting trap |
| 10 | Assert zip size ≤ 2GB | 847,986 bytes — well within limit |

**Overall expected result:** `npm run package` builds, copies icons to `dist/icons/`, and creates a versioned zip with all required entries at the archive root.
**Actual result:** Pass — live run output: `Created mermaid-preview-google-chat-v1.0.0.zip (847986 bytes)`. `unzip -l` output: entries `background.js`, `content.js`, `icons/`, `icons/128.png`, `icons/16.png`, `icons/48.png`, `manifest.json` — all at root, no `dist/` prefix. 7 files total. Unit e2e test: `npm run package creates the versioned zip file`, `zip contains manifest.json at root`, `zip contains icons/128.png at root`, `zip contains content.js at root` — all pass.
**Status:** Pass

---

### TC-MAIN-US-008-06: Nit-1 verification — `background.js` + all 3 icon sizes in zip
| Field | Value |
|---|---|
| **Requirement / AC** | AC-3 (Reviewer Nit 1) |
| **Priority** | Low |
| **Type** | Verification |
| **Preconditions** | Zip produced by TC-05 |
| **Test data** | `unzip -l` output |

**Steps:**
| # | Action | Expected result |
|---|---|---|
| 1 | Verify `background.js` in zip listing | Present (confirmed by `unzip -l`) |
| 2 | Verify `icons/16.png` in zip listing | Present |
| 3 | Verify `icons/48.png` in zip listing | Present |
| 4 | Verify `icons/128.png` in zip listing | Present |

**Overall expected result:** All four AC-3 required entries not covered by the automated e2e assertions are physically present in the zip (manual verification compensates for the test gap Nit-1 identifies).
**Actual result:** Pass — `unzip -l` confirms all four entries present at root. Note: the unit e2e test asserts `manifest.json`, `icons/128.png`, `content.js` but not `background.js`, `icons/16.png`, `icons/48.png` — this is Nit-1 from the review; the entries are present in the zip but the assertion gap remains as a Minor observation.
**Status:** Pass

---

### TC-MAIN-US-008-07: Nit-2 verification — binary zip search framing (adequacy note)
| Field | Value |
|---|---|
| **Requirement / AC** | AC-3 (Reviewer Nit 2) |
| **Priority** | Low |
| **Type** | Verification / Risk assessment |
| **Preconditions** | Review of test approach |
| **Test data** | `tests/us008.test.ts` e2e test implementation |

**Steps:**
| # | Action | Expected result |
|---|---|---|
| 1 | Verify that paired `toContain` + `not.toContain('dist/...')` approach is used | Both assertions present in us008.test.ts |
| 2 | Assess risk: substring match over zip bytes vs. central directory parsing | The `not.toContain('dist/')` guard prevents false-pass on nested entries — adequate for a build-time check |

**Overall expected result:** The binary-string search is acknowledged as somewhat fragile (Nit 2) but the pairing with negative assertions is adequate for the CI use-case. Risk is Low; parsing the central directory would be more robust but is not required for Gate-5.
**Actual result:** Pass (adequacy confirmed) — approach holds for the current zip structure. Registering as Trivial observation only.
**Status:** Pass

---

### TC-MAIN-US-008-08: Nit-3 verification — `output` stream error handler in package.mjs
| Field | Value |
|---|---|
| **Requirement / AC** | AC-3 (Reviewer Nit 3) |
| **Priority** | Low |
| **Type** | Verification / Risk assessment |
| **Preconditions** | `scripts/package.mjs` readable |
| **Test data** | Source code of package.mjs |

**Steps:**
| # | Action | Expected result |
|---|---|---|
| 1 | Confirm `archive.on('error', rej)` is wired | Present in package.mjs |
| 2 | Check whether `output` write-stream `'error'` event is also handled | Not wired — disk write errors would not reject the promise cleanly |
| 3 | Assess risk for a local build script | Low — disk errors on a local build script are rare and would surface as unhandled promise rejections in the Node process |

**Overall expected result:** Nit-3 is a valid low-risk observation. The `output` stream error handler omission is a Trivial defect for a local build script; it does not affect the produced zip in normal operation.
**Actual result:** Pass (risk accepted) — package produced correctly in end-to-end run. Registering as Trivial.
**Status:** Pass

---

## Defect Log

| # | Severity | Description | Status |
|---|---|---|---|
| D-01 | Minor | e2e zip test asserts `manifest.json`, `content.js`, `icons/128.png` at root but does NOT assert `background.js`, `icons/16.png`, or `icons/48.png` — all four AC-3 required entries are physically present (verified by `unzip -l`), but the test does not guard them (Reviewer Nit-1) | Open |
| D-02 | Trivial | Binary-string search over raw zip bytes in the e2e test is somewhat fragile (substring could appear in compressed content); `not.toContain('dist/')` pairing is adequate but parsing the central directory would be more robust (Reviewer Nit-2) | Open |
| D-03 | Trivial | `scripts/package.mjs` wires `archive.on('error', rej)` but not the `output` write-stream `'error'` event; disk-write failures would not cleanly reject the `done` promise (Reviewer Nit-3) | Open |

No Critical or Major defects. All three open items are Minor/Trivial and non-blocking.

---

## Test Summary

| Metric | Value |
|---|---|
| **Test cases total** | 8 |
| **Pass** | 8 |
| **Fail** | 0 |
| **Blocked** | 0 |
| **Automated suite (vitest)** | 181/181 pass (13 test files) |
| **us008.test.ts** | 30 tests pass |
| **Statement coverage** | 96.07% |
| **Branch coverage** | 81.11% (≥ 80% threshold) |
| **Function coverage** | 97.61% |
| **Line coverage** | 96.61% |
| **`npm run typecheck`** | clean (exit 0) |
| **`npm run lint`** | clean (exit 0) |
| **`npm run package`** | `mermaid-preview-google-chat-v1.0.0.zip` (847,986 bytes) — correct name, correct entries |
| **`unzip -l` verification** | `manifest.json`, `content.js`, `background.js`, `icons/16.png`, `icons/48.png`, `icons/128.png` — all at archive root, no `dist/` prefix |
| **PNG dimensions (sips)** | 16×16, 48×48, 128×128 confirmed |
| **Open defects — Critical** | 0 |
| **Open defects — Major** | 0 |
| **Open defects — Minor** | 1 (D-01: incomplete e2e zip assertions — non-blocking) |
| **Open defects — Trivial** | 2 (D-02: binary-string fragility; D-03: output stream error handler) |

**AC coverage:**
| AC | In scope | Covered by |
|---|---|---|
| AC-1 | Yes | TC-01 (unit) |
| AC-2 | Yes | TC-02 (unit), TC-03 (unit + sips) |
| AC-3 | Yes | TC-04 (build-chain unit), TC-05 (e2e), TC-06 (Nit-1 manual verify), TC-07 (Nit-2 risk), TC-08 (Nit-3 risk) |
| AC-4 | No (deployment-phase) | Deferred — not a defect |
| AC-5 | No (deployment-phase) | Deferred — not a defect |
| AC-6 | No (deployment-phase) | Deferred — not a defect |

No in-scope AC without coverage.

**Gate-5 verdict: PASS.** Zero open Critical/Major defects. All 181 automated tests pass. Global branch coverage 81.11% exceeds the 80% threshold. `npm run package` e2e validated: `mermaid-preview-google-chat-v1.0.0.zip` produced at 847,986 bytes, all required entries at archive root, PNGs at correct dimensions. Story MAIN-US-008 (AC-1/2/3) is releasable.
