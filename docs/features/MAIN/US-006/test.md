---
us: "MAIN-US-006"
suite: "Nút zoom phóng to sơ đồ toàn màn hình"
version: "1.0"
author: "qa-engineer"
date: "2026-06-11T17:07:15Z"
status: "pass"
---

# Test Case Specification

Logic gắn nút zoom, tạo overlay full-viewport, zoom/pan bằng CSS transform, ba đường đóng overlay, dọn listener không rò rỉ, và cleanup khi `resetPreviews` được test bằng jsdom (`zoom.test.ts`, `render.test.ts`). Trải nghiệm thực tế kéo chuột và toggle theme trong Google Chat cần xác nhận thủ công — xem TC-04 và TC-07.

## Test Cases

### TC-MAIN-US-006-01: Gắn nút zoom sau preview container; không gắn trên block lỗi
| Field | Value |
|---|---|
| **Requirement / AC** | AC-1 |
| **Priority** | High |
| **Type** | Functional |
| **Preconditions** | jsdom; block với `data-mermaid-preview="rendered"`; block với `data-mermaid-preview="error"` |
| **Test data** | preview div + SVG; error div |

**Steps:**
| # | Action | Expected result |
|---|---|---|
| 1 | `attachZoom(preview, document)` trên block rendered | button `[data-mermaid-zoom]` được chèn vào DOM |
| 2 | button là `<BUTTON>` element | `button.tagName === 'BUTTON'` |
| 3 | button nằm ngay sau preview container | `preview.nextElementSibling` có attribute `data-mermaid-zoom` |
| 4 | `renderMermaidBlock` trên block lỗi | không có `[data-mermaid-zoom]` trong DOM |

**Overall expected result:** Zoom button được tạo và đặt đúng vị trí sau preview container; block lỗi không có zoom button.
**Actual result:** Pass — `zoom.test.ts` (button placement, 3 assertions) + `render.test.ts` (error path, 1 assertion).
**Status:** Pass

---

### TC-MAIN-US-006-02: Idempotent — chỉ một nút zoom mỗi block
| Field | Value |
|---|---|
| **Requirement / AC** | AC-2 |
| **Priority** | High |
| **Type** | Functional |
| **Preconditions** | jsdom; block đã có nút zoom (`HANDLED_ATTR` marker trong renderMermaidBlock) |
| **Test data** | 1 block rendered, scan lại 2 lần |

**Steps:**
| # | Action | Expected result |
|---|---|---|
| 1 | `attachZoom` đặt attribute `ZOOM_ATTR` trên button | attribute có thể dùng làm guard khi scan lại |
| 2 | `renderMermaidBlock` chạy lại trên block đã render (HANDLED_ATTR gate) | đúng 1 `[data-mermaid-zoom]` trong DOM |

**Overall expected result:** Không chèn zoom button thứ hai khi block đã được xử lý.
**Actual result:** Pass — `zoom.test.ts` (ZOOM_ATTR marker) + `render.test.ts` (exactly-one zoom button after redundant scan).
**Status:** Pass

---

### TC-MAIN-US-006-03: Click zoom tạo overlay full-viewport với SVG clone
| Field | Value |
|---|---|
| **Requirement / AC** | AC-3 |
| **Priority** | High |
| **Type** | Functional / Security |
| **Preconditions** | jsdom; block rendered với SVG |
| **Test data** | SVG `200×150` bên trong preview div |

**Steps:**
| # | Action | Expected result |
|---|---|---|
| 1 | Trước khi click | không có `[data-mermaid-zoom-overlay]` trong DOM |
| 2 | `btn.click()` | `[data-mermaid-zoom-overlay]` xuất hiện trong `document.body` |
| 3 | Kiểm tra `position` style | `overlay.style.position === 'fixed'` |
| 4 | Kiểm tra `z-index` | `Number(overlay.style.zIndex) > 999` |
| 5 | SVG clone trong overlay stage | `stage.querySelector('svg')` không null |
| 6 | SVG gốc vẫn trong preview | `preview.contains(originalSvg) === true` |
| 7 | Clone là node khác | `clonedSvg !== originalSvg` |
| 8 | Overlay có đủ nút điều khiển | `[data-zoom-in]`, `[data-zoom-out]`, `[data-zoom-close]` đều tồn tại |

**Overall expected result:** Overlay full-viewport tạo đúng với CSS `fixed`, z-index cao, SVG clone, không di chuyển SVG gốc. Chỉ dùng `cloneNode` — không innerHTML untrusted.
**Actual result:** Pass — `zoom.test.ts` (6 assertions AC-3 block).
**Status:** Pass

---

### TC-MAIN-US-006-04: Zoom in/out và pan (drag) thay đổi CSS transform
| Field | Value |
|---|---|
| **Requirement / AC** | AC-4 |
| **Priority** | High |
| **Type** | Functional |
| **Preconditions** | jsdom (logic/transform); Chrome thật (UX kéo chuột thực) |
| **Test data** | overlay mở, stage với SVG clone |

**Steps:**
| # | Action | Expected result |
|---|---|---|
| 1 | Click `[data-zoom-in]` | `scale` trong transform tăng |
| 2 | Click `[data-zoom-out]` | `scale` trong transform giảm |
| 3 | Dispatch `WheelEvent` `deltaY=-100` | scale tăng, `event.defaultPrevented === true` |
| 4 | Dispatch `WheelEvent` `deltaY=+100` | scale giảm xuống dưới 1 |
| 5 | `mousedown(50,50)` → `mousemove(80,70)` trên stage | translate trong transform thay đổi thành `(30px, 20px)` |
| 6 | `mouseup` kết thúc drag | `stage.style.cursor === 'grab'`; `mousemove`/`mouseup` bị remove khỏi document |
| 7 | (manual) Chrome thật — kéo SVG bên trong overlay | SVG di chuyển theo con trỏ mượt mà |

**Overall expected result:** Zoom bằng button và wheel đúng; pan bằng drag đúng theo jsdom; cleanup listener drag hoạt động; trải nghiệm kéo thực tế cần Chrome.
**Actual result:** Bước 1–6 Pass (`zoom.test.ts`, 7 assertions AC-4 block). Bước 7: _Pending manual._
**Status:** Pass (logic) · Blocked (drag UX thật, manual)

---

### TC-MAIN-US-006-05: Đóng overlay qua Esc
| Field | Value |
|---|---|
| **Requirement / AC** | AC-5 |
| **Priority** | High |
| **Type** | Functional |
| **Preconditions** | jsdom; overlay đang mở |
| **Test data** | KeyboardEvent `key='Escape'` |

**Steps:**
| # | Action | Expected result |
|---|---|---|
| 1 | Dispatch `keydown` `Escape` trên document | overlay bị gỡ khỏi DOM |
| 2 | Kiểm tra focus | `document.activeElement === zoomButton` |
| 3 | Kiểm tra listener cleanup | mọi listener type được add đều có matching remove (không rò rỉ) |

**Overall expected result:** Esc đóng overlay, trả focus, xóa listener document.
**Actual result:** Pass — `zoom.test.ts` (Esc close + focus + listener cleanup assertions).
**Status:** Pass

---

### TC-MAIN-US-006-06: Đóng overlay qua backdrop click và nút X
| Field | Value |
|---|---|
| **Requirement / AC** | AC-5 |
| **Priority** | High |
| **Type** | Functional |
| **Preconditions** | jsdom; overlay đang mở |
| **Test data** | MouseEvent trên overlay element; click `[data-zoom-close]` |

**Steps:**
| # | Action | Expected result |
|---|---|---|
| 1 | Click trực tiếp lên overlay element (backdrop) | overlay bị gỡ khỏi DOM |
| 2 | Click `[data-zoom-close]` (nút X) | overlay bị gỡ |
| 3 | X close — kiểm tra focus | `document.activeElement === zoomButton` |
| 4 | Đóng overlay khi đang drag giữa chừng | `mousemove`/`mouseup` document listeners bị remove |

**Overall expected result:** Ba đường đóng (Esc/backdrop/X) đều gỡ overlay; focus về zoom button; listener drag mid-close được dọn.
**Actual result:** Pass — `zoom.test.ts` (backdrop, X close, X focus, mid-drag close assertions).
**Status:** Pass

---

### TC-MAIN-US-006-07: resetPreviews gỡ zoom button và đóng overlay an toàn
| Field | Value |
|---|---|
| **Requirement / AC** | AC-6 |
| **Priority** | High |
| **Type** | Functional / Lifecycle |
| **Preconditions** | jsdom; block đã render kèm zoom button; Chrome thật (live theme switch) |
| **Test data** | resetPreviews với overlay mở; resetPreviews không có overlay |

**Steps:**
| # | Action | Expected result |
|---|---|---|
| 1 | `closeActiveOverlay()` khi không có overlay mở | không ném lỗi |
| 2 | `closeActiveOverlay()` khi overlay đang mở | overlay bị gỡ |
| 3 | Mở overlay 2 từ block 2 khi overlay 1 đang mở | overlay 1 tự đóng; chỉ đúng 1 overlay trong DOM |
| 4 | `closeActiveOverlay()` gọi lần 2 (idempotent) | không ném lỗi |
| 5 | `resetPreviews` khi overlay đang mở | overlay đóng, không ném; `[data-mermaid-zoom]` bị gỡ cùng preview + toggle |
| 6 | `resetPreviews` không có overlay mở | không ném lỗi |
| 7 | (manual) Chrome thật — đổi theme Chat | sơ đồ reset, zoom button biến mất, overlay (nếu mở) đóng |

**Overall expected result:** Overlay singleton, cleanup an toàn qua closeActiveOverlay và resetPreviews; zoom button không mồ côi sau reset; trải nghiệm live cần Chrome.
**Actual result:** Bước 1–6 Pass (`zoom.test.ts` AC-6 block, 4 assertions + `render.test.ts` resetPreviews zoom assertions). Bước 7: _Pending manual._
**Status:** Pass (logic) · Blocked (live theme switch, manual)

---

## Test Summary
- **Total:** 7 cases — **Pass: 5** (TC-01/02/03/05/06 đầy đủ tự động), **Pass-logic+Blocked-runtime: 2** (TC-04 drag UX thật, TC-07 live theme switch — logic Pass, phần Chrome thật pending manual).
- **Automated suite:** toàn dự án **108/108 pass** (11 test files); `zoom.test.ts` 28 tests, `render.test.ts` zoom assertions 5 tests; coverage **99.06% stmt / 89.47% branch / 100% func / 99.34% lines** (≥80 threshold).
- **zoom.ts branch coverage note:** V8 báo 60% do null-guards (`?.()`, `if (onMouseMove)`) partially exercised by design — mọi AC branch thực tế đều covered; overall branch 89.47% >> 80% threshold.
- **Open defects:** critical 0, major 0, minor 0.
- **Note:** Drag UX thật và live theme switch cần verify thủ công trong Chrome để đóng TC-04 (bước 7) và TC-07 (bước 7).
