# Design — MAIN-US-011: Hỗ trợ thêm domain `mail.google.com`

| Field | Value |
|---|---|
| Story | MAIN-US-011 |
| Epic | MAIN |
| Author | architect |
| Status | Accepted (inline, no ADR) |
| Date | 2026-06-12T10:15:46Z |

## Quyết định (không cần ADR)
Mở rộng phạm vi inject của content script MV3 sang `mail.google.com`. Đây **không** phải quyết định kiến trúc đảo ngược khó (no-exec/no-innerHTML của ADR-MAIN-003 giữ nguyên; cơ chế detect/render không đổi), nên ghi nhận inline thay vì ADR.

### Thay đổi cụ thể (`public/manifest.json`)
```json
"content_scripts": [
  {
    "matches": [
      "https://chat.google.com/*",
      "https://mail.google.com/*"
    ],
    "js": ["content.js"],
    "run_at": "document_idle",
    "all_frames": true
  }
]
```
Hai thay đổi: (1) thêm pattern `https://mail.google.com/*`; (2) thêm `"all_frames": true`.

## Vì sao "pattern rộng + all_frames" (Hướng B)
- **Iframe lồng nhau:** Trong Gmail, panel Chat render trong iframe con cùng origin dưới `mail.google.com` (path dạng `/chat/...`). Content script MV3 khớp pattern theo **URL của từng frame**; mặc định chỉ inject top frame. Cần `all_frames: true` để chạm iframe Chat.
- **Pattern rộng thay vì hẹp:** URL path chính xác của iframe Chat chưa được verify trực tiếp. `https://mail.google.com/*` phủ mọi path nên không vỡ nếu Google đổi path (`/chat`, `/u/0/chat`, …). Đánh đổi: script cũng inject vào các iframe Gmail khác — chấp nhận được vì pipeline rẻ và **idempotent** (`detectMermaidBlocks` đánh dấu `data-mermaid-preview`, chỉ quét `<pre>`; không có `<pre>` Mermaid → no-op, không tác dụng phụ).

## Bất biến được giữ
- **Least-privilege:** không thêm `permissions`/`host_permissions`/`<all_urls>`. Content-script `matches` tự cấp quyền inject; không cần host_permissions cho MV3 content script. `matches` vẫn giới hạn đúng 2 host Google.
- **Logic DOM bất biến:** `detect.ts`/`render.ts`/`observe.ts`/`theme.ts`/`content/index.ts` không đổi — chúng thuần DOM, độc lập URL. Cùng DOM Chat trong iframe Gmail ⇒ cùng kết quả.
- **No-exec/anti-XSS:** không liên quan; đường render không đổi.

## Rủi ro & giảm thiểu
| Rủi ro | Giảm thiểu |
|---|---|
| Iframe Chat dùng origin khác `mail.google.com` (vd `chat.google.com` nhúng) | Đã giữ `chat.google.com/*` trong matches + `all_frames` ⇒ vẫn phủ. |
| Inject thừa vào iframe Gmail khác | Pipeline idempotent/no-op; không side effect. |
| Path iframe khác dự đoán | Pattern rộng `/*` không phụ thuộc path. |
| CSP/3rd-party-cookie chặn | Ngoài tầm manifest; xác nhận bằng test thủ công trên Gmail thật (Phase 5/manual). |

## Kiểm thử
TDD ở `tests/manifest.test.ts`: cập nhật kỳ vọng `matches` (2 host) + `all_frames: true`, giữ assert least-privilege (AC-4). Không có unit test cho hành vi iframe runtime (giới hạn của test tĩnh manifest) ⇒ bù bằng 1 case kiểm thử thủ công trên Gmail.
