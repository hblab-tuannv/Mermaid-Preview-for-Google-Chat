---
us: "MAIN-US-003"
suite: "Render mã Mermaid thành SVG inline với fallback an toàn"
version: "1.0"
author: "qa-engineer"
---

# Test Case Specification

> Logic chèn/fallback/idempotent/id được test bằng jsdom + mock renderer (`render.test.ts`, `index.test.ts`). Render SVG thực tế của Mermaid và phòng vệ XSS chỉ kiểm chứng đầy đủ trong trình duyệt thật (manual) — xem TC-01, TC-05.

## Test Cases

### TC-MAIN-US-003-01: Render block hợp lệ thành SVG chèn inline
| Field | Value |
|---|---|
| **Requirement / AC** | AC-1 |
| **Priority** | High |
| **Type** | Functional |
| **Preconditions** | jsdom + mock renderer (logic); Chrome thật (render thực) |
| **Test data** | `graph TD\nA-->B` |

**Steps:**
| # | Action | Expected result |
|---|---|---|
| 1 | `renderMermaidBlock` với mock renderer | outcome `'rendered'`; container `data-mermaid-preview="rendered"` chèn ngay sau block; có `<svg>` |
| 2 | (manual) Load `dist/` unpacked, mở chat.google.com với một tin nhắn chứa ```mermaid graph | Sơ đồ SVG thật hiển thị inline cạnh code block |

**Overall expected result:** Block hợp lệ render ra SVG chèn inline.
**Actual result:** Bước 1 Pass (`render.test.ts` AC-1). Bước 2: _Pending manual run trong Chrome._
**Status:** Pass (logic) · Blocked (render thật, manual)

---

### TC-MAIN-US-003-02: Fallback an toàn khi cú pháp/sai output
| Field | Value |
|---|---|
| **Requirement / AC** | AC-2 |
| **Priority** | High |
| **Type** | Negative |
| **Preconditions** | jsdom |
| **Test data** | renderer reject (`Parse error`); renderer trả `<div>not an svg</div>` |

**Steps:**
| # | Action | Expected result |
|---|---|---|
| 1 | `renderMermaidBlock` với renderer reject | outcome `'error'`; không ném ra ngoài; block gốc còn nguyên; marker `data-mermaid-preview="error"`, không có SVG |
| 2 | renderer trả non-SVG | `parseSvg` null → throw nội bộ → bắt → `'error'` |

**Overall expected result:** Lỗi render không làm vỡ trang; fallback giữ mã gốc.
**Actual result:** Pass — `render.test.ts` (reject + non-SVG fallback).
**Status:** Pass

---

### TC-MAIN-US-003-03: Cấu hình Mermaid strict, không auto-start
| Field | Value |
|---|---|
| **Requirement / AC** | AC-3 |
| **Priority** | High |
| **Type** | Security / Config |
| **Preconditions** | jsdom + `vi.mock('mermaid')` |
| **Test data** | `MERMAID_INIT_CONFIG` |

**Steps:**
| # | Action | Expected result |
|---|---|---|
| 1 | Kiểm tra `MERMAID_INIT_CONFIG` | `securityLevel === 'strict'`, `startOnLoad === false` |
| 2 | Default renderer gọi `mermaid.initialize` | Được gọi với `MERMAID_INIT_CONFIG`, đúng 1 lần (cache) |

**Overall expected result:** Mermaid khởi tạo ở chế độ strict, extension tự kiểm soát render.
**Actual result:** Pass — `render.test.ts` (AC-3 config + default renderer init-once).
**Status:** Pass

---

### TC-MAIN-US-003-04: Idempotent — không render trùng
| Field | Value |
|---|---|
| **Requirement / AC** | AC-4 |
| **Priority** | High |
| **Type** | Functional |
| **Preconditions** | jsdom + mock renderer |
| **Test data** | `graph TD\nA-->B` |

**Steps:**
| # | Action | Expected result |
|---|---|---|
| 1 | `renderMermaidBlock` lần 1 | `'rendered'`, 1 SVG |
| 2 | `renderMermaidBlock` lần 2 cùng block | `'skipped'`, vẫn chỉ 1 SVG; renderer chỉ được gọi 1 lần |

**Overall expected result:** Gọi lại không sinh SVG thứ hai.
**Actual result:** Pass — `render.test.ts` (idempotent via marker).
**Status:** Pass

---

### TC-MAIN-US-003-05: Chèn SVG an toàn, không thực thi script
| Field | Value |
|---|---|
| **Requirement / AC** | AC-5 |
| **Priority** | High |
| **Type** | Security |
| **Preconditions** | jsdom (proxy); Chrome thật (kiểm chứng XSS thực) |
| **Test data** | SVG chứa `<script>globalThis.__pwned=true</script>` |

**Steps:**
| # | Action | Expected result |
|---|---|---|
| 1 | `renderMermaidBlock` với SVG có script | SVG chèn là **node parsed** (`firstElementChild` là `<svg>`), không qua `innerHTML`; `__pwned` undefined |
| 2 | (manual) Trong Chrome thật, sơ đồ từ nguồn không tin cậy | Không có script/event-handler nào chạy (phòng vệ thật là DOMParser + mermaid `strict`) |

**Overall expected result:** Chèn SVG không mở bề mặt XSS.
**Actual result:** Bước 1 Pass (proxy cấu trúc — `render.test.ts` AC-5). _Lưu ý:_ jsdom không thực thi script ở cả hai chiều, nên đây là proxy yếu; XSS thực kiểm chứng manual ở Chrome. Bước 2: _Pending manual run._
**Status:** Pass (proxy) · Blocked (XSS thật, manual)

---

### TC-MAIN-US-003-06: Mỗi sơ đồ có id duy nhất
| Field | Value |
|---|---|
| **Requirement / AC** | AC-6 |
| **Priority** | Med |
| **Type** | Functional / Boundary |
| **Preconditions** | jsdom + mock renderer |
| **Test data** | 2 block: `graph TD`, `pie title Pets` |

**Steps:**
| # | Action | Expected result |
|---|---|---|
| 1 | Render 2 block khác nhau | 2 id render khác nhau (`mermaid-preview-<n>`); 2 SVG có `id` duy nhất, không trùng |

**Overall expected result:** Không xung đột id giữa các sơ đồ.
**Actual result:** Pass — `render.test.ts` (unique ids).
**Status:** Pass

---

## Test Summary
- **Total:** 6 cases — **Pass: 4** (TC-02/03/04/06 đầy đủ tự động), **Pass-logic+Blocked-runtime: 2** (TC-01 render SVG thật, TC-05 XSS thật — proxy tự động Pass, phần trình duyệt thật pending manual).
- **Automated suite:** `render.test.ts` + `index.test.ts` 12 test pass; toàn dự án 34/34 pass, coverage 100% stmt/line (branches 96.77% ≥80). typecheck/lint/format:check/build exit 0.
- **Open defects:** critical 0, major 0, minor 0.
- **Note (theo review):** Phòng vệ XSS thực dựa vào DOMParser-insert + mermaid `securityLevel:'strict'`; test jsdom chỉ là proxy cấu trúc. Cần một lần verify thủ công trong Chrome thật (load `dist/`, render sơ đồ) để đóng TC-01 + TC-05. Blocked = chưa chạy, không phải fail.
