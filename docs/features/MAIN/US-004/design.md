---
status: "Accepted"
date: "2026-06-11T13:31:42Z"
deciders: "architect"
---

# ADR-MAIN-004: Quan sát DOM động (MutationObserver) và mô hình toggle preview/source

## Context
US-004 thêm hai năng lực lên trên cơ chế render của US-003:

1. **Tin nhắn tải động:** Google Chat nạp tin nhắn động (cuộn lịch sử, tin nhắn mới đến) — `previewMermaidIn` hiện chỉ chạy một lần lúc inject, nên block Mermaid xuất hiện sau đó không được render (AC-4).
2. **Toggle preview/source:** người dùng cần chuyển giữa SVG đã render và mã gốc (AC-1, AC-2); scope đã duyệt: **mặc định ẩn code, hiện SVG**.

Các forces / ràng buộc:
- **DOM Google Chat thay đổi liên tục và không kiểm soát được** — observer phải bám một điểm quan sát ổn định và chịu được mutation dồn dập (performance NFR).
- **Idempotency đã có sẵn** ở tầng dưới: `detect.ts` đánh dấu `data-mermaid-preview="detected"`, `render.ts` đánh dấu `data-mermaid-rendered`. Quét lại toàn DOM là *an toàn* nhờ các marker này, chỉ tốn chi phí duyệt.
- **Chống toggle trùng (AC-5):** điểm mấu chốt — marker hiện có chỉ phủ detect+render, CHƯA phủ việc chèn toggle. Cần đảm bảo toggle được tạo đúng một lần.
- **Testability:** phải test observer + toggle bằng jsdom (hỗ trợ `MutationObserver`) mà không cần trình duyệt thật; muốn tiêm được observer/callback để mock.
- **Cleanup (AC-6):** observer phải tháo gỡ được (`disconnect`) để tránh rò rỉ listener.
- **An toàn:** toggle chỉ đổi hiển thị, không được mở thêm bề mặt XSS (nhất quán ADR-MAIN-003).

## Decision
We will:

1. **Quan sát bằng MutationObserver trên một root cấu hình được (mặc định `document.body`)** với `{ childList: true, subtree: true }`. Khi có node mới thêm vào, **gọi lại `previewMermaidIn(root)`** — dựa hoàn toàn vào idempotency của US-002/US-003 để bỏ qua block đã xử lý. Quét lại theo root (không cố bám selector container nội bộ của Chat) là lựa chọn bền nhất khi DOM Chat đổi.
2. **Debounce/coalesce mutation:** gom các mutation trong một đợt rồi chỉ quét **một lần** mỗi đợt (qua một scheduler tiêm được, mặc định `setTimeout(…, 0)` / microtask), tránh quét lại N lần khi Chat chèn nhiều node liên tiếp. Chi phí mỗi lần quét bị chặn bởi debounce + short-circuit O(1) của marker `detected`.
3. **Tách observer thành helper thuần, tiêm được:** `src/lib/observe.ts` export `observeChildList(target, onBatch, opts?: { ObserverCtor?, schedule? }): () => void` trả về **hàm disconnect** (AC-6). Helper không biết gì về Mermaid; `src/content/index.ts` nối nó với `previewMermaidIn` làm callback. Test bơm `ObserverCtor`/`schedule` giả lập trong jsdom.
4. **Chèn toggle NGAY TRONG đường thành công của `renderMermaidBlock` (US-003), không thêm bước quét riêng.** Vì `renderMermaidBlock` đã idempotent (đặt `data-mermaid-rendered` ngay đầu, chỉ chạy một lần/ block), toggle được tạo **đúng một lần theo cấu trúc** — giải quyết AC-5 mà KHÔNG cần marker idempotency riêng cho toggle. Đường lỗi (fallback) KHÔNG chèn toggle (AC-3).
5. **Logic toggle tách sang `src/lib/toggle.ts`:** `attachToggle(source, previewContainer, doc): void` tạo `<button data-mermaid-toggle>`, đặt trạng thái đầu = **preview** (ẩn `source` qua thuộc tính `hidden`, hiện `previewContainer`), và gắn handler click lật `hidden` giữa hai phần tử — **chỉ đổi hiển thị, không render lại** (AC-2). `render.ts` gọi `attachToggle` sau khi chèn SVG thành công.
6. **Trạng thái toggle nằm trên DOM** (thuộc tính `hidden` + nhãn nút phản ánh trạng thái, ví dụ "Xem mã" ↔ "Xem sơ đồ") — không cần state store ngoài; mỗi block độc lập.

API mới/đổi:
- `src/lib/observe.ts`: `observeChildList(target: Node, onBatch: () => void, opts?) => () => void`
- `src/lib/toggle.ts`: `attachToggle(source: HTMLElement, preview: HTMLElement, doc: Document) => void`
- `src/lib/render.ts`: đường thành công gọi `attachToggle` + ẩn `source` mặc định.
- `src/content/index.ts`: sau lần render đầu, gọi `observeChildList(document.body, () => void previewMermaidIn(document.body))`.

## Consequences
- **Positive:** Tin nhắn động được render tự động; toggle tạo đúng-một-lần theo cấu trúc (không cần marker mới, AC-5 vững); observer thuần + tiêm được nên test đầy đủ bằng jsdom; disconnect được (AC-6); toggle chỉ lật `hidden` nên không mở XSS.
- **Negative / trade-offs:** Quét lại theo root mỗi đợt mutation là O(số `<pre>` dưới root) — chấp nhận được nhờ debounce + short-circuit marker, nhưng là chi phí lặp; ghi nhận là điểm theo dõi nếu hội thoại rất dài. Quan sát `subtree: true` trên `body` bắt nhiều mutation không liên quan (đã giảm tải bằng debounce, không lọc sâu để giữ đơn giản & bền).
- **Neutral / follow-ups:** Đây là story cuối epic MAIN; sau Done, toàn epic vào Phase 6. Nhãn nút hiện tại tĩnh (chưa i18n) — đủ cho phạm vi hiện tại.

## Alternatives Considered
| Option | Why rejected |
|---|---|
| Chỉ quét các `addedNodes` của mutation thay vì quét lại root | Tối ưu hơn nhưng phức tạp: node thêm vào có thể *chính là* `<pre>` (querySelectorAll không gồm root), hoặc là container chứa `<pre>` ở nhiều tầng; xử lý đủ case dễ sót. Idempotency khiến quét-lại-root đơn giản và đúng; giữ tối ưu này là nợ kỹ thuật có thể làm sau. |
| Bám selector container tin nhắn cụ thể của Google Chat để observe hẹp | DOM Chat không ổn định/không tài liệu hóa; bám sâu dễ vỡ khi Google đổi markup. `document.body` + lọc bằng detect là điểm ghép tối thiểu, bền nhất. |
| Marker idempotency riêng cho toggle (`data-mermaid-toggle-attached`) | Thừa: đặt toggle trong đường thành công đã-idempotent của `renderMermaidBlock` khiến nó chạy đúng một lần theo cấu trúc. Thêm marker chỉ tăng bề mặt trạng thái. |
| Toggle bằng cách render lại / xóa-tạo DOM mỗi lần bấm | Lãng phí và mất trạng thái; chỉ cần lật `hidden` vì code gốc vẫn nằm trong DOM (US-003 chèn SVG *sau* code, không xóa). |
| `MutationObserver` không debounce (quét mỗi mutation) | Chat chèn node theo cụm → quét lại quá nhiều lần/đợt; debounce gom về một lần/đợt. |

## NFR Coverage
- **Performance (AC-4, AC-5):** debounce/coalesce mutation → một lần quét mỗi đợt; marker `detected`/`rendered` short-circuit O(1) cho block đã xử lý; chi phí quét bị chặn. Trade-off quét-lại-root ghi nhận là điểm theo dõi.
- **Security:** toggle chỉ lật thuộc tính `hidden`, nhãn nút tĩnh — không `innerHTML` untrusted, không thêm bề mặt XSS (nhất quán ADR-MAIN-003); không remote code.
- **Reliability (AC-6):** `observeChildList` trả về hàm disconnect → tháo gỡ được, không rò rỉ listener; handler toggle guard node thiếu; đường lỗi render không gắn toggle (AC-3) nên không vỡ.
- **Maintainability / Testability:** observer & toggle tách module thuần, tiêm `ObserverCtor`/`schedule`/`doc` → test bằng jsdom + mock, không cần trình duyệt thật. Toggle-đúng-một-lần theo cấu trúc giảm rủi ro bug trùng.
