---
version: "1.0.0"
date: "2026-06-12T04:45:56Z"
author: release-manager
status: Draft
epic: MAIN
release_id: REL-MAIN-2026-06-12-2
---

# Store Listing Draft — Mermaid Preview for Google Chat (v1.0.0)

**Bản nháp sẵn sàng để paste lên Chrome Web Store Developer Dashboard.**
**Release ID:** `REL-MAIN-2026-06-12-2`

---

## Thông tin cơ bản

### Title (tên extension)

```
Mermaid Preview for Google Chat
```

### Summary (tóm tắt — tối đa 132 ký tự)

```
Render sơ đồ Mermaid inline trong Google Chat — toggle, zoom toàn màn hình, tải PNG/SVG.
```

> Kiểm đếm: 89 ký tự (dưới giới hạn 132).

---

## Detailed Description

### Phiên bản Tiếng Việt

```
Mermaid Preview for Google Chat là Chrome Extension giúp bạn xem sơ đồ Mermaid trực tiếp trong giao diện Google Chat, không cần copy code sang công cụ khác.

Tính năng chính:
• Tự động phát hiện code block Mermaid trong tin nhắn Google Chat và render thành sơ đồ SVG ngay trong trang.
• Nút Toggle để chuyển đổi qua lại giữa sơ đồ đã render và mã Mermaid gốc — không render lại từ đầu.
• Nút Zoom mở overlay toàn màn hình với zoom in/out (nút hoặc con lăn chuột) và kéo để pan — sơ đồ gốc trong tin nhắn không bị ảnh hưởng.
• Nút tải SVG: tải sơ đồ dưới dạng vector SVG lossless — phổ quát, đúng mọi loại diagram (flowchart, sequence, class, state, ER, ...).
• Nút tải PNG: tải ảnh PNG độ phân giải cao với nền trong suốt — hoạt động đầy đủ với sequence, class, state, ER. Với flowchart (dùng foreignObject HTML), extension tự động fallback về SVG và thông báo cho bạn.
• Tự động theo dõi tin nhắn mới qua MutationObserver — không cần reload trang.
• Tự động khớp theme sáng/tối với giao diện Google Chat và cập nhật khi bạn đổi theme.
• Không có server, không thu thập dữ liệu — toàn bộ xử lý diễn ra trong tab trình duyệt của bạn.

Yêu cầu: Chrome ≥ 110. Hỗ trợ tất cả các loại diagram Mermaid (flowchart, sequence, class, state, ER và các loại khác được Mermaid hỗ trợ).

Tuyên bố: Đây là một dự án độc lập, KHÔNG liên kết, KHÔNG được tài trợ và KHÔNG được Google LLC chứng thực. "Google Chat" và "Google" là thương hiệu của Google LLC. "Mermaid" là dự án mã nguồn mở riêng.
```

### English Version

```
Mermaid Preview for Google Chat is a Chrome Extension that renders Mermaid diagrams directly inside Google Chat — no copy-pasting to external tools required.

Key features:
• Automatically detects Mermaid code blocks in Google Chat messages and renders them as inline SVG diagrams.
• Toggle button to switch between the rendered diagram and the original Mermaid source — no re-rendering.
• Zoom button opens a full-viewport overlay with zoom in/out (buttons or scroll wheel) and drag-to-pan — original diagram in the message is preserved.
• SVG download: exports diagrams as lossless vector SVG — works universally with all diagram types (flowchart, sequence, class, state, ER, ...).
• PNG download: exports high-resolution PNG with transparent background — fully supported for sequence, class, state, ER diagrams. For flowcharts (which use HTML foreignObject), the extension automatically falls back to SVG and notifies you.
• Watches for new messages via MutationObserver — no page reload needed.
• Automatically matches Google Chat's light/dark theme and re-renders when you switch themes.
• No server, no data collection — all processing happens locally in your browser tab.

Requirements: Chrome ≥ 110. Supports all Mermaid diagram types (flowchart, sequence, class, state, ER, and others supported by Mermaid).

Disclaimer: This is an independent project and is NOT affiliated with, sponsored by, or endorsed by Google LLC. "Google Chat" and "Google" are trademarks of Google LLC. "Mermaid" is a separate open-source project.
```

---

## Category

**Khuyến nghị:** `Productivity`

> Lý do: Extension tăng năng suất khi làm việc trong Google Chat bằng cách trực quan hoá tài liệu kỹ thuật (sơ đồ Mermaid) ngay trong luồng chat, giảm ngữ cảnh chuyển đổi.

---

## Language

**Primary:** `Tiếng Việt (vi)`
**Secondary (khuyến nghị thêm):** `English (en)` — để tiếp cận người dùng quốc tế sử dụng Google Chat.

---

## Privacy Declarations

### Single-Purpose Statement

```
Extension phát hiện và render code block Mermaid trong Google Chat thành sơ đồ SVG inline, với các tính năng toggle, zoom và tải xuống — chỉ hoạt động trên https://chat.google.com/*.
```

### Per-Permission Justification

**Host match `https://chat.google.com/*` (content-script):**

```
Content-script cần quyền truy cập trang https://chat.google.com/* để:
1. Đọc DOM và phát hiện các code block chứa mã Mermaid trong tin nhắn.
2. Inject SVG render inline cạnh code block.
3. Gắn MutationObserver để phát hiện và render code block Mermaid trong tin nhắn mới tải động.
4. Gắn các nút điều khiển (Toggle, Zoom, PNG, SVG) vào từng sơ đồ đã render.

Extension không truy cập bất kỳ trang nào khác ngoài https://chat.google.com/*.
```

> Extension không có các permission nhạy cảm sau: không có `storage`, không có `tabs`, không có broad host permissions (`<all_urls>` hay `*://*/*`), không có `activeTab`, không có remote code execution.

### Data Usage Disclosure

```
• Extension không thu thập bất kỳ dữ liệu người dùng nào.
• Extension không lưu trữ dữ liệu ra ngoài tab (không sử dụng chrome.storage API hay bất kỳ storage nào).
• Extension không truyền dữ liệu tới server nào (không có network request từ extension code).
• Toàn bộ xử lý render Mermaid diễn ra client-side trong tab trình duyệt của người dùng.
• Nội dung tin nhắn không rời khỏi tab.
```

---

## Non-affiliation / Trademark (giảm rủi ro bị Store reject)

> **Quan trọng:** Tên extension chứa "Google Chat" (thương hiệu của Google LLC). Reviewer Chrome Web Store thường flag việc dùng thương hiệu bên thứ ba nổi bật mà không có tuyên bố không liên kết. Disclaimer dưới đây ĐÃ được nhúng vào cuối phần Detailed Description (cả VI và EN) — đảm bảo giữ nguyên khi paste lên Dashboard.

```
Đây là dự án độc lập, không liên kết / không được Google LLC chứng thực. "Google Chat" và "Google" là thương hiệu của Google LLC.
(EN) Independent project, not affiliated with or endorsed by Google LLC. "Google Chat" and "Google" are trademarks of Google LLC.
```

> Nếu reviewer vẫn yêu cầu đổi tên, phương án dự phòng: đổi title thành dạng mô tả chức năng không dẫn đầu bằng thương hiệu, ví dụ "Mermaid Diagram Preview — for Google Chat" hoặc "Inline Mermaid Renderer (Google Chat)", giữ disclaimer.

---

## Image Asset Checklist

> **LƯU Ý:** Tất cả ảnh upload trực tiếp trên **Chrome Web Store Developer Dashboard** — KHÔNG bundle trong file zip.

### Ảnh bắt buộc

- [ ] **Store icon — 128×128 PNG** *(BẮT BUỘC)*
  Ảnh đại diện extension trên trang Store và trong `chrome://extensions`. Nền trong suốt hoặc trắng, logo/icon rõ ràng. Upload lên Dashboard → mục "Store icon".

- [ ] **Screenshot — 1280×800 hoặc 640×400 PNG hoặc JPG** *(BẮT BUỘC — ít nhất 1, tối đa 5)*
  Chụp màn hình extension đang hoạt động trong Google Chat:
  - Screenshot 1: Sơ đồ Mermaid đã render trong luồng chat (cho thấy SVG inline cạnh code block).
  - Screenshot 2 (khuyến nghị): Overlay zoom toàn màn hình với sơ đồ.
  - Screenshot 3 (khuyến nghị): Nút điều khiển (Toggle, Zoom, PNG, SVG) cạnh một sơ đồ.

### Ảnh tùy chọn (khuyến nghị có để tăng thứ hạng trên Store)

- [ ] **Small promo tile — 440×280 PNG hoặc JPG** *(tùy chọn — khuyến nghị có)*
  Tile quảng bá nhỏ, hiển thị trong các trang danh mục Store. Có ảnh này giúp extension được xếp hạng tốt hơn. Nên bao gồm logo, tên extension, và tagline ngắn.

### Ảnh tùy chọn (không bắt buộc)

- [ ] **Marquee — 1400×560 PNG hoặc JPG** *(tùy chọn)*
  Banner lớn, chỉ được dùng khi extension được Google feature trên trang chủ Store hoặc trang danh mục nổi bật. Có thể chuẩn bị sau khi đã publish.

---

## Ghi chú cuối

- Sau khi publish, ghi lại **Extension ID** (dạng `aabbccdd...`) và **Store URL** vào backlog claim `backlog/MAIN/US-008.md` (trường `release:`).
- Nếu cần cập nhật listing (sửa description, thêm ảnh) mà không release version mới: vào Dashboard → Edit listing → Save draft → Submit for review (listing thay đổi cũng cần review).
