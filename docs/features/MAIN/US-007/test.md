---
us: "MAIN-US-007"
suite: "Nút tải sơ đồ PNG + SVG (download buttons)"
version: "1.0"
author: "qa-engineer"
date: "2026-06-12T03:26:05Z"
status: "pass"
tc: "TC-MAIN-US-007"
---

# Test Case Specification

Module `src/lib/download.ts` — hai nút PNG/SVG trên mỗi block Mermaid render thành công, PNG auto-fallback SVG khi canvas bị taint, notice nhẹ, cleanup qua `resetPreviews`. Kiểm thử bằng jsdom (download.test.ts, render.test.ts) và browser smoke gate (SMOKE-EVIDENCE-US-007).

## Test Cases

### TC-MAIN-US-007-01: Gắn control Download sau preview container; không gắn trên block lỗi
| Field | Value |
|---|---|
| **Requirement / AC** | AC-1 |
| **Priority** | High |
| **Type** | Functional |
| **Preconditions** | jsdom; block `data-mermaid-preview="rendered"` có SVG; block `data-mermaid-preview="error"` |
| **Test data** | preview div + SVG `mermaid-preview-3`; error div |

**Steps:**
| # | Action | Expected result |
|---|---|---|
| 1 | `attachDownload(preview, document, stubs)` trên block rendered | trả về container có attribute `data-mermaid-download` |
| 2 | Kiểm tra vị trí DOM | `preview.nextElementSibling` có attribute `data-mermaid-download` |
| 3 | Kiểm tra container trong body | `document.body.contains(container) === true` |
| 4 | Kiểm tra hai nút | `querySelectorAll('button')` có đúng 2 phần tử, label "PNG" và "SVG" |
| 5 | `renderMermaidBlock` trên block lỗi | không có `[data-mermaid-download]` trong DOM |
| 6 | (Smoke) real Chrome — flowchart + sequence | cả hai diagram có PNG + SVG buttons, container `data-mermaid-download` hiện diện |

**Overall expected result:** Download control được tạo, đặt đúng vị trí sau preview; block lỗi không có control.
**Actual result:** Pass — `download.test.ts` (4 assertions AC-1 block) + `render.test.ts` (success path, error path assertions) + SMOKE-EVIDENCE-US-007 Case A & B: AC-1 PASS.
**Status:** Pass

---

### TC-MAIN-US-007-02: Idempotent — không chèn control thứ hai khi scan lại
| Field | Value |
|---|---|
| **Requirement / AC** | AC-2 |
| **Priority** | High |
| **Type** | Functional |
| **Preconditions** | jsdom; block đã render, `HANDLED_ATTR` marker trong `renderMermaidBlock` |
| **Test data** | 1 block rendered, `renderMermaidBlock` gọi 2 lần |

**Steps:**
| # | Action | Expected result |
|---|---|---|
| 1 | `attachDownload` trả container có `DOWNLOAD_ATTR` set | caller có thể dùng attribute làm guard |
| 2 | `renderMermaidBlock` gọi lần 2 trên block đã có `HANDLED_ATTR` | đúng 1 `[data-mermaid-download]` trong DOM |

**Overall expected result:** Không chèn download control thứ hai khi block đã xử lý.
**Actual result:** Pass — `download.test.ts` (DOWNLOAD_ATTR marker assertion) + `render.test.ts` (exactly-one download control after redundant scan).
**Status:** Pass

---

### TC-MAIN-US-007-03: PNG export — real PNG cho diagram không có foreignObject
| Field | Value |
|---|---|
| **Requirement / AC** | AC-3 |
| **Priority** | High |
| **Type** | Functional |
| **Preconditions** | jsdom (rasterizer stub ok); Chrome thật (sequence diagram, foreignObject=0) |
| **Test data** | okRasterizer trả `Blob(['png-data'], {type:'image/png'})`; smoke: `mermaid-preview-2` (sequence) |

**Steps:**
| # | Action | Expected result |
|---|---|---|
| 1 | Click PNG — rasterizer resolve | `saver.calls[0].blob.type === 'image/png'` |
| 2 | Filename | `saver.calls[0].filename === 'mermaid-diagram-3.png'` |
| 3 | Notifier KHÔNG được gọi | `notifier.messages.length === 0` |
| 4 | (Smoke) Chrome — sequence PNG click | `mermaid-diagram-2.png` (image/png, 26676 B), no notice, transparent background confirmed |

**Overall expected result:** PNG thực sự được save khi rasterizer thành công; không notice; transparent bg.
**Actual result:** Pass — `download.test.ts` (AC-3 block: png blob type, no-notice) + `download.test.ts` (AC-5 filename mermaid-diagram-3.png) + SMOKE-EVIDENCE-US-007 Case B: AC-3 PASS.
**Status:** Pass

---

### TC-MAIN-US-007-04: PNG auto-fallback SVG + notice khi canvas bị tainted (SecurityError)
| Field | Value |
|---|---|
| **Requirement / AC** | AC-3b |
| **Priority** | High |
| **Type** | Functional / Negative |
| **Preconditions** | jsdom; rasterizer stub ném `DOMException('SecurityError')`; Chrome thật (flowchart, foreignObject=7) |
| **Test data** | `securityErrorRasterizer`; smoke: `mermaid-preview-1` (flowchart) |

**Steps:**
| # | Action | Expected result |
|---|---|---|
| 1 | Click PNG — rasterizer ném SecurityError | `saver.calls[0].blob.type === 'image/svg+xml'` |
| 2 | Filename SVG | `saver.calls[0].filename === 'mermaid-diagram-3.svg'` |
| 3 | Notifier gọi đúng một lần | `notifier.messages.length === 1` |
| 4 | Saver gọi đúng một lần (không double-save) | `saver.calls.length === 1` |
| 5 | Notifier KHÔNG gọi khi PNG resolve (no spurious notice) | `notifier.messages.length === 0` trên okRasterizer path |
| 6 | (Smoke) Chrome — flowchart PNG click | `mermaid-diagram-1.svg` saved (14840 B), notice "Đã tải SVG thay PNG cho sơ đồ này" shown exactly once |

**Overall expected result:** SecurityError path: fallback SVG saved, single notice, single saver call, no spurious notice on success.
**Actual result:** Pass — `download.test.ts` (AC-3b SecurityError block: 5 assertions) + SMOKE-EVIDENCE-US-007 Case A: AC-3b PASS.
**Status:** Pass

---

### TC-MAIN-US-007-05: PNG auto-fallback SVG + notice khi toBlob trả null
| Field | Value |
|---|---|
| **Requirement / AC** | AC-3b |
| **Priority** | High |
| **Type** | Negative |
| **Preconditions** | jsdom; rasterizer stub ném `Error('toBlob returned null')` |
| **Test data** | `nullBlobRasterizer`; svgId `mermaid-preview-5` |

**Steps:**
| # | Action | Expected result |
|---|---|---|
| 1 | Click PNG — rasterizer ném generic Error | `saver.calls[0].blob.type === 'image/svg+xml'` |
| 2 | Filename | `saver.calls[0].filename === 'mermaid-diagram-5.svg'` |
| 3 | Notifier gọi đúng một lần | `notifier.messages.length === 1` |

**Overall expected result:** null-blob path có cùng fallback behavior với SecurityError.
**Actual result:** Pass — `download.test.ts` (AC-3b null-blob block: 3 assertions in 1 test).
**Status:** Pass

---

### TC-MAIN-US-007-06: SVG export — vector gốc, lossless, không di chuyển SVG gốc
| Field | Value |
|---|---|
| **Requirement / AC** | AC-4 |
| **Priority** | High |
| **Type** | Functional |
| **Preconditions** | jsdom; block rendered có SVG với `xmlns` |
| **Test data** | SVG `viewBox="0 0 200 150"`, `id="mermaid-preview-3"` |

**Steps:**
| # | Action | Expected result |
|---|---|---|
| 1 | Click SVG — blob type | `saver.calls[0].blob.type === 'image/svg+xml'` |
| 2 | SVG content có xmlns | blob text chứa `xmlns="http://www.w3.org/2000/svg"` |
| 3 | SVG gốc vẫn trong preview | `preview.contains(originalSvg) === true` (clone — không di chuyển) |
| 4 | Notifier KHÔNG gọi | `notifier.messages.length === 0` (clean success path) |
| 5 | (Smoke) Chrome — SVG click flowchart | `mermaid-diagram-1.svg` (14840 B, lossless). Sequence: `mermaid-diagram-2.svg` (22875 B) |

**Overall expected result:** SVG vector serialize từ clone, không di chuyển gốc, không notice.
**Actual result:** Pass — `download.test.ts` (AC-4 block: 4 assertions) + SMOKE-EVIDENCE-US-007 Case A & B: AC-4 PASS.
**Status:** Pass

---

### TC-MAIN-US-007-07: Filename đúng — mermaid-diagram-<n>.png/svg
| Field | Value |
|---|---|
| **Requirement / AC** | AC-5 |
| **Priority** | High |
| **Type** | Functional / Boundary |
| **Preconditions** | jsdom; SVG ids `mermaid-preview-3`, `mermaid-preview-7`, custom id |
| **Test data** | 4 filename cases |

**Steps:**
| # | Action | Expected result |
|---|---|---|
| 1 | SVG click với id `mermaid-preview-3` | filename `mermaid-diagram-3.svg` |
| 2 | PNG click với id `mermaid-preview-3` | filename `mermaid-diagram-3.png` |
| 3 | SVG click với id `mermaid-preview-7` | filename `mermaid-diagram-7.svg` |
| 4 | SVG click với id không match pattern (`custom-id-999`) | filename match `/^mermaid-diagram-\d+\.svg$/` (local counter fallback) |

**Overall expected result:** Filename gắn theo index diagram từ SVG id; fallback counter khi id không match.
**Actual result:** Pass — `download.test.ts` (AC-5 block: 4 assertions).
**Status:** Pass

---

### TC-MAIN-US-007-08: resetPreviews gỡ download control — không mồ côi
| Field | Value |
|---|---|
| **Requirement / AC** | AC-6 |
| **Priority** | High |
| **Type** | Functional / Lifecycle |
| **Preconditions** | jsdom; block đã render kèm download control (`data-mermaid-download`) |
| **Test data** | `resetPreviews(document)` |

**Steps:**
| # | Action | Expected result |
|---|---|---|
| 1 | `resetPreviews(document)` sau khi render thành công | `[data-mermaid-download]` bị gỡ khỏi DOM |
| 2 | Không ném lỗi | `expect(() => resetPreviews(document)).not.toThrow()` |

**Overall expected result:** Download control bị gỡ cùng preview + toggle + zoom khi resetPreviews chạy.
**Actual result:** Pass — `render.test.ts` (resetPreviews block, `[data-mermaid-download]` removed assertion).
**Status:** Pass

---

### TC-MAIN-US-007-09: Control hiển thị ở cả trạng thái preview và source
| Field | Value |
|---|---|
| **Requirement / AC** | AC-7 |
| **Priority** | Medium |
| **Type** | Functional |
| **Preconditions** | jsdom; block rendered; download control đặt sau preview container qua `preview.after()` |
| **Test data** | toggle source/preview |

**Steps:**
| # | Action | Expected result |
|---|---|---|
| 1 | Download container đặt sau preview (không bên trong) | `preview.nextElementSibling` có `data-mermaid-download` — nằm ngoài preview container, sống sót qua toggle |
| 2 | Export SVG click | saver gọi với SVG blob — không phụ thuộc trạng thái toggle |

**Overall expected result:** Download control tồn tại ở cả hai trạng thái preview/source; export luôn lấy SVG từ preview container.
**Actual result:** Pass — placement verified bằng TC-01 (bước 2: `preview.nextElementSibling`); export từ SVG trong preview verified bằng TC-06 (bước 3: originalSvg vẫn trong preview sau clone). Mô hình `preview.after()` giống US-006 toggle/zoom — sống sót qua toggle là tính năng thiết kế.
**Status:** Pass

---

### TC-MAIN-US-007-10: Hai nút riêng PNG và SVG đều truy cập được (UX AC-8)
| Field | Value |
|---|---|
| **Requirement / AC** | AC-8 |
| **Priority** | Medium |
| **Type** | Functional / UX |
| **Preconditions** | jsdom; block rendered |
| **Test data** | container buttons |

**Steps:**
| # | Action | Expected result |
|---|---|---|
| 1 | Kiểm tra số lượng button | `querySelectorAll('button').length === 2` |
| 2 | Kiểm tra label | buttons có label "PNG" và "SVG" |

**Overall expected result:** Cả hai định dạng truy cập được qua hai nút riêng biệt (UX Option A đã chốt ADR-MAIN-008 + CR-MAIN-2026-06-12-01).
**Actual result:** Pass — `download.test.ts` (AC-1 block: two-button assertion covers AC-8).
**Status:** Pass

---

### TC-MAIN-US-007-11: pngScale — clamp(round(dpr), 2, 4) với fallback 3
| Field | Value |
|---|---|
| **Requirement / AC** | AC-3 (scale spec) |
| **Priority** | Medium |
| **Type** | Boundary |
| **Preconditions** | jsdom; pure function |
| **Test data** | dpr: 0, NaN, 1.0, 1.5, 2.0, 2.7, 3.0, 3.5, 4.0, 5.0, -1.5 |

**Steps:**
| # | Action | Expected result |
|---|---|---|
| 1 | `pngScale(0)` | `3` (fallback) |
| 2 | `pngScale(NaN)` | `3` (fallback) |
| 3 | `pngScale(1.0)` | `2` (clamp min) |
| 4 | `pngScale(1.5)` | `2` (round→2, clamp) |
| 5 | `pngScale(2.7)` | `3` |
| 6 | `pngScale(3.5)` | `4` |
| 7 | `pngScale(5.0)` | `4` (clamp max) |
| 8 | `pngScale(-1.5)` | `2` (truthy −1, clamp) |

**Overall expected result:** Tất cả 11 boundary/edge cases của pngScale đều đúng.
**Actual result:** Pass — `download.test.ts` (pngScale block: 11 assertions).
**Status:** Pass

---

### TC-MAIN-US-007-12: Edge — no SVG in preview: buttons no-op, không throw
| Field | Value |
|---|---|
| **Requirement / AC** | AC-3, AC-4 (error path) |
| **Priority** | Medium |
| **Type** | Negative |
| **Preconditions** | jsdom; preview div không có `<svg>` |
| **Test data** | preview không có SVG child |

**Steps:**
| # | Action | Expected result |
|---|---|---|
| 1 | Click SVG button khi preview không có `<svg>` | `saver.calls.length === 0` (no-op) |
| 2 | Click PNG button khi preview không có `<svg>` | `saver.calls.length === 0` (no-op) |

**Overall expected result:** Không crash khi SVG vắng mặt; không gọi saver.
**Actual result:** Pass — `download.test.ts` (edge cases block: 2 assertions).
**Status:** Pass

---

### TC-MAIN-US-007-13: Default notifier tạo toast div trong DOM
| Field | Value |
|---|---|
| **Requirement / AC** | AC-3b |
| **Priority** | Medium |
| **Type** | Functional |
| **Preconditions** | jsdom; không inject notifier (dùng default) |
| **Test data** | securityErrorRasterizer + real default notifier |

**Steps:**
| # | Action | Expected result |
|---|---|---|
| 1 | Click PNG — SecurityError fallback với default notifier | `document.querySelector('[data-mermaid-notice]')` không null |

**Overall expected result:** Default notifier tạo toast visible trong DOM (không dùng alert/confirm).
**Actual result:** Pass — `download.test.ts` (default notifier block: 1 assertion).
**Status:** Pass

---

### TC-MAIN-US-007-14: Default saver tạo anchor và trigger click
| Field | Value |
|---|---|
| **Requirement / AC** | AC-3, AC-4 (file save mechanism) |
| **Priority** | Medium |
| **Type** | Functional |
| **Preconditions** | jsdom; không inject saver (dùng default); `URL.createObjectURL` mock |
| **Test data** | okRasterizer; SVG click; anchor click spy |

**Steps:**
| # | Action | Expected result |
|---|---|---|
| 1 | Click SVG — default saver path | `URL.createObjectURL` được gọi |
| 2 | Anchor `<a download>` click được trigger | `anchorClicked === true` |

**Overall expected result:** Default saver tạo object URL và trigger download qua anchor click.
**Actual result:** Pass — `download.test.ts` (default saver block: 2 assertions).
**Status:** Pass

---

## Defect Log

| # | Severity | Mô tả | Trạng thái |
|---|---|---|---|
| D-01 | Minor | `serializeSvg` — nhánh viewBox→width/height (khi SVG thiếu `width`/`height` attribute) jsdom-testable nhưng chưa có test case riêng | Open |

D-01 là minor không chặn (reviewer độc lập đã ghi nhận trong review.md; không ảnh hưởng AC nào). Không có defect critical hoặc major.

---

## Test Summary

| Metric | Value |
|---|---|
| **Test cases total** | 14 |
| **Pass** | 14 |
| **Fail** | 0 |
| **Blocked** | 0 |
| **Automated suite (vitest)** | 156/156 pass (12 test files) |
| **download.test.ts** | 41 tests pass |
| **render.test.ts (US-007 assertions)** | 3 tests pass |
| **Statement coverage** | 96.07% |
| **Branch coverage** | 81.11% (≥ 80% threshold) |
| **Function coverage** | 97.61% |
| **Line coverage** | 96.61% |
| **download.ts branch coverage** | 62.26% (uncovered: lines 119, 126, 129, 173–209 — rasterizer internals, default seam wiring) |
| **Smoke gate (ADR-MAIN-008)** | PASS — SMOKE-EVIDENCE-US-007: flowchart SecurityError→SVG+notice (AC-3b), sequence PNG real (AC-3), both SVG exports (AC-4), AC-1 buttons present |
| **Open defects — Critical** | 0 |
| **Open defects — Major** | 0 |
| **Open defects — Minor** | 1 (D-01: serializeSvg viewBox branch untested — non-blocking) |

**AC coverage:**
| AC | Covered by |
|---|---|
| AC-1 | TC-01 (unit + smoke) |
| AC-2 | TC-02 (unit) |
| AC-3 | TC-03 (unit + smoke), TC-11 (pngScale) |
| AC-3b | TC-04 (SecurityError, unit + smoke), TC-05 (null-blob, unit), TC-13 (default notifier) |
| AC-4 | TC-06 (unit + smoke) |
| AC-5 | TC-07 (unit) |
| AC-6 | TC-08 (unit) |
| AC-7 | TC-09 (design/placement) |
| AC-8 | TC-10 (unit) |

No AC without coverage.

**Gate-5 verdict: PASS.** Zero open critical/major defects. All 156 automated tests pass. Global branch coverage 81.11% exceeds the 80% threshold. ADR-MAIN-008 browser smoke gate passed (real Chrome, real mermaid@11.15.0, both diagram types). Story MAIN-US-007 is releasable.
