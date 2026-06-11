---
us: "MAIN-US-002"
suite: "Phát hiện code block Mermaid trong tin nhắn Google Chat"
version: "1.0"
author: "qa-engineer"
---

# Test Case Specification

> Toàn bộ logic phát hiện là thuần (DOM giả lập bằng jsdom), không phụ thuộc trình duyệt thật — mọi case đều chạy tự động bằng `npx vitest run src/lib/detect.test.ts` (15 test, pass).

## Test Cases

### TC-MAIN-US-002-01: Nhận diện block Mermaid và trích source nguyên văn
| Field | Value |
|---|---|
| **Requirement / AC** | AC-1 |
| **Priority** | High |
| **Type** | Functional |
| **Preconditions** | jsdom DOM dựng `<pre><code>` |
| **Test data** | `graph TD\nA-->B`; `sequenceDiagram...`; `FlowChart LR` (case-insensitive); token đầu bọc trong `<span>` highlight |

**Steps:**
| # | Action | Expected result |
|---|---|---|
| 1 | `detectMermaidBlocks` trên block bắt đầu bằng từ khoá Mermaid | Trả về 1 block, `source` đúng nguyên văn, không kèm thẻ HTML |
| 2 | `isMermaid` với từ khoá viết hoa/thường khác nhau, và mọi từ khoá trong `MERMAID_KEYWORDS` | true |

**Overall expected result:** Block Mermaid được nhận diện; source là text thuần.
**Actual result:** Pass — `detect.test.ts` (isMermaid AC-1, case-insensitive, every-keyword, verbatim source, highlight-markup strip).
**Status:** Pass

---

### TC-MAIN-US-002-02: Không nhận nhầm code ngôn ngữ khác (no false positive)
| Field | Value |
|---|---|
| **Requirement / AC** | AC-2 |
| **Priority** | High |
| **Type** | Negative |
| **Preconditions** | jsdom |
| **Test data** | `function foo(){}`; `{"a":1}`; prose; `const graph = makeGraph()` |

**Steps:**
| # | Action | Expected result |
|---|---|---|
| 1 | `isMermaid` / `detectMermaidBlocks` trên block không phải Mermaid | false / [] |
| 2 | Từ khoá chỉ xuất hiện giữa văn bản (`const graph = ...`) | Không nhận diện |

**Overall expected result:** Không có false positive.
**Actual result:** Pass — `detect.test.ts` (rejects non-Mermaid; keyword mid-text).
**Status:** Pass

---

### TC-MAIN-US-002-03: Lọc đúng block Mermaid giữa nhiều block, đúng thứ tự
| Field | Value |
|---|---|
| **Requirement / AC** | AC-3 |
| **Priority** | High |
| **Type** | Functional |
| **Preconditions** | jsdom, 4 block xen kẽ Mermaid/không |
| **Test data** | `function a(){}`, `graph TD`, `{"x":1}`, `pie title Pets` |

**Steps:**
| # | Action | Expected result |
|---|---|---|
| 1 | `detectMermaidBlocks` trên vùng có nhiều block | Trả về đúng 2 block Mermaid, source theo thứ tự xuất hiện |

**Overall expected result:** Chỉ block Mermaid được trả về, đúng thứ tự.
**Actual result:** Pass — `detect.test.ts` (only Mermaid among many, in order).
**Status:** Pass

---

### TC-MAIN-US-002-04: Block rỗng/whitespace không nhận diện, không ném lỗi
| Field | Value |
|---|---|
| **Requirement / AC** | AC-4 |
| **Priority** | High |
| **Type** | Negative / Boundary |
| **Preconditions** | jsdom |
| **Test data** | `''`; `'   \n\t  '` |

**Steps:**
| # | Action | Expected result |
|---|---|---|
| 1 | `isMermaid('')`, `isMermaid('   \n\t ')` | false, không throw |
| 2 | `detectMermaidBlocks` trên block rỗng/whitespace | [] |

**Overall expected result:** Không nhận diện, không lỗi.
**Actual result:** Pass — `detect.test.ts` (empty/whitespace, no crash).
**Status:** Pass

---

### TC-MAIN-US-002-05: Khoan dung khoảng trắng/dòng trống đầu khối, giữ nguyên source
| Field | Value |
|---|---|
| **Requirement / AC** | AC-5 |
| **Priority** | Med |
| **Type** | Boundary |
| **Preconditions** | jsdom |
| **Test data** | `\n\n   sequenceDiagram\nAlice->>Bob: hi` |

**Steps:**
| # | Action | Expected result |
|---|---|---|
| 1 | `isMermaid` với dòng trống đầu | true (trim trước khi khớp) |
| 2 | `detectMermaidBlocks` | Trả về block, `source` giữ nguyên cả dòng trống đầu |

**Overall expected result:** Nhận diện đúng; source không bị trim.
**Actual result:** Pass — `detect.test.ts` (leading-whitespace tolerant; source preserved).
**Status:** Pass

---

### TC-MAIN-US-002-06: Idempotent — block đã đánh dấu không trả về lại
| Field | Value |
|---|---|
| **Requirement / AC** | AC-6 |
| **Priority** | High |
| **Type** | Functional |
| **Preconditions** | jsdom |
| **Test data** | `graph TD\nA-->B` |

**Steps:**
| # | Action | Expected result |
|---|---|---|
| 1 | `detectMermaidBlocks(root)` lần 1 | Trả về 1 block; element được gắn `data-mermaid-preview` |
| 2 | `detectMermaidBlocks(root)` lần 2 trên cùng root | [] (không trả lại) |

**Overall expected result:** Quét lại không sinh trùng lặp.
**Actual result:** Pass — `detect.test.ts` (idempotent via data attr).
**Status:** Pass

---

## Test Summary
- **Total:** 6 cases — **Pass: 6**, Fail: 0, Blocked: 0 (toàn bộ tự động hoá, không cần trình duyệt thật).
- **Automated suite:** `detect.test.ts` 15 test pass; toàn dự án 24/24 pass, coverage 100% stmt/line (branches 90.9% ≥80). typecheck/lint/format:check/build exit 0.
- **Open defects:** critical 0, major 0, minor 0.
