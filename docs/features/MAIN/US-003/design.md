---
status: "Accepted"
date: "2026-06-11T12:36:53Z"
deciders: "architect"
---

# ADR-MAIN-003: Tích hợp Mermaid và cơ chế render SVG an toàn

## Context
US-003 phải nạp thư viện Mermaid vào content-script MV3 và render source (từ `detectMermaidBlocks` của US-002) thành SVG chèn inline. Các forces:

- **MV3 cấm remote code:** không được nạp Mermaid từ CDN; phải bundle lúc build (nhất quán ADR-MAIN-001).
- **Mermaid rất nặng (~vài MB):** bundle thẳng vào `content.js` (IIFE, ADR-MAIN-001) làm content.js phình to và nạp trên *mọi* trang Google Chat dù có sơ đồ hay không.
- **`mermaid.render()` bất đồng bộ** (Promise) và có thể ném lỗi khi cú pháp sai → cần fallback không làm vỡ trang (AC-2).
- **An toàn (AC-5):** không mở bề mặt XSS khi chèn SVG.
- **Testability:** muốn test logic chèn/fallback/idempotent/id-unique bằng jsdom mà KHÔNG kéo Mermaid thật vào test.
- **Idempotent + id duy nhất (AC-4, AC-6):** observer ở US-004 sẽ gọi lại; nhiều sơ đồ cùng trang.

## Decision
We will:

1. **Bundle Mermaid tĩnh (eager) vào content bundle** ở US-003 — đơn giản, nhất quán pipeline IIFE hiện có. Chấp nhận content.js to hơn; **hoãn tối ưu lazy-load/code-split sang một ADR sau** nếu kích thước thành vấn đề (ghi rõ là nợ kỹ thuật, không phải bỏ qua).
2. **Tách logic khỏi Mermaid qua một interface `MermaidRenderer` tiêm vào** (`render(id, source) => Promise<{ svg: string }>`). `src/lib/render.ts` chứa toàn bộ logic chèn/fallback/idempotent/id-unique và nhận renderer qua tham số; mặc định là adapter bọc `mermaid` thật. Test dùng renderer giả lập trong jsdom → không cần Mermaid thật.
3. **Khởi tạo Mermaid một lần** với `securityLevel: 'strict'`, `startOnLoad: false` (AC-3) — extension tự kiểm soát thời điểm render.
4. **Chèn SVG an toàn (AC-5):** parse chuỗi SVG do Mermaid sinh bằng `DOMParser().parseFromString(svg, 'image/svg+xml')` rồi `appendChild` node kết quả vào một container — KHÔNG dùng `innerHTML` với chuỗi từ nguồn ngoài. Mermaid `strict` đã sanitize; DOMParser SVG không thực thi script.
5. **id duy nhất (AC-6):** sinh id mỗi lần render bằng bộ đếm module (`mermaid-preview-<n>`), không trùng giữa các sơ đồ; không dùng nguồn ngẫu nhiên.
6. **Idempotent (AC-4):** bọc kết quả trong container `data-mermaid-preview="rendered"` chèn ngay sau code block; nếu block đã có container kế bên thì bỏ qua.
7. **Fallback (AC-2):** bọc `renderer.render` trong try/catch; lỗi → không chèn SVG, giữ code block gốc hiển thị và thêm chỉ báo lỗi nhẹ (`data-mermaid-preview="error"`); không ném ra ngoài.

API công khai: `renderMermaidBlock(block: { element, source }, opts?: { renderer?, document? }): Promise<'rendered' | 'error' | 'skipped'>`.

## Consequences
- **Positive:** Logic render thuần, test đầy đủ bằng jsdom + mock; an toàn (strict + DOMParser, không innerHTML untrusted); fallback giữ trang chat sống; id duy nhất tránh xung đột; pipeline build không đổi.
- **Negative / trade-offs:** content.js phình to và nạp Mermaid trên mọi trang Chat kể cả khi không có sơ đồ (nợ kỹ thuật, theo dõi để tối ưu lazy-load sau). DOMParser SVG cần xử lý lỗi parse phụ.
- **Neutral / follow-ups:** US-004 thêm toggle preview/source và observer gọi `renderMermaidBlock` lặp lại (dựa vào idempotency ở đây). Thêm devDep test mock; thêm dep runtime `mermaid`.

## Alternatives Considered
| Option | Why rejected |
|---|---|
| Lazy-load Mermaid qua `web_accessible_resources` + `import(chrome.runtime.getURL(...))` | Giảm kích thước nạp ban đầu nhưng phức tạp đáng kể (ESM chunk, khai báo resource, async import khó test jsdom); hoãn sang ADR tối ưu sau. |
| Nạp Mermaid từ CDN | MV3 cấm remote code — không khả thi. |
| Chèn SVG bằng `element.innerHTML = svg` | Mở bề mặt XSS nếu nguồn không kiểm soát; vi phạm §7 Coding-Standards. |
| `Math.random()`/uuid cho id | Bộ đếm module đơn giản, tất định, đủ duy nhất trong vòng đời trang. |

## NFR Coverage
- **Security (AC-3, AC-5):** `securityLevel: 'strict'`; chèn qua DOMParser SVG, không `innerHTML` untrusted; không remote code (bundle build-time). Đáp ứng §7 Coding-Standards.
- **Performance:** Render async không chặn UI; idempotent bỏ qua block đã render. Trade-off kích thước bundle eager được ghi nhận là nợ kỹ thuật có theo dõi.
- **Reliability (AC-2):** try/catch quanh render → lỗi cú pháp không làm vỡ trang, fallback về mã gốc.
- **Maintainability / Testability:** `MermaidRenderer` tiêm vào tách phụ thuộc nặng; `src/lib/render.ts` test bằng jsdom + mock, không cần trình duyệt thật.
