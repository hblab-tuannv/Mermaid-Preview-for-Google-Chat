---
status: "Accepted"
date: "2026-06-11T15:07:46Z"
deciders: "architect"
---

# ADR-MAIN-006: Tự động theme sáng/tối bằng luminance màu nền + reset/rescan khi đổi theme

## Context
US-005 cần render Mermaid khớp giao diện sáng/tối của Google Chat. Forces:

- **Mermaid không tự thích ứng light/dark** (docs v11): có 5 theme rời `default/neutral/dark/forest/base`, phải chọn thủ công; đổi theme **bắt buộc re-render** (màu nướng vào SVG).
- **Đã bị "bỏng" vì bám DOM Chat** (INC-MAIN-2026-06-11-02): selector/extraction theo class Google rất giòn. Cần cách phát hiện theme KHÔNG phụ thuộc tên class.
- **`securityLevel:'strict'`** (ADR-MAIN-003) giới hạn `%%{init}%%` directive — cần đường set theme không qua directive.
- **User chọn:** phát hiện theo theme Chat (không phải `prefers-color-scheme`); re-render lại toàn bộ khi đổi theme giữa phiên.
- Phải test được bằng jsdom (tiêm observer/đọc màu).

## Decision
We will:

1. **Phát hiện theme bằng luminance màu nền thực tế** (`src/lib/theme.ts`, `detectTheme(el)`): đi ngược ancestor từ diagram, lấy `getComputedStyle(a).backgroundColor` đầu tiên **đục** (alpha > 0), tính relative luminance sRGB; `< 0.5` → `'dark'`, ngược lại `'default'`; không thấy → `'default'`. Bám *màu render thật*, miễn nhiễm đổi class của Google.
2. **Set theme qua host config, KHÔNG dùng directive:** mở rộng `MermaidRenderer.render(id, source, theme?)`; default renderer gọi `mermaid.initialize({...MERMAID_INIT_CONFIG, theme})` rồi `mermaid.render`. Né hoàn toàn giới hạn directive của strict mode; `securityLevel` giữ `'strict'`. `renderMermaidBlock` tính `detectTheme(element)` và truyền vào.
3. **Re-render khi đổi theme = reset + rescan (reuse pipeline):** `resetPreviews(root)` gỡ container preview + nút toggle, xóa marker (`data-mermaid-rendered`, `data-mermaid-preview`), bỏ ẩn source `<pre>`. Sau đó gọi lại `previewMermaidIn(root)` → detect + render lại theo theme mới. Tránh logic re-theme surgical phức tạp.
4. **Trigger đổi theme:** `observeThemeChange(target, onChange, opts)` (trong `theme.ts`) quan sát **attribute** mutations trên `<html>`+`<body>` (class/style — nơi Chat đổi theme), debounced, tiêm `ObserverCtor`/`schedule`; mỗi đợt tính lại `detectTheme(document.body)`, chỉ gọi `onChange` khi theme **thực sự đổi**. Trả về hàm `disconnect`. `content/index.ts` nối: `onChange = () => { resetPreviews(body); previewMermaidIn(body); }`.

API:
- `theme.ts`: `detectTheme(el: HTMLElement) => 'dark' | 'default'`; `observeThemeChange(target, onChange, opts?) => () => void`
- `render.ts`: `MermaidRenderer.render(id, source, theme?)`; `resetPreviews(root: ParentNode) => void`
- `content/index.ts`: wiring observer theme-change (cùng nơi với observer US-004).

## Consequences
- **Positive:** sơ đồ khớp sáng/tối, không bám class (bền); set theme qua initialize né strict-mode; reset+rescan tái dùng pipeline, ít code mới; observer disconnect được, debounced.
- **Negative / trade-offs:** reset+rescan làm diagram đang "xem mã" về "xem sơ đồ" khi đổi theme (hiếm); `initialize` lại mỗi render hơi tốn (chấp nhận); threshold luminance 0.5 là heuristic; thêm observer attribute trên html/body (debounced để giảm tải).
- **Neutral:** jsdom không cascade CSS đầy đủ → test set `style.backgroundColor` trực tiếp hoặc tiêm reader; xác minh thật trong Chrome (manual).

## Alternatives Considered
| Option | Why rejected |
|---|---|
| `prefers-color-scheme` (system) | User muốn khớp theme Chat, có thể lệch OS. |
| Bám class/attribute theme của Chat | Giòn — đúng loại coupling đã gây INC-02. Luminance bám màu thật, bền hơn. |
| `%%{init:{theme}}%%` directive trong source | Rủi ro bị strict mode chặn (docs không liệt kê rõ secure list); initialize host-config chắc chắn hơn. |
| Re-theme surgical (đổi màu SVG tại chỗ) | Mermaid nướng màu vào SVG, không sửa được bằng CSS; phải re-render. Reset+rescan đơn giản hơn giữ state. |
| Không reactivity (chỉ lúc render) | User yêu cầu đổi theme giữa phiên phải cập nhật. |

## NFR Coverage
- **Security:** giữ `securityLevel:'strict'`; theme set qua host config, không mở directive; không innerHTML untrusted.
- **Performance:** observer debounced + chỉ rescan khi theme đổi; reset+rescan dùng marker short-circuit; chi phí giới hạn.
- **Reliability:** `detectTheme` fallback an toàn; observer `disconnect` được; reset bỏ ẩn source đúng cách.
- **Maintainability/Testability:** `theme.ts` thuần + tiêm được; phát hiện theo luminance không phụ thuộc class (giảm rủi ro vỡ khi Google đổi DOM).
