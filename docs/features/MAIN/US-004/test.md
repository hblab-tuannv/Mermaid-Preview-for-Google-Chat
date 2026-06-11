---
us: "MAIN-US-004"
suite: "Toggle preview/source + xử lý tin nhắn tải động"
version: "1.0"
author: "qa-engineer"
---

# Test Case Specification

Logic toggle và observer được test bằng jsdom + fake `MutationObserver`/scheduler (`toggle.test.ts`, `observe.test.ts`, `index.test.ts`). Hành vi click thật và render trong phiên Google Chat sống chỉ kiểm chứng đầy đủ trong trình duyệt thật (manual) — xem TC-01, TC-04.

## Test Cases

### TC-MAIN-US-004-01: Toggle gắn vào, mặc định hiện preview (ẩn code)
| Field | Value |
|---|---|
| **Requirement / AC** | AC-1 |
| **Priority** | High |
| **Type** | Functional |
| **Preconditions** | jsdom + mock renderer (logic); Chrome thật (UI thật) |
| **Test data** | `graph TD\nA-->B` |

**Steps:**
| # | Action | Expected result |
|---|---|---|
| 1 | `renderMermaidBlock` thành công | nút `data-mermaid-toggle` tồn tại; source `<pre>` `hidden=true`; container preview hiển thị |
| 2 | `attachToggle(source, preview)` trực tiếp | nút `data-state="preview"`, đặt sau container, source ẩn / preview hiện |
| 3 | (manual) Load `dist/` unpacked, mở chat.google.com với tin nhắn ```mermaid | Sơ đồ hiển thị mặc định, có nút toggle; code gốc ẩn |

**Overall expected result:** Mỗi block render xong có nút toggle, mặc định xem sơ đồ.
**Actual result:** Bước 1–2 Pass (`render.test.ts` US-004 AC-1; `toggle.test.ts`). Bước 3: _Pending manual run trong Chrome._
**Status:** Pass (logic) · Blocked (UI thật, manual)

---

### TC-MAIN-US-004-02: Toggle lật preview ↔ source, không render lại
| Field | Value |
|---|---|
| **Requirement / AC** | AC-2 |
| **Priority** | High |
| **Type** | Functional |
| **Preconditions** | jsdom |
| **Test data** | block đã render (source `<pre>` + container có `<svg>`) |

**Steps:**
| # | Action | Expected result |
|---|---|---|
| 1 | Click nút lần 1 | `data-state="source"`; source hiện, preview ẩn; `preview.firstElementChild` vẫn là **đúng node `<svg>` cũ** (không render lại) |
| 2 | Click nút lần 2 | `data-state="preview"`; source ẩn, preview hiện; vẫn đúng node `<svg>` cũ |
| 3 | Kiểm tra nhãn nút | nhãn ở 2 trạng thái khác nhau, đều không rỗng |

**Overall expected result:** Toggle chỉ đổi hiển thị, giữ nguyên SVG đã render.
**Actual result:** Pass — `toggle.test.ts` (flip + cùng node identity + nhãn).
**Status:** Pass

---

### TC-MAIN-US-004-03: Block render lỗi → không gắn toggle, code vẫn hiện
| Field | Value |
|---|---|
| **Requirement / AC** | AC-3 |
| **Priority** | High |
| **Type** | Negative |
| **Preconditions** | jsdom + renderer reject |
| **Test data** | renderer reject (`Parse error`) |

**Steps:**
| # | Action | Expected result |
|---|---|---|
| 1 | `renderMermaidBlock` với renderer reject | outcome `'error'`; KHÔNG có `data-mermaid-toggle`; source `<pre>` `hidden=false` (vẫn hiện) |

**Overall expected result:** Đường lỗi không gắn toggle, mã gốc luôn hiển thị, không vỡ.
**Actual result:** Pass — `render.test.ts` (US-004 AC-3).
**Status:** Pass

---

### TC-MAIN-US-004-04: Observer tự render block trong tin nhắn tải động
| Field | Value |
|---|---|
| **Requirement / AC** | AC-4 |
| **Priority** | High |
| **Type** | Functional |
| **Preconditions** | jsdom + fake `MutationObserver` + scheduler đồng bộ (logic); Chrome thật (live) |
| **Test data** | block `graph TD\nA-->B` thêm sau khi init |

**Steps:**
| # | Action | Expected result |
|---|---|---|
| 1 | `observeChildList` quan sát target | `observe` gọi với `{ childList:true, subtree:true }` |
| 2 | Một burst nhiều addition trước khi scheduler chạy | `onBatch` gộp về **đúng 1 lần** mỗi tick; burst sau lại lên lịch lần mới |
| 3 | `initContentScript` + thêm block Mermaid + emit mutation | xuất hiện 1 container `data-mermaid-preview="rendered"` (render tự động) |
| 4 | (manual) Trong Chrome, cuộn lịch sử / nhận tin mới có ```mermaid | Block mới được render tự động, không cần tải lại trang |

**Overall expected result:** Tin nhắn Mermaid tải động được render tự động.
**Actual result:** Bước 1–3 Pass (`observe.test.ts`; `index.test.ts` AC-4). Bước 4: _Pending manual run trong Chrome._
**Status:** Pass (logic) · Blocked (live, manual)

---

### TC-MAIN-US-004-05: Idempotent — không render/toggle trùng khi quét lại
| Field | Value |
|---|---|
| **Requirement / AC** | AC-5 |
| **Priority** | High |
| **Type** | Functional |
| **Preconditions** | jsdom + fake observer + scheduler |
| **Test data** | 1 block Mermaid, 2 burst mutation |

**Steps:**
| # | Action | Expected result |
|---|---|---|
| 1 | Burst 1 → quét + render | 1 container rendered, 1 nút toggle |
| 2 | Burst 2 (quét lại toàn subtree) | vẫn **đúng 1** container rendered và **đúng 1** nút toggle (marker short-circuit) |
| 3 | Gọi `renderMermaidBlock` lần 2 cùng block (đơn vị) | outcome `'skipped'` (đã có ở `render.test.ts`) |

**Overall expected result:** Quét lặp không sinh SVG/toggle thứ hai.
**Actual result:** Pass — `index.test.ts` (AC-5 không double render/toggle).
**Status:** Pass

---

### TC-MAIN-US-004-06: Mutation rỗng không sinh gì; observer tháo gỡ được
| Field | Value |
|---|---|
| **Requirement / AC** | AC-6 |
| **Priority** | Med |
| **Type** | Functional / Lifecycle |
| **Preconditions** | jsdom + fake observer |
| **Test data** | block không phải Mermaid (`function foo(){}`); mutation không addition |

**Steps:**
| # | Action | Expected result |
|---|---|---|
| 1 | Mutation thêm node không phải Mermaid | KHÔNG có container rendered / toggle nào |
| 2 | Mutation không addedNodes | `onBatch` không chạy (không quét thừa) |
| 3 | Gọi hàm disconnect trả về | observer `disconnect()` được gọi; init khi không có `document` → disconnect no-op không ném |

**Overall expected result:** Không có sơ đồ thì không tạo gì; observer dừng được, không rò rỉ listener.
**Actual result:** Pass — `observe.test.ts` (ignore no-addition, disconnect) + `index.test.ts` (no-Mermaid, no-op disconnect).
**Status:** Pass

---

## Test Summary
- **Total:** 6 cases — **Pass: 4** (TC-02/03/05/06 đầy đủ tự động), **Pass-logic+Blocked-runtime: 2** (TC-01 UI toggle thật, TC-04 render live trong Chat — phần logic tự động Pass, phần trình duyệt thật pending manual).
- **Automated suite:** toàn dự án **50/50 pass**, coverage **100% stmt/func/line, 97.87% branches** (≥80). `typecheck`/`lint`/`format:check`/`build` exit 0.
- **Open defects:** critical 0, major 0, minor 0.
- **Note:** Toggle thao tác `hidden` và observer dùng `MutationObserver` — jsdom mô phỏng đủ cho logic; trải nghiệm click thật và render trong phiên Chat sống cần một lần verify thủ công (load `dist/`) để đóng TC-01 + TC-04. Blocked = chưa chạy manual, không phải fail.
