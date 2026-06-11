---
us: "MAIN-US-005"
suite: "Tự động theme sáng/tối theo giao diện Google Chat"
version: "1.0"
author: "qa-engineer"
---

# Test Case Specification

Logic phát hiện theme (luminance), truyền theme vào renderer, reset+rescan và observer đổi theme được test bằng jsdom (`theme.test.ts`, `render.test.ts`, `index.test.ts`). Trải nghiệm sáng/tối thật trong Google Chat (đổi theme giữa phiên) kiểm chứng thủ công — xem TC-01, TC-04.

## Test Cases

### TC-MAIN-US-005-01: Phát hiện theme theo luminance nền
| Field | Value |
|---|---|
| **Requirement / AC** | AC-1, AC-2 |
| **Priority** | High |
| **Type** | Functional |
| **Preconditions** | jsdom (logic); Chrome thật (UI) |
| **Test data** | nền `rgb(20,20,20)` (tối), `rgb(255,255,255)` (sáng), trong suốt, không nền |

**Steps:**
| # | Action | Expected result |
|---|---|---|
| 1 | `detectTheme` trên block có ancestor nền tối | `'dark'` |
| 2 | ancestor nền sáng | `'default'` |
| 3 | ancestor trong suốt → đi tiếp lên ancestor đục | trả theme theo ancestor đục đầu tiên |
| 4 | không ancestor nào có nền đục | `'default'` (fallback, không ném) |
| 5 | (manual) Chrome dark mode | sơ đồ render theme tối, không chói |

**Overall expected result:** Theme khớp luminance nền thật, không bám class.
**Actual result:** Bước 1–4 Pass (`theme.test.ts`). Bước 5: _Pending manual._
**Status:** Pass (logic) · Blocked (UI thật, manual)

---

### TC-MAIN-US-005-02: Truyền theme tới renderer (qua host config)
| Field | Value |
|---|---|
| **Requirement / AC** | AC-1, AC-3 |
| **Priority** | High |
| **Type** | Functional / Security |
| **Preconditions** | jsdom + mock renderer |
| **Test data** | block trên nền tối; opts.theme override |

**Steps:**
| # | Action | Expected result |
|---|---|---|
| 1 | render block trên nền tối | renderer nhận `theme='dark'` |
| 2 | `opts.theme='dark'` ghi đè | renderer nhận `'dark'` |
| 3 | default renderer | `mermaid.initialize({...config, theme})`, `securityLevel='strict'` giữ nguyên; init lại chỉ khi theme đổi |

**Overall expected result:** Theme set qua initialize (không directive), strict giữ nguyên.
**Actual result:** Pass — `render.test.ts` (theme detected + override + init-once-per-theme).
**Status:** Pass

---

### TC-MAIN-US-005-03: resetPreviews dọn sạch để render lại
| Field | Value |
|---|---|
| **Requirement / AC** | AC-5 |
| **Priority** | High |
| **Type** | Functional |
| **Preconditions** | jsdom + mock renderer |
| **Test data** | 1 block render thành công; 1 block lỗi |

**Steps:**
| # | Action | Expected result |
|---|---|---|
| 1 | render xong rồi `resetPreviews` | gỡ container preview + nút toggle; xóa marker `data-mermaid-rendered`/`data-mermaid-preview`; source bỏ ẩn |
| 2 | render lại block đã reset | outcome `'rendered'` (không `'skipped'`); vẫn đúng 1 container |
| 3 | block lỗi rồi reset | marker `error` bị gỡ; marker trên source bị xóa |

**Overall expected result:** Reset đưa block về trạng thái sạch cho lần render mới.
**Actual result:** Pass — `render.test.ts` (resetPreviews rendered/error + re-render path).
**Status:** Pass

---

### TC-MAIN-US-005-04: Re-render toàn bộ khi đổi theme
| Field | Value |
|---|---|
| **Requirement / AC** | AC-4 |
| **Priority** | High |
| **Type** | Functional |
| **Preconditions** | jsdom + fake observer + scheduler (logic); Chrome thật (live) |
| **Test data** | nền body sáng→tối |

**Steps:**
| # | Action | Expected result |
|---|---|---|
| 1 | init + render 1 block (nền sáng) | renderer nhận `'default'`; 1 container rendered |
| 2 | đổi nền body sang tối + emit observer | reset + rescan → renderer nhận `'dark'`; vẫn đúng 1 container |
| 3 | mutation mà theme KHÔNG đổi | không gọi onChange (không re-render thừa) |
| 4 | (manual) đổi theme Chat giữa phiên | mọi sơ đồ tự render lại theo theme mới |

**Overall expected result:** Đổi theme Chat → toàn bộ sơ đồ re-render theme mới; theme không đổi thì không làm gì.
**Actual result:** Bước 1–3 Pass (`index.test.ts` + `theme.test.ts`). Bước 4: _Pending manual._
**Status:** Pass (logic) · Blocked (live, manual)

---

### TC-MAIN-US-005-05: Observer đổi theme — phạm vi & cleanup
| Field | Value |
|---|---|
| **Requirement / AC** | AC-6 |
| **Priority** | Med |
| **Type** | Functional / Lifecycle |
| **Preconditions** | jsdom + fake observer |
| **Test data** | mutation attribute trên html/body |

**Steps:**
| # | Action | Expected result |
|---|---|---|
| 1 | `observeThemeChange` thiết lập | quan sát `attributes` trên CẢ `<html>` và `<body>` (2 lần observe) |
| 2 | burst nhiều mutation | gộp về 1 lần kiểm tra theme (debounce) |
| 3 | gọi disconnect trả về | observer `disconnect()` được gọi |

**Overall expected result:** Observer đúng phạm vi, debounced, tháo gỡ được.
**Actual result:** Pass — `theme.test.ts` (observe html+body, coalesce, disconnect).
**Status:** Pass

---

## Test Summary
- **Total:** 5 cases — **Pass: 3** (TC-02/03/05 đầy đủ tự động), **Pass-logic+Blocked-runtime: 2** (TC-01 dark mode thật, TC-04 đổi theme live — logic Pass, phần Chrome thật pending manual).
- **Automated suite:** toàn dự án **75/75 pass**, coverage **98.97% stmt / 95.69% branch** (≥80). typecheck/lint/format:check/build exit 0; `content.js` verified ASCII-clean.
- **Open defects:** critical 0, major 0, minor 0.
- **Known follow-up (review nit, non-blocking):** khi đổi theme, lần render lại chèn node làm observer US-004 fire một scan no-op (marker short-circuit) — vô hại, ghi nhận trong REVIEW-MAIN-US-005.
- **Note:** Sáng/tối thật và đổi theme giữa phiên cần verify thủ công trong Chrome (dark mode) để đóng TC-01 + TC-04.
