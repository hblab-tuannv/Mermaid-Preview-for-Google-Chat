---
us: "MAIN-US-001"
suite: "Scaffold MV3 extension + content-script injection"
version: "1.0"
author: "qa-engineer"
---

# Test Case Specification

## Test Cases

### TC-MAIN-US-001-01: Build produces a complete dist/
| Field | Value |
|---|---|
| **Requirement / AC** | AC-1 |
| **Priority** | High |
| **Type** | Functional |
| **Preconditions** | `npm install` done on a clean checkout |
| **Test data** | n/a |

**Steps:**
| # | Action | Expected result |
|---|---|---|
| 1 | Run `npm run build` | Exit code 0 |
| 2 | List `dist/` | Contains `content.js`, `background.js`, `manifest.json` |
| 3 | Inspect `dist/content.js` | Self-invoking IIFE (`var MermaidPreview_content=(function...`) |

**Overall expected result:** Build succeeds and emits the bundled content/background scripts plus the manifest.
**Actual result:** Build exit 0; `dist/` = `content.js`, `background.js`, `manifest.json`; `content.js` confirmed IIFE.
**Status:** Pass

---

### TC-MAIN-US-001-02: Manifest is valid MV3 with a registered service worker
| Field | Value |
|---|---|
| **Requirement / AC** | AC-2 |
| **Priority** | High |
| **Type** | Functional |
| **Preconditions** | `dist/` built |
| **Test data** | `dist/manifest.json` |

**Steps:**
| # | Action | Expected result |
|---|---|---|
| 1 | Run `npm test` (manifest.test.ts) | `manifest_version === 3`, `background.service_worker === "background.js"` |
| 2 | Inspect built `dist/manifest.json` | mv=3, sw=background.js |

**Overall expected result:** Manifest declares MV3 + a service worker.
**Actual result:** `npm test` passed; `dist/manifest.json` → mv:3, sw:background.js.
**Status:** Pass

---

### TC-MAIN-US-001-03: Extension loads unpacked without errors (runtime — manual)
| Field | Value |
|---|---|
| **Requirement / AC** | AC-2 |
| **Priority** | High |
| **Type** | Functional |
| **Preconditions** | `dist/` built; Chrome ≥110 |
| **Test data** | n/a |

**Steps:**
| # | Action | Expected result |
|---|---|---|
| 1 | `chrome://extensions` → Developer mode → Load unpacked → select `dist/` | Extension loads, no red "Errors" badge |
| 2 | Inspect service worker | "service worker (Inactive/Active)" registered; console shows `[mermaid-preview] service worker started` |

**Overall expected result:** Extension loads cleanly and the service worker registers.
**Actual result:** _Pending — requires manual run in a real Chrome._
**Status:** Blocked

---

### TC-MAIN-US-001-04: Content script logs once on chat.google.com (runtime — manual)
| Field | Value |
|---|---|
| **Requirement / AC** | AC-3 |
| **Priority** | High |
| **Type** | Functional |
| **Preconditions** | Extension loaded unpacked; signed in to Google Chat |
| **Test data** | n/a |

**Steps:**
| # | Action | Expected result |
|---|---|---|
| 1 | Open `https://chat.google.com/`, open DevTools console | Exactly one line `[mermaid-preview] content script loaded` per page load |

**Overall expected result:** Content script injects and logs the loaded message once.
**Actual result:** _Pending manual run._ Automated proxy: unit tests assert `initContentScript` logs once + the end-to-end prefixed line; built `content.js` contains both `[mermaid-preview]` and `content script loaded` literals.
**Status:** Blocked (automated proxy: Pass)

---

### TC-MAIN-US-001-05: Content script does NOT run on other origins (runtime — manual)
| Field | Value |
|---|---|
| **Requirement / AC** | AC-4 |
| **Priority** | High |
| **Type** | Negative |
| **Preconditions** | Extension loaded unpacked |
| **Test data** | `https://example.com/` |

**Steps:**
| # | Action | Expected result |
|---|---|---|
| 1 | Open `https://example.com/`, open DevTools console | No `[mermaid-preview]` log appears |

**Overall expected result:** Injection is scoped to chat.google.com only.
**Actual result:** _Pending manual run._ Automated proxy: `manifest.test.ts` asserts `content_scripts[0].matches === ['https://chat.google.com/*']`.
**Status:** Blocked (automated proxy: Pass)

---

### TC-MAIN-US-001-06: Manifest declares no broad or surplus permissions
| Field | Value |
|---|---|
| **Requirement / AC** | AC-5 |
| **Priority** | High |
| **Type** | Negative / Security |
| **Preconditions** | `dist/` built |
| **Test data** | `dist/manifest.json` |

**Steps:**
| # | Action | Expected result |
|---|---|---|
| 1 | Run `npm test` (manifest.test.ts AC-5 case) | No `<all_urls>`, no `permissions`, no `host_permissions` |
| 2 | Inspect built manifest | Confirms minimal surface |

**Overall expected result:** Manifest is minimal — no broad host access, no surplus permissions.
**Actual result:** `npm test` passed; built manifest has no `permissions`/`host_permissions`/`<all_urls>`.
**Status:** Pass

---

## Test Summary
- **Total:** 6 cases — **Pass: 3** (TC-01, TC-02, TC-06 — fully automated/executed), **Blocked: 3** (TC-03, TC-04, TC-05 — runtime browser verification pending; automated proxies pass for TC-04/05).
- **Automated suite:** 9/9 Vitest tests pass, coverage 100% (≥80%). `tsc` strict, ESLint, Prettier `--check` all exit 0.
- **Open defects:** critical 0, major 0, minor 0.
- **Note:** The 3 Blocked cases need one manual pass in a real Chrome with a Google account (load `dist/` unpacked, observe console on chat.google.com and a non-chat origin). No defects found; Blocked = not-yet-executed, not failed.
