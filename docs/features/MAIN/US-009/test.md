---
us: "MAIN-US-009"
suite: "Mở rộng độ phủ loại sơ đồ Mermaid (tin fence + mở rộng keyword)"
version: "1.0"
author: "qa-engineer"
---

# Test Case Specification

> Toàn bộ logic detect là thuần (jsdom), chạy tự động bằng `npx vitest run src/lib/detect.test.ts` (29 test, pass). Full suite: `npx vitest run --coverage` → 188 pass, `detect.ts` 100% stmt / 95.45% branch, tổng ≥80% branch. Hành vi render thực trong Google Chat (fence + body rác → marker "could not render") xác minh thủ công ở smoke test.

## Test Cases

### TC-MAIN-US-009-01: Tin fence — loại ngoài allowlist vẫn được detect (future-proof)
| Field | Value |
|---|---|
| **Requirement / AC** | AC-1 |
| **Priority** | High |
| **Type** | Functional |
| **Preconditions** | jsdom; block kiểu Chat-sent (`<br>` + nhãn `mermaid` dòng đầu) |
| **Test data** | `mermaid` ⏎ `xychart-beta` ⏎ `  title "Sales"` (xychart-beta KHÔNG nằm trong keyword cũ) |

**Steps:**
| # | Action | Expected result |
|---|---|---|
| 1 | `detectMermaidBlocks` trên block có nhãn `mermaid` + thân `xychart-beta...` | Trả về 1 block (bỏ qua cổng keyword) |
| 2 | Kiểm tra `source` | `xychart-beta\n  title "Sales"` (đã bỏ dòng nhãn `mermaid`) |

**Overall expected result:** Block fence được detect bất kể loại; tự phủ loại mới/tương lai.
**Actual result:** Pass — `detect.test.ts` ("detects a fenced diagram whose type is NOT in the keyword allowlist").
**Status:** Pass

---

### TC-MAIN-US-009-02: Mở rộng allowlist — loại mới được detect khi KHÔNG có fence
| Field | Value |
|---|---|
| **Requirement / AC** | AC-2 |
| **Priority** | High |
| **Type** | Functional |
| **Preconditions** | jsdom; block dán thô (không nhãn `mermaid`) |
| **Test data** | `xychart-beta`, `sankey-beta`, `block-beta`, `requirementDiagram`, `C4Context`, `architecture-beta`, `treemap`; tên `radar-beta` đúng theo detector mermaid 11.15.0. **Loại trừ `zenuml`** khỏi allowlist unfenced. |

**Steps:**
| # | Action | Expected result |
|---|---|---|
| 1 | `isMermaid` với từng loại mới bổ sung | true |
| 2 | `detectMermaidBlocks(codeBlock('xychart-beta\n  title "Sales"'))` | 1 block, source nguyên văn |
| 3 | Mọi từ khoá cũ (`MERMAID_KEYWORDS` loop) | true (không hồi quy) |
| 4 | `detectMermaidBlocks(codeBlock('zenuml\nA.method()'))` (unfenced) | `[]` — zenuml KHÔNG vào allowlist (external diagram, render lỗi) |
| 5 | Block `zenuml` có fence ```mermaid | 1 block (fence-trust → AC-4 fallback) |

> Mỗi loại bổ sung đã được verify render được bằng `mermaid.detectType` (post-`initialize`, mermaid 11.15.0); chỉ `zenuml` ném lỗi → loại khỏi unfenced allowlist để tránh biến code block sạch thành error marker (regression).

**Overall expected result:** Loại core mới detect được cả khi không fence; zenuml chỉ qua fence; loại cũ không vỡ.
**Actual result:** Pass — `detect.test.ts` ("accepts newly added diagram types when unfenced", "covers every declared keyword", "detects a newly added diagram type when unfenced", "does NOT detect an unfenced zenuml block", "still detects a fenced zenuml block").
**Status:** Pass

---

### TC-MAIN-US-009-03: Không false positive — block không fence + không keyword
| Field | Value |
|---|---|
| **Requirement / AC** | AC-3 |
| **Priority** | High |
| **Type** | Negative |
| **Preconditions** | jsdom; block KHÔNG có nhãn `mermaid` |
| **Test data** | `function foo(){}`; `{"a":1}`; prose |

**Steps:**
| # | Action | Expected result |
|---|---|---|
| 1 | `detectMermaidBlocks` trên code JS/JSON không nhãn | `[]` |

**Overall expected result:** Không bắt nhầm code ngôn ngữ khác khi không có fence.
**Actual result:** Pass — `detect.test.ts` ("still ignores an unfenced non-Mermaid block", "ignores non-Mermaid blocks").
**Status:** Pass

---

### TC-MAIN-US-009-04: Behavior change có chủ đích — fence + body không parse được
| Field | Value |
|---|---|
| **Requirement / AC** | AC-4 |
| **Priority** | Medium |
| **Type** | Functional (behavior change) |
| **Preconditions** | jsdom (detect); render fallback xác minh ở render.test + smoke thủ công |
| **Test data** | `mermaid` ⏎ `function foo(){}` |

**Steps:**
| # | Action | Expected result |
|---|---|---|
| 1 | `detectMermaidBlocks` trên block fence `mermaid` + body rác | Trả về 1 block (tin fence), source `function foo(){}` |
| 2 | Render (đã có error-fallback US-003) | Hiện marker "Mermaid: could not render diagram", code gốc vẫn hiển thị, không ném lỗi |

**Overall expected result:** Detect; render rơi vào fallback an toàn — đúng đánh đổi ADR-MAIN-009.
**Actual result:** Pass — `detect.test.ts` ("detects a fenced block even when its body is not valid Mermaid"); error-fallback đã phủ ở `render.test.ts`.
**Status:** Pass

---

### TC-MAIN-US-009-05: Không strip nhầm keyword thật bắt đầu bằng "m"
| Field | Value |
|---|---|
| **Requirement / AC** | AC-5 |
| **Priority** | Medium |
| **Type** | Negative / edge |
| **Preconditions** | jsdom |
| **Test data** | `mindmap` ⏎ `  root` (dòng đầu KHÔNG đúng chữ `mermaid`) |

**Steps:**
| # | Action | Expected result |
|---|---|---|
| 1 | `detectMermaidBlocks` trên block dòng đầu `mindmap` | 1 block; `source` = `mindmap\n  root` (KHÔNG bị strip) |
| 2 | Block chỉ có bare `mermaid` (không thân) | `[]` (không có gì để render) |

**Overall expected result:** Chỉ strip khi dòng đầu đúng `mermaid`; bare tag bị bỏ qua.
**Actual result:** Pass — `detect.test.ts` ("does not strip a first line that merely starts with 'm'", "ignores a code block that is only the bare 'mermaid' tag").
**Status:** Pass

---

### TC-MAIN-US-009-06: Idempotent + guard composer giữ nguyên (không hồi quy)
| Field | Value |
|---|---|
| **Requirement / AC** | AC-6 |
| **Priority** | High |
| **Type** | Functional (regression) |
| **Preconditions** | jsdom |
| **Test data** | block Mermaid đã đánh dấu; block trong `[contenteditable]` |

**Steps:**
| # | Action | Expected result |
|---|---|---|
| 1 | `detectMermaidBlocks` hai lần trên cùng block | Lần 2 trả `[]` (idempotent) |
| 2 | Block trong khung soạn `contenteditable` | Không detect |

**Overall expected result:** Idempotency + guard composer của US-002/INC-02 không bị thay đổi.
**Actual result:** Pass — `detect.test.ts` ("is idempotent", "does not detect ... in the composer").
**Status:** Pass

---

## Defect Summary
| Severity | Count |
|---|---|
| Critical | 0 |
| Major | 0 |
| Minor | 0 |

> Hai nit từ code review (radar thiếu `-beta`; JSDoc header cũ) đã được sửa ở Phase 4 trước khi merge, không tính là defect mở. 0 critical/major → đạt Gate 5.
