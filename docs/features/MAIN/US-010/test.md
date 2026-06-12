---
us: "MAIN-US-010"
suite: "Sửa preview lỗi với label <br> và sơ đồ C4 (parse SVG bằng text/html)"
version: "1.0"
author: "qa-engineer"
---

# Test Case Specification

> Logic render là thuần (jsdom), chạy tự động bằng `npx vitest run src/lib/render.test.ts` (24 test, pass). Full suite: `npx vitest run --coverage` → 189 pass, không hồi quy. Hành vi render thật trong Google Chat (label `<br/>` + sơ đồ C4Context hiện preview thay vì marker lỗi) xác minh thủ công ở smoke test.

## Test Cases

### TC-MAIN-US-010-01: SVG có foreignObject + `<br>` chưa đóng → render thành công
| Field | Value |
|---|---|
| **Requirement / AC** | AC-1 |
| **Priority** | High |
| **Type** | Functional |
| **Preconditions** | jsdom; renderer trả `<svg><foreignObject><div xmlns=".../xhtml">L1<br>L2</div></foreignObject><g></g></svg>` |
| **Steps** | Gọi `renderMermaidBlock(block, { renderer, doc })` |
| **Expected** | Outcome `'rendered'`; có `<svg>` chèn sau code block; `svg.namespaceURI === 'http://www.w3.org/2000/svg'`; `foreignObject` còn trong cây |
| **Result** | Pass |

### TC-MAIN-US-010-02: Chuỗi không có gốc `<svg>` → error fallback (giữ nguyên)
| Field | Value |
|---|---|
| **Requirement / AC** | AC-2 |
| **Priority** | High |
| **Type** | Functional / Negative |
| **Preconditions** | renderer trả `<div>not an svg</div>` |
| **Steps** | Gọi `renderMermaidBlock` |
| **Expected** | Outcome `'error'`; marker `data-mermaid-preview="error"`; không có `<svg>` chèn; code block gốc còn |
| **Result** | Pass |

### TC-MAIN-US-010-03: SVG nhúng `<script>` → không thực thi (no-exec)
| Field | Value |
|---|---|
| **Requirement / AC** | AC-3 |
| **Priority** | High |
| **Type** | Security |
| **Preconditions** | renderer trả `<svg><script>globalThis.__pwned=true;</script></svg>` |
| **Steps** | Gọi `renderMermaidBlock`, chèn node đã parse vào document |
| **Expected** | `globalThis.__pwned` vẫn `undefined`; child gốc là element `<svg>` (không qua innerHTML) |
| **Result** | Pass |

### TC-MAIN-US-010-04: SVG hợp lệ thường → không hồi quy
| Field | Value |
|---|---|
| **Requirement / AC** | AC-4 |
| **Priority** | Medium |
| **Type** | Regression |
| **Preconditions** | renderer trả `<svg id="..."><g></g></svg>` |
| **Steps** | Gọi `renderMermaidBlock`; gọi lần 2 (idempotent) |
| **Expected** | Lần 1 `'rendered'` + gắn toggle/zoom/download; lần 2 `'skipped'`; chỉ một `<svg>` |
| **Result** | Pass |

## Defect summary
| Severity | Count |
|---|---|
| Critical | 0 |
| Major | 0 |
| Minor | 0 |

Không có defect mở. Gate 5 (no open critical/major) — pass.
