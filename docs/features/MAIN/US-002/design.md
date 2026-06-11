---
status: "Accepted"
date: "2026-06-11T12:07:52Z"
deciders: "architect"
---

# ADR-MAIN-002: Chiến lược phát hiện Mermaid và cách bám DOM Google Chat

## Context
US-002 phải trả lời hai câu hỏi tách biệt: (a) *element nào* trong DOM là code block, và (b) *nội dung nào* là Mermaid. Các forces:

- **Google Chat không có API chính thức** và cấu trúc DOM (class name băm, layout) có thể đổi bất kỳ lúc nào → bất kỳ selector nào cũng dễ vỡ.
- **Google Chat có thể không giữ ngôn ngữ của fenced block:** người dùng gõ ```mermaid nhưng khi render thành HTML, class `language-mermaid` thường bị mất hoặc không tồn tại → không thể dựa vào marker ngôn ngữ.
- **Mermaid library nặng** và chỉ được nạp ở US-003; phát hiện ở US-002 không được phép gọi parser thật của Mermaid (sẽ kéo cả thư viện vào, và parse lỗi không đồng nghĩa "không phải Mermaid").
- Cần **idempotent** (AC-6): MutationObserver ở US-004 sẽ quét lại nhiều lần, không được trả về block đã xử lý.
- Cần **ít false positive** (AC-2): không bắt nhầm JS/JSON/text.
- Logic phải **test được không cần trình duyệt thật** (jsdom).

## Decision
We will tách "tìm element" khỏi "nhận diện nội dung", và nhận diện bằng **heuristic so khớp từ khoá đầu khối**:

1. **Tìm element** qua một hàm `findCodeBlocks(root: ParentNode): HTMLElement[]` cô lập selector (mặc định `pre code, pre`) — đây là điểm-vỡ-duy-nhất, dễ chỉnh khi Google đổi DOM, và được test bằng DOM jsdom.
2. **Nhận diện nội dung** qua `isMermaid(text): boolean`: `text.trim()`, lấy token đầu của dòng đầu, so khớp **không phân biệt hoa thường** với một tập hằng `MERMAID_KEYWORDS` (`graph`, `flowchart`, `sequenceDiagram`, `classDiagram`, `stateDiagram`/`stateDiagram-v2`, `erDiagram`, `gantt`, `pie`, `journey`, `gitGraph`, `mindmap`, `timeline`, `quadrantChart`, …). Rỗng/whitespace → false (AC-4).
3. **Trích source** bằng `textContent` (lấy text thuần, không kèm thẻ HTML) — AC-1/AC-5 giữ nguyên nội dung gốc, chỉ trim khi *so khớp* chứ không trim source trả về.
4. **Idempotency** bằng cách đánh dấu element đã xử lý với thuộc tính `data-mermaid-preview="detected"`; `detectMermaidBlocks(root)` bỏ qua element đã có dấu (AC-6).
5. API công khai: `detectMermaidBlocks(root): { element: HTMLElement; source: string }[]` trả về theo thứ tự xuất hiện (AC-3).

## Consequences
- **Positive:** Một điểm-vỡ-duy-nhất (selector) dễ bảo trì; không phụ thuộc Mermaid library ở US-002; heuristic nhẹ, chạy nhanh, test được bằng jsdom; tập từ khoá dễ mở rộng.
- **Negative / trade-offs:** Heuristic từ khoá có thể bỏ sót sơ đồ Mermaid mở đầu bằng comment/directive `%%{init}%%` hoặc front-matter `---` (chấp nhận cho US-002; có thể bổ sung quy tắc ở ADR sau). Cũng có thể (hiếm) false positive nếu một block ngôn ngữ khác tình cờ bắt đầu bằng đúng từ khoá như `pie` — rủi ro thấp, chấp nhận.
- **Neutral / follow-ups:** US-003 nhận `{element, source}` để render; US-004 gắn observer gọi `detectMermaidBlocks` lặp lại (dựa vào idempotency ở đây). Cần thêm devDependency `jsdom` cho test môi trường DOM.

## Alternatives Considered
| Option | Why rejected |
|---|---|
| Gọi `mermaid.parse()` để xác định | Kéo cả thư viện nặng vào US-002; parse-fail ≠ "không phải Mermaid"; chậm. |
| Dựa vào class `language-mermaid` của fenced block | Google Chat thường không giữ class ngôn ngữ sau render → bỏ sót gần hết. |
| Regex toàn văn quét mọi cú pháp Mermaid | Phức tạp, dễ false positive/negative, khó bảo trì hơn so khớp token đầu. |
| Hardcode selector DOM rải rác trong content-script | Khi Google đổi DOM phải sửa nhiều nơi; không test được tách biệt. |

## NFR Coverage
- **Security:** Chỉ đọc `textContent` (không `innerHTML`), không thực thi nội dung, không chèn HTML ở story này → không mở bề mặt XSS. Sanitization render thuộc US-003.
- **Performance:** Heuristic O(n) theo số code block, chỉ so khớp token đầu; đánh dấu `data-*` để tránh quét lại → đáp ứng ngân sách phản hồi nhanh khi observer chạy liên tục (US-004).
- **Reliability:** Selector cô lập một chỗ; rỗng/malformed trả false không ném lỗi (AC-4) → không làm vỡ trang chat.
- **Maintainability / Testability:** `src/lib/detect.ts` thuần, test đầy đủ bằng jsdom; tập từ khoá là hằng số tập trung.
