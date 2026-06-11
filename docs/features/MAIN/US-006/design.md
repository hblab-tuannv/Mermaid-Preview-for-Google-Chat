---
status: "Accepted"
date: "2026-06-11T16:34:53Z"
deciders: "architect"
---

# ADR-MAIN-007: Phóng to sơ đồ bằng overlay trong trang (clone SVG) + zoom/pan qua CSS transform

## Context
US-006 thêm nút **zoom** trên mỗi diagram render thành công; bấm vào mở chế độ "toàn màn hình" cho phép phóng to/thu nhỏ và kéo di chuyển (pan) để đọc sơ đồ lớn. Forces / ràng buộc:

- **Phải clone, không di chuyển SVG gốc:** SVG `data-mermaid-preview="rendered"` (US-003) đang nằm trong tin nhắn; lấy nó ra để phóng to sẽ làm rỗng preview trong message và phá toggle (US-004). Yêu cầu AC-3: **clone** SVG vào chế độ phóng to.
- **`securityLevel:'strict'` (ADR-MAIN-003) không được nới:** chỉ thao tác trên DOM do extension tạo; KHÔNG `innerHTML` HTML untrusted mới — không tăng bề mặt XSS.
- **Bám DOM Chat đã từng gây "bỏng"** (INC-MAIN-2026-06-11-02): chế độ phóng to không được phụ thuộc layout/CSS của Google Chat (overlay phải tự chủ về kích thước/định vị).
- **Cleanup là điểm rủi ro chính:** mở chế độ phóng to gắn listener cấp `document` (keydown để bắt Esc; có thể cả mousemove/mouseup cho pan) — phải tháo gỡ **trên mọi đường đóng** để không rò rỉ (mô hình `disconnect` của observe.ts US-004).
- **Idempotency (AC-2):** nút zoom phải tạo đúng một lần/block, như `attachToggle`.
- **Tương tác với `resetPreviews` (US-005, AC-6):** đổi theme gỡ container preview + toggle; nút zoom phải bị gỡ cùng (không mồ côi) và overlay đang mở phải đóng an toàn — nhưng `resetPreviews` duyệt DOM, KHÔNG giữ tham chiếu tới teardown của overlay.
- **Testability:** phải test bằng jsdom (tạo SVG giả, mô phỏng click/Esc/backdrop/X, kiểm overlay + listener gỡ).

## Decision

### 1. Chế độ phóng to = **overlay trong trang** (DOM thuần do extension tạo), KHÔNG dùng Fullscreen API
Khi bấm nút zoom, tạo một `<div>` overlay `position:fixed` phủ toàn viewport (`inset:0`), nền mờ (backdrop dim), `z-index` cao, chèn vào `document.body`. **Clone** SVG đã render bằng `svg.cloneNode(true)` và đặt vào một "stage" giữa overlay — SVG gốc trong tin nhắn không bị đụng tới. Lý do chọn overlay thay vì `Element.requestFullscreen()`:

- Native Fullscreen yêu cầu user-gesture, có thể bị **policy/permission của trang chặn** và không kiểm soát được trong môi trường nhúng như Google Chat; overlay không phụ thuộc API trình duyệt nào.
- Fullscreen **không test được bằng jsdom** (không có fullscreen API); overlay là DOM thuần → test đầy đủ.
- Overlay tự chủ về định vị/kích thước, không bám layout Chat (tránh đúng loại coupling đã gây INC-02).

Trade-off chấp nhận: overlay tạm đè UI Google Chat — bù lại có **3 cách đóng nhanh** (Esc / backdrop / X).

### 2. Zoom/pan bằng **CSS `transform`** (scale + translate), KHÔNG sửa SVG `viewBox`
State `scale` (số) và offset `{x, y}` giữ trong **closure của overlay**; mỗi lần đổi, set `stage.style.transform = translate(x,y) scale(s)`. Nguồn thay đổi:
- Nút **zoom in/out**: cộng/trừ scale theo bước (kẹp min/max).
- **Con lăn chuột** (`wheel` trên overlay): đổi scale theo `deltaY`, `preventDefault` để không cuộn trang.
- **Kéo (drag)**: `mousedown` trên stage bắt đầu pan; cập nhật offset theo delta con trỏ; `mouseup` kết thúc.

Lý do: SVG do Mermaid sinh đã "nướng" toạ độ; CSS transform là phép biến đổi thuần view, không đụng nội dung SVG, đơn giản và đảo ngược được. (Đánh đổi: pan/zoom là heuristic CSS transform, không phải thao tác `viewBox` chính xác — đủ tốt cho mục đích đọc sơ đồ.)

### 3. **Hợp đồng cleanup:** `attachZoom` idempotent; mở overlay trả **handle đóng** `() => void`
- `src/lib/zoom.ts` export `ZOOM_ATTR = 'data-mermaid-zoom'` và `attachZoom(preview: HTMLElement, doc: Document): HTMLButtonElement`. Tạo `<button data-mermaid-zoom>`, đặt **sau** preview container bằng `preview.after(button)` — **cạnh nút toggle**, hiển thị ở cả trạng thái preview/source (giống toggle). Vì gọi sau `attachToggle` và cùng dùng `preview.after()`, nút zoom nằm liền sau container, trước toggle (`container → zoom → toggle`) — chấp nhận, AC-1 chỉ yêu cầu "cạnh toggle / sau container". Trả nút để caller/test điều khiển.
- Gọi `attachZoom(container, doc)` **ngay sau `attachToggle`** trong đường thành công (đã-idempotent) của `renderMermaidBlock` → nút zoom tạo **đúng một lần theo cấu trúc** (như AC-5 của US-004), KHÔNG cần marker idempotency riêng. Đường lỗi (`data-mermaid-preview="error"`) KHÔNG gọi → block lỗi không có nút zoom (AC-1).
- Click nút zoom gọi `openZoomOverlay(svg, doc, opener)` (nội bộ zoom.ts) → tạo overlay, trả **`close: () => void`**. `close` thực hiện: gỡ overlay khỏi DOM, **gỡ MỌI listener cấp document đã gắn**, trả focus về `opener` (nút zoom). Cả Esc / click backdrop / nút X đều gọi đúng `close` này (một đường đóng duy nhất) → không rò rỉ, focus trả đúng (AC-5).
- **Listener nào ở đâu (tổng quát, không chỉ keydown):**
  - `keydown` (bắt Esc) gắn ở **`document`** → bắt buộc `removeEventListener` trong `close`.
  - `wheel`, `mousedown` (bắt đầu pan), click backdrop, click X gắn **trên node overlay** → tự GC khi overlay `.remove()`, không cần gỡ thủ công.
  - `mousemove`/`mouseup` của pan: gắn ở **`document`** khi đang kéo (để pan tiếp tục cả khi con trỏ ra ngoài SVG) và gỡ ngay khi `mouseup`; ngoài ra `close` cũng gỡ để an toàn khi overlay đóng giữa lúc đang kéo. **Mọi listener document-level đều có đường gỡ.**

### 4. **`resetPreviews` (render.ts) phải mở rộng** để gỡ nút zoom và đóng overlay an toàn (AC-6)
Đây là phần thay đổi thực chất ở `render.ts`, không chỉ là thêm một lời gọi:

- **Gỡ nút zoom cùng container:** `resetPreviews` hiện gỡ `container` + đúng một `nextElementSibling` nếu có `TOGGLE_ATTR`. Thêm nút zoom làm sibling thứ hai sẽ để **mồ côi một nút** dù đặt ở đâu. Đổi logic dọn: sau khi xác định `container` (`rendered`/`error`), gỡ **tất cả** sibling-control liền sau container mang marker control (`TOGGLE_ATTR` **hoặc** `ZOOM_ATTR`) — duyệt `nextElementSibling` và `.remove()` từng nút control cho tới khi gặp non-control — rồi mới `container.remove()` (impl: chụp `nextElementSibling` *trước* khi `.remove()`). Adjacency sau US-006: `source` → `container` → `zoom` → `toggle` (vì `attachZoom` gọi sau `attachToggle` và cũng dùng `preview.after()`, nên zoom thành sibling liền sau container; thứ tự không ảnh hưởng vòng dọn vì quét theo marker). Logic dọn KHÔNG phụ thuộc thứ tự control.
- **Đóng overlay đang mở khi reset:** `resetPreviews` duyệt DOM, không có tham chiếu tới `close` của overlay. Cơ chế tiếp cận được: zoom.ts giữ **một handle module-level `activeOverlayClose: (() => void) | null`** — `openZoomOverlay` set nó khi mở (overlay là singleton: mở cái mới đóng cái cũ), `close` tự xoá về `null`. zoom.ts export `closeActiveOverlay(): void` gọi `activeOverlayClose?.()` (no-op an toàn nếu không có overlay). `resetPreviews` gọi `closeActiveOverlay()` ở đầu (try/catch-free vì đã no-op-safe) trước khi dọn DOM → overlay đóng sạch, listener gỡ, không ném lỗi.

API mới/đổi:
- `src/lib/zoom.ts`: `ZOOM_ATTR = 'data-mermaid-zoom'`; `attachZoom(preview: HTMLElement, doc: Document) => HTMLButtonElement`; `closeActiveOverlay() => void`. Nội bộ: `openZoomOverlay(svg, doc, opener) => () => void` (handle close).
- `src/lib/render.ts`: đường thành công gọi `attachZoom(container, doc)` sau `attachToggle`; `resetPreviews` gọi `closeActiveOverlay()` rồi gỡ mọi sibling-control (toggle + zoom) trước khi gỡ container.

## Consequences
- **Positive:** đọc được sơ đồ lớn mà không rời trang; overlay tự chủ, không bám DOM Chat (bền, tránh INC-02); clone SVG nên message giữ nguyên SVG gốc + toggle; nút zoom tạo đúng-một-lần theo cấu trúc (không cần marker mới); một đường `close` duy nhất cho 3 cách đóng → cleanup tất định, focus trả đúng; test đầy đủ bằng jsdom (DOM thuần, listener kiểm được).
- **Negative / trade-offs:** overlay tạm đè UI Chat (chấp nhận, có 3 cách đóng nhanh); zoom/pan CSS-transform là heuristic, không chính xác như viewBox; overlay là **singleton** (mở diagram khác đóng overlay cũ) — đơn giản hoá quản lý state, đánh đổi không xem 2 overlay cùng lúc; thêm handle module-level `activeOverlayClose` (state toàn cục nhỏ, có chủ đích để `resetPreviews` tiếp cận được).
- **Neutral:** nhãn/icon nút zoom tĩnh (chưa i18n) — đủ phạm vi hiện tại; jsdom không tính toán layout transform → test kiểm chuỗi `style.transform` đổi, không kiểm pixel render.

## Alternatives Considered
| Option | Why rejected |
|---|---|
| Native Fullscreen API (`element.requestFullscreen()`) | Phụ thuộc user-gesture + có thể bị policy trang nhúng chặn; không test được bằng jsdom; kém kiểm soát hơn overlay DOM thuần. |
| Di chuyển (move) SVG gốc vào overlay thay vì clone | Làm rỗng preview trong message, phá toggle US-004; phải khôi phục lại khi đóng (giòn). Clone giữ gốc nguyên vẹn. |
| Zoom/pan bằng sửa SVG `viewBox` | Chính xác hơn nhưng phải đọc/ghi viewBox gốc của Mermaid, dễ lệch với nội dung đã "nướng"; CSS transform thuần view đơn giản, đảo ngược, không đụng SVG. |
| Để overlay nhiều cái (không singleton) | Cần quản lý tập teardown để `resetPreviews` đóng hết → phức tạp; mở 2 overlay cùng lúc không có giá trị thực. Singleton + một handle đủ. |
| Lưu teardown trên thuộc tính nút zoom để `resetPreviews` đọc | Phải duyệt tìm nút "đang mở" + ép kiểu function trên DOM; handle module-level `closeActiveOverlay()` trực tiếp và rõ ràng hơn. |
| `resetPreviews` chỉ gỡ thêm đúng nút zoom (sibling cố định) | Giòn theo thứ tự sibling; duyệt-gỡ-mọi-control theo marker bền hơn khi sau này thêm control mới. |

## NFR Coverage
- **Security:** chỉ `cloneNode`/`createElement` trên DOM do extension tạo; KHÔNG `innerHTML` HTML untrusted; `securityLevel:'strict'` (ADR-MAIN-003) không đổi → không tăng bề mặt XSS.
- **Reliability / không rò rỉ listener (AC-5):** một đường `close` duy nhất cho Esc/backdrop/X gỡ mọi listener document-level (keydown + mousemove/mouseup pan); listener overlay-scoped GC theo overlay; `closeActiveOverlay()` no-op-safe → `resetPreviews` đóng overlay không ném lỗi (AC-6).
- **Performance:** zoom/pan qua CSS transform (GPU-compositable), không re-render SVG; wheel/drag chỉ cập nhật `transform`; overlay singleton không tích luỹ DOM.
- **Maintainability / Testability:** `zoom.ts` thuần, tiêm `doc`; cấu trúc tạo-một-lần như `attachToggle`; jsdom mô phỏng click/Esc/backdrop/X + kiểm overlay tồn tại/bị gỡ, listener gỡ, `transform` đổi — không cần trình duyệt thật.
