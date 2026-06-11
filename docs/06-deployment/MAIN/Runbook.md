---
version: "1.2.0"
date: "2026-06-11T17:11:45Z"
author: release-manager
status: Draft
epic: MAIN
---

# Runbook — Mermaid Preview for Google Chat (MV3 Extension)

| Service | Owner team | On-call | Last updated |
|---|---|---|---|
| Mermaid Preview for Google Chat | TuanNV | famaxlevel1997@gmail.com | `2026-06-11T17:11:45Z` |

## 1. Overview

- **Mục đích:** Hướng dẫn cài đặt, smoke-test, theo dõi, xử lý sự cố và rollback cho Chrome Extension "Mermaid Preview for Google Chat" v1.2.0 trên môi trường production (trình duyệt Chrome của người dùng).
- **Mô tả service:** Extension Chrome MV3 inject content-script vào `https://chat.google.com/*`, phát hiện code block Mermaid, render thành SVG inline, hỗ trợ toggle preview/source, xử lý tin nhắn tải động qua MutationObserver, và overlay fullscreen-zoom với zoom in/out + drag-to-pan (US-006). Không có server hay backend; distribution là thư mục `dist/` (load unpacked) hoặc file zip cho Chrome Web Store.
- **Kiến trúc / phụ thuộc:** Không có backend. Phụ thuộc: Chrome ≥ 109 (MV3 support), `chat.google.com`. Xem ADR-MAIN-001 đến ADR-MAIN-007 tại `docs/03-design/adr/`.

## 2. Prerequisites

- **Quyền truy cập:** Tài khoản Google để đăng nhập `chat.google.com`. Không cần VPN hay credentials đặc biệt.
- **Công cụ:**
  - Node.js ≥ 20 + npm (để build — xem `package.json` `engines.node`)
  - Google Chrome ≥ 109
  - Quyền bật Developer Mode trên `chrome://extensions`
  - Source code repository (branch `main`, commit release đã merge đủ 6 stories)

## 3. Procedures

### 3.1 Build và cài đặt (Deploy lần đầu / cập nhật)

Build sử dụng Vite với hai target riêng biệt (`content` và `background`), cộng copy manifest:

1. Checkout branch `main` tại commit release:
   ```
   git checkout main
   git pull origin main
   ```
2. Cài dependencies và build:
   ```
   npm ci
   npm run build
   ```
   Script `build` chạy tuần tự: `clean` → `build:content` → `build:background` → `copy:manifest`. Kết quả: thư mục `dist/` chứa `manifest.json`, `content.js`, `background.js`.
3. Mở Chrome, truy cập `chrome://extensions`.
4. Bật **Developer mode** (góc trên phải).
5. Nhấn **Load unpacked** → chọn thư mục `dist/`.
6. Extension xuất hiện trong danh sách với tên "Mermaid Preview for Google Chat".

**Validation:** Extension card hiển thị không có lỗi; icon extension xuất hiện trên toolbar.

> **Lưu ý Chrome Web Store:** Để publish lên Store, zip toàn bộ nội dung thư mục `dist/` (không có script `zip` hay `package` riêng trong `package.json`). Bước này là thủ công sau khi human phê duyệt Go/No-Go và thực hiện smoke test.

### 3.2 Smoke Test thủ công trên chat.google.com (BẮT BUỘC trước production)

> Thực hiện toàn bộ checklist này sau mỗi lần deploy/reload extension. Các bước đánh dấu **[US-006 smoke]** là bổ sung cho v1.2.0 và phải hoàn thành để đóng hai manual-pending test case (TC-04 bước 7, TC-07 bước 7).

**Smoke test cơ bản (US-001 → US-005, kế thừa từ v1.1.0):**

1. Mở `https://chat.google.com` bằng Chrome đã load extension.
2. Mở DevTools Console (F12), kiểm tra không có lỗi uncaught từ content-script.
3. Gửi (hoặc nhờ người khác gửi) một tin nhắn chứa code block Mermaid, ví dụ:
   ````
   ```mermaid
   graph TD; A-->B; B-->C;
   ```
   ````
4. Xác nhận: sơ đồ SVG render inline ngay dưới/cạnh code block, không vỡ layout chat.
5. Nhấn nút toggle (Preview ↔ Source): chuyển sang hiển thị mã gốc, rồi nhấn lại để quay về SVG — không render lại từ đầu.
6. Cuộn xuống để tải thêm tin nhắn cũ (hoặc chờ tin nhắn mới đến): các block Mermaid trong tin nhắn mới cũng được tự render (MutationObserver).
7. Gửi một code block Mermaid có syntax sai (ví dụ `graph TD; A-->`) → xác nhận fallback hiển thị mã gốc, không crash.

**Smoke test US-006 zoom overlay [US-006 smoke] (BẮT BUỘC để đóng TC-04 và TC-07):**

8. Xác nhận nút "Zoom" xuất hiện cạnh nút toggle trên mỗi sơ đồ đã render (không xuất hiện trên block lỗi).
9. Bấm nút "Zoom": overlay full-viewport xuất hiện chứa bản clone SVG. Xác nhận SVG gốc trong tin nhắn vẫn còn (không bị di chuyển).
10. **[TC-04 bước 7 — manual]** Kéo SVG bên trong overlay: SVG di chuyển theo con trỏ mượt mà (drag-to-pan). Dùng nút "+" / "−" và con lăn chuột để zoom in/out — scale thay đổi đúng hướng.
11. Nhấn Esc → overlay đóng, focus trả về nút Zoom. Mở lại → đóng bằng click backdrop (vùng ngoài SVG) → đóng bằng nút "✕" — cả ba đường đóng hoạt động.
12. Mở DevTools → tab "Event Listeners" trên `document` → xác nhận không còn `keydown` listener nào từ extension sau khi overlay đóng (không rò rỉ listener).
13. **[TC-07 bước 7 — manual]** Đổi theme Chat (light ↔ dark) để kích hoạt `resetPreviews`: xác nhận sơ đồ reset và render lại theo theme mới, nút Zoom biến mất cùng preview container, và overlay (nếu đang mở) đóng an toàn không có lỗi console.

**Validation:** Tất cả 13 bước trên đều pass → smoke test đạt.

### 3.3 Cập nhật extension (phiên bản mới)

1. Thực hiện lại bước build (mục 3.1, bước 1–2).
2. Trên `chrome://extensions`, nhấn biểu tượng **reload** (↺) của extension, hoặc nhấn **Update** nếu load unpacked từ cùng thư mục `dist/`.
3. Thực hiện lại smoke test (mục 3.2).

## 4. Monitoring & Alerts

| Alert | Ý nghĩa | Hành động |
|---|---|---|
| Lỗi uncaught trong Console khi mở Google Chat | Content-script crash hoặc xung đột DOM | Xem mục 5; nếu không tự khắc phục, rollback (mục 7) |
| SVG không hiển thị dù có code block Mermaid | Selector DOM thay đổi, Google Chat update layout | Kiểm tra Console; xem mục 5 |
| Nút Zoom không xuất hiện dù SVG đã render | `attachZoom` không chạy hoặc lỗi trong zoom.ts | Kiểm tra Console; xem mục 5 |
| Overlay mở không đóng được (Esc / backdrop / X không phản hồi) | Listener registration lỗi hoặc z-index conflict | Reload trang; nếu tái hiện, mở issue |
| Extension bị vô hiệu hoá tự động bởi Chrome | Lỗi manifest hoặc content-script vi phạm MV3 policy | Kiểm tra `chrome://extensions` → chi tiết lỗi; xem mục 5 |

> Không có hệ thống alert tự động. Theo dõi thủ công qua DevTools Console và `chrome://extensions`.

## 5. Common Issues / Troubleshooting

| Triệu chứng | Nguyên nhân khả năng | Cách xử lý |
|---|---|---|
| Extension không xuất hiện sau khi load | Thư mục `dist/` thiếu file hoặc `manifest.json` lỗi | Chạy lại `npm run build`; kiểm tra output không có lỗi build |
| SVG không render, Console báo lỗi Mermaid | Mermaid parse lỗi (syntax sai) | Kiểm tra code block; fallback sẽ hiển thị mã gốc — đây là hành vi mong đợi |
| Toggle không phản hồi | DOM đã bị Google Chat rebuild | Reload trang; nếu tái hiện, mở issue |
| Tin nhắn mới không tự render | MutationObserver bị ngắt kết nối | Reload trang hoặc reload extension; nếu tái hiện, mở issue |
| Nút Zoom không xuất hiện trên block đã render | `attachZoom` không được gọi hoặc `HANDLED_ATTR` gate chặn nhầm | Reload trang; kiểm tra Console; nếu tái hiện, mở issue |
| Overlay mở rồi không đóng được | Lỗi listener registration trong overlay closure | Reload trang (tab reload); nếu tái hiện, rollback |
| `content.js` quá lớn, tải chậm | Mermaid bundle eagerly theo ADR-MAIN-003 | Đây là đánh đổi có chủ ý; cải thiện ở phiên bản sau |

## 6. Escalation

| Cấp | Liên hệ | Khi nào |
|---|---|---|
| L1 | famaxlevel1997@gmail.com (on-call) | Sự cố không tự khắc phục sau khi reload |
| L2 | TuanNV (tech lead) | Lỗi nghiêm trọng, cần hotfix code |

## 7. Rollback

### 7.1 Quy trình rollback

**Trường hợp 1 — Vô hiệu hoá ngay lập tức (không cần phiên bản cũ):**

1. Mở `chrome://extensions`.
2. Tắt toggle của extension "Mermaid Preview for Google Chat" (disabled nhưng không xoá).
3. Reload tab `chat.google.com`.

**Validation:** Không còn SVG render, không có nút Zoom, không có lỗi từ extension trong Console.

**Trường hợp 2 — Khôi phục phiên bản trước v1.2.0 (v1.1.0 hoặc cũ hơn):**

1. Trên `chrome://extensions`, nhấn **Remove** để xoá extension hiện tại.
2. Giải nén `dist/` của phiên bản trước (từ git tag `REL-MAIN-2026-06-11` hoặc backup zip tương ứng).
3. Nhấn **Load unpacked** → chọn thư mục `dist/` của phiên bản cũ.
4. Smoke test nhanh (mục 3.2, bước 1–7; bỏ qua bước 8–13 vì v1.1.0 không có zoom).

**Trường hợp 3 — Revert git:**

1. `git revert <release-tag>` hoặc `git checkout REL-MAIN-2026-06-11 -- dist/` (để quay về v1.1.0) rồi build lại: `npm ci && npm run build`.
2. Thay thế `dist/` đã load (reload extension trên `chrome://extensions`).

> **Phạm vi rollback v1.2.0:** Rollback xoá tính năng zoom overlay (US-006). Tất cả tính năng US-001 → US-005 được bảo toàn khi roll back về v1.1.0.

### 7.2 Rollback test (để main thread đánh dấu rollback_tested=true)

Để xác nhận rollback hoạt động, thực hiện **Trường hợp 1** ở trên:

1. Load extension v1.2.0 bình thường, mở `chat.google.com`, xác nhận SVG render và nút Zoom xuất hiện.
2. Tắt toggle extension trên `chrome://extensions`.
3. Reload tab `chat.google.com`.
4. Xác nhận: không có SVG render, không có nút Zoom, không có lỗi console từ extension, giao diện Google Chat bình thường.
5. Bật lại toggle → reload tab → SVG render trở lại, nút Zoom xuất hiện.

Nếu tất cả 5 bước pass, rollback được xác nhận → main thread ghi `rollback_tested: true` trong `backlog/.gate-state.json` (qua `/sdlc:deploy` hoặc `/sdlc:gono`).
