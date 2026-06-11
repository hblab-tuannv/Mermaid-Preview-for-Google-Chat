---
incident_id: "INC-MAIN-2026-06-11-02"
date: "2026-06-11T15:25:45Z"
duration: "~1h"
severity: "SEV2"
authors: "sre-maintainer"
status: "Final"
---

# Incident Postmortem — Preview render sai trong khung soạn + message gửi không render

## 1. Summary
Sau khi vá lỗi nạp extension (INC-01), smoke test thật phát hiện hai lỗi hành vi trong Google Chat: (a) sơ đồ render ngay trong khung soạn tin và khi gửi thì message thành đống markup SVG; (b) message đã gửi không preview được sơ đồ. Cả hai đã vá và người dùng xác nhận hoạt động.

## 2. Impact
- **Users affected:** 0 người dùng cuối (bắt ở smoke test trước phân phối rộng).
- **Business impact:** Tính năng preview không dùng được đúng trong môi trường Chat thật cho đến khi vá.
- **Duration:** ~1 giờ từ phát hiện đến khi người dùng xác nhận cả hai fix.

## 3. Timeline (UTC)
| Time | Event |
|---|---|
| 2026-06-11T14:30Z | Smoke test: gõ Mermaid trong khung soạn → render ngay trong input; submit → ra markup SVG (detection) |
| 2026-06-11T14:35Z | Phân tích: detection quét cả vùng `contenteditable` của composer (bug A) |
| 2026-06-11T14:40Z | Vá A: `findCodeBlocks` bỏ qua `<pre>` trong `[contenteditable]:not([contenteditable=false])` |
| 2026-06-11T15:00Z | Người dùng cung cấp DOM thật; phát hiện message gửi là 1 `<pre>` có nhãn `mermaid` + `<br>` (bug B) |
| 2026-06-11T15:05Z | Vá B: `extractSource` (`<br>`→`\n`) + `stripLanguageTag` (bỏ dòng `mermaid`) |
| 2026-06-11T15:20Z | Người dùng xác nhận cả hai: composer không render, message gửi render đúng (resolved) |

## 4. Root Cause Analysis
- **Bug A (composer):** `findCodeBlocks` chọn mọi `<pre>` dưới `document.body`, gồm cả `<pre>` Chat sinh trong khung soạn `contenteditable`. Render vào đó hiện preview trong input và khi gửi, Chat serialize SVG đã chèn thành nội dung message.
- **Bug B (message gửi):** Chat render code block đã gửi là **một** `<pre>` với các dòng ngăn bởi `<br>` và **nhãn ngôn ngữ `mermaid` là dòng text đầu**. `textContent` cho ra `"mermaid   graph TD..."` (token đầu `mermaid` không phải keyword → không detect) và gộp `<br>` mất xuống dòng.
- **Tại sao lọt:** toàn bộ test trước dùng `<pre>` tổng hợp tự tạo (giả định `textContent` + `\n`), chưa từng đối chiếu DOM Chat thật; smoke test thật bị waive ở Go/No-Go.

## 5. Detection
Phát hiện thủ công khi smoke test thật (bước đã waive ở release đầu). DOM thật do người dùng cung cấp là yếu tố quyết định để vá bug B.

## 6. Resolution & Recovery
- A: guard `contenteditable` trong `findCodeBlocks`.
- B: `extractSource` chuyển `<br>`→`\n`; `stripLanguageTag` bỏ dòng `mermaid` đầu (giữ keyword thật như `mindmap`). Revise ADR-MAIN-002.
- Verify: 61 test xanh khi vá; người dùng xác nhận hành vi đúng trong Chat.

## 7. What Went Well / What Went Wrong
- **Went well:** dùng DOM thật từ người dùng để vá chính xác; systematic-debugging; test bằng chính DOM shape thật.
- **Went wrong:** giả định DOM Chat (selector + extraction) chưa từng được kiểm chứng với Chat thật; waive smoke test che mất.
- **Got lucky:** bắt sớm ở smoke test trước khi phân phối.

## 8. Action Items
| Action | Type | Owner | Due | Ticket |
|---|---|---|---|---|
| Guard contenteditable + extraction fix (đã làm) | prevent | developer | 2026-06-11T15:25:45Z | commits 3aee436, 436e394 |
| Lưu một mẫu DOM Chat thật làm fixture test (giảm giả định) | detect | qa-engineer | backlog | — |
| Bổ sung manual smoke checklist bắt buộc cho release (không waive) | prevent | product-owner | 2026-06-18T00:00:00Z | — |

## 9. Lessons Learned
Selector + cách trích nội dung là điểm coupling với DOM bên thứ ba — phải xác minh với DOM THẬT, không tự bịa fixture. Smoke test trên trình duyệt đích là bắt buộc, không nên waive. Bám màu/luminance (US-005) thay vì class là hướng giảm coupling cho tương lai.
