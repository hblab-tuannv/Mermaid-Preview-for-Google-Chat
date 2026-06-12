---
version: "1.3.0"
date: "2026-06-12T03:19:55Z"
author: release-manager
status: Draft
epic: MAIN
---

# Runbook — Mermaid Preview for Google Chat (MV3 Extension)

| Service | Owner team | On-call | Last updated |
|---|---|---|---|
| Mermaid Preview for Google Chat | TuanNV | famaxlevel1997@gmail.com | `2026-06-12T03:19:55Z` |

## 1. Overview

- **Mục đích:** Hướng dẫn cài đặt, smoke-test, theo dõi, xử lý sự cố và rollback cho Chrome Extension "Mermaid Preview for Google Chat" v1.3.0 trên môi trường production (trình duyệt Chrome của người dùng).
- **Mô tả service:** Extension Chrome MV3 inject content-script vào `https://chat.google.com/*`, phát hiện code block Mermaid, render thành SVG inline, hỗ trợ toggle preview/source, xử lý tin nhắn tải động qua MutationObserver, overlay fullscreen-zoom với zoom in/out + drag-to-pan (US-006), và nút tải sơ đồ PNG/SVG (US-007): SVG vector lossless mọi loại diagram; PNG best-effort (sequence/class/state/er) + auto-fallback SVG khi canvas tainted (flowchart). Không có server hay backend; distribution là thư mục `dist/` (load unpacked) hoặc file zip cho Chrome Web Store.
- **Kiến trúc / phụ thuộc:** Không có backend. Phụ thuộc: Chrome ≥ 110 (MV3 support), `chat.google.com`. Xem ADR-MAIN-001 đến ADR-MAIN-008 tại `docs/03-design/adr/`.

## 2. Prerequisites

- **Quyền truy cập:** Tài khoản Google để đăng nhập `chat.google.com`. Không cần VPN hay credentials đặc biệt.
- **Công cụ:**
  - Node.js ≥ 20 + npm (để build — xem `package.json` `engines.node`)
  - Google Chrome ≥ 110
  - Quyền bật Developer Mode trên `chrome://extensions`
  - Source code repository (branch `main`, commit release đã merge đủ 7 stories US-001..US-007)

## 3. Procedures

### 3.1 Build và cài đặt (Deploy lần đầu / cập nhật lên v1.3.0)

Build sử dụng Vite với hai target riêng biệt (`content` và `background`), cộng copy manifest:

1. Checkout branch `main` tại commit release v1.3.0:
   ```
   git checkout main
   git pull origin main
   ```
2. Xác nhận version đúng trước khi build:
   ```
   node -e "console.log(require('./package.json').version)"
   ```
   Kết quả phải là `1.3.0`. Nếu không, dừng và kiểm tra branch/commit.
3. Cài dependencies và build:
   ```
   npm ci
   npm run build
   ```
   Script `build` chạy tuần tự: `clean` → `build:content` → `build:background` → `copy:manifest`. Kết quả: thư mục `dist/` chứa `manifest.json` (version `1.3.0`), `content.js`, `background.js`.
4. Xác nhận version trong dist:
   ```
   node -e "console.log(require('./dist/manifest.json').version)"
   ```
   Kết quả phải là `1.3.0`.
5. Mở Chrome, truy cập `chrome://extensions`.
6. Bật **Developer mode** (góc trên phải).
7. Nếu đã có extension cũ: nhấn biểu tượng **reload** (↺) của extension (nếu load unpacked từ cùng thư mục `dist/`), hoặc **Remove** rồi **Load unpacked** lại.
8. Nếu cài mới: nhấn **Load unpacked** → chọn thư mục `dist/`.
9. Extension xuất hiện trong danh sách với tên "Mermaid Preview for Google Chat" và version `1.3.0`.

**Validation:** Extension card hiển thị không có lỗi; icon extension xuất hiện trên toolbar; version hiển thị là 1.3.0.

> **Lưu ý Chrome Web Store:** Để publish lên Store, zip toàn bộ nội dung thư mục `dist/` (không có script `zip` hay `package` riêng trong `package.json`). Bước này là thủ công sau khi human phê duyệt Go/No-Go và hoàn thành smoke test.

### 3.2 Smoke Test thủ công trên chat.google.com (BẮT BUỘC trước production)

> Thực hiện toàn bộ checklist này sau mỗi lần deploy/reload extension. Các bước đánh dấu **[US-007 smoke]** là bổ sung cho v1.3.0.

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

**Smoke test US-006 zoom overlay [US-006 smoke]:**

8. Xác nhận nút "Zoom" xuất hiện cạnh nút toggle trên mỗi sơ đồ đã render (không xuất hiện trên block lỗi).
9. Bấm nút "Zoom": overlay full-viewport xuất hiện chứa bản clone SVG. Xác nhận SVG gốc trong tin nhắn vẫn còn (không bị di chuyển).
10. **[TC-04 bước 7 — manual]** Kéo SVG bên trong overlay: SVG di chuyển theo con trỏ mượt mà (drag-to-pan). Dùng nút "+" / "−" và con lăn chuột để zoom in/out — scale thay đổi đúng hướng.
11. Nhấn Esc → overlay đóng, focus trả về nút Zoom. Mở lại → đóng bằng click backdrop (vùng ngoài SVG) → đóng bằng nút "✕" — cả ba đường đóng hoạt động.
12. Mở DevTools → tab "Event Listeners" trên `document` → xác nhận không còn `keydown` listener nào từ extension sau khi overlay đóng (không rò rỉ listener).
13. **[TC-07 bước 7 — manual]** Đổi theme Chat (light ↔ dark) để kích hoạt `resetPreviews`: xác nhận sơ đồ reset và render lại theo theme mới, nút Zoom biến mất cùng preview container, và overlay (nếu đang mở) đóng an toàn không có lỗi console.

**Smoke test US-007 download buttons [US-007 smoke] (BẮT BUỘC để đóng ADR-MAIN-008 smoke gate):**

14. Xác nhận hai nút "PNG" và "SVG" xuất hiện cạnh nút Zoom và Toggle trên mỗi sơ đồ đã render thành công (không xuất hiện trên block lỗi). Container có attribute `data-mermaid-download`.
15. **[AC-4, AC-3 SVG path]** Bấm nút "SVG" trên một sơ đồ bất kỳ → file `mermaid-diagram-<n>.svg` được tải (kiểm tra tên file, kích thước > 0). Mở file trong trình duyệt/editor → xác nhận là SVG vector hợp lệ, lossless. SVG gốc trong tin nhắn vẫn còn (không bị di chuyển).
16. **[AC-3, flowchart → fallback AC-3b]** Gửi một flowchart (`graph TD; A-->B; B-->C;`), render thành công. Bấm nút "PNG" → xác nhận file `mermaid-diagram-<n>.svg` được tải (không phải `.png` — fallback do canvas tainted) **VÀ** notice "Đã tải SVG thay PNG cho sơ đồ này" xuất hiện đúng một lần trên trang, không chặn UI.
17. **[AC-3, sequence → PNG thực]** Gửi một sequence diagram, ví dụ:
    ````
    ```mermaid
    sequenceDiagram
      Alice->>Bob: Hello
      Bob-->>Alice: Hi
    ```
    ````
    Bấm nút "PNG" → xác nhận file `mermaid-diagram-<n>.png` được tải (đuôi `.png`, kích thước > 0). Mở file → xác nhận PNG raster thật, nền trong suốt, chữ sắc nét.
18. **[AC-6]** Đổi theme Chat (light ↔ dark) để kích hoạt `resetPreviews` → xác nhận nút PNG và SVG bị gỡ cùng preview container (không có nút mồ côi), không ném lỗi console.

**Validation:** Tất cả 18 bước trên đều pass → smoke test v1.3.0 đạt.

### 3.3 Cập nhật extension (phiên bản mới)

1. Thực hiện lại bước build (mục 3.1, bước 1–4).
2. Trên `chrome://extensions`, nhấn biểu tượng **reload** (↺) của extension, hoặc nhấn **Update** nếu load unpacked từ cùng thư mục `dist/`.
3. Thực hiện lại smoke test (mục 3.2).

## 4. Monitoring & Alerts

| Alert | Ý nghĩa | Hành động |
|---|---|---|
| Lỗi uncaught trong Console khi mở Google Chat | Content-script crash hoặc xung đột DOM | Xem mục 5; nếu không tự khắc phục, rollback (mục 7) |
| SVG không hiển thị dù có code block Mermaid | Selector DOM thay đổi, Google Chat update layout | Kiểm tra Console; xem mục 5 |
| Nút Zoom không xuất hiện dù SVG đã render | `attachZoom` không chạy hoặc lỗi trong zoom.ts | Kiểm tra Console; xem mục 5 |
| Nút PNG/SVG không xuất hiện dù SVG đã render | `attachDownload` không chạy hoặc lỗi trong download.ts | Kiểm tra Console; xem mục 5 |
| Bấm PNG không cho ra file gì (không notice, không file) | Lỗi không xử lý được trong click handler | Reload trang; kiểm tra Console; nếu tái hiện, mở issue |
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
| Nút PNG/SVG không xuất hiện trên block đã render | `attachDownload` không được gọi hoặc `HANDLED_ATTR` gate chặn nhầm | Reload trang; kiểm tra Console; nếu tái hiện, mở issue |
| Bấm PNG trên flowchart → không nhận được file gì | Notice không hiện và không có fallback SVG — lỗi handler | Kiểm tra Console; reload trang; nếu tái hiện, rollback |
| Bấm PNG trên flowchart → nhận `.svg` + notice | Hành vi đúng (canvas tainted, auto-fallback Option A) | Không phải lỗi — đây là thiết kế; xem ADR-MAIN-008 |
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

**Validation:** Không còn SVG render, không có nút Download/Zoom, không có lỗi từ extension trong Console.

**Trường hợp 2 — Khôi phục phiên bản trước v1.3.0 (v1.2.0):**

1. Trên `chrome://extensions`, nhấn **Remove** để xoá extension hiện tại.
2. Checkout commit tương ứng với tag `REL-MAIN-2026-06-11-2` (v1.2.0):
   ```
   git checkout REL-MAIN-2026-06-11-2
   npm ci
   npm run build
   ```
3. Nhấn **Load unpacked** → chọn thư mục `dist/` vừa build.
4. Smoke test nhanh (mục 3.2, bước 1–13; bỏ qua bước 14–18 vì v1.2.0 không có download buttons).

**Validation:** Extension card hiển thị version 1.2.0; SVG render đúng; nút Zoom hoạt động; KHÔNG có nút PNG/SVG (xác nhận rollback thành công).

**Trường hợp 3 — Revert git và rebuild:**

```
git revert <merge-commit-của-US-007>
npm ci
npm run build
```

Thay thế `dist/` đã load (reload extension trên `chrome://extensions`). Smoke test nhanh (bước 1–13, bỏ qua 14–18).

> **Phạm vi rollback v1.3.0:** Rollback xoá tính năng download PNG/SVG (US-007). Tất cả tính năng US-001 → US-006 (toggle, render, MutationObserver, theme, zoom) được bảo toàn khi roll back về v1.2.0.

### 7.2 Rollback test (để main thread đánh dấu rollback_tested=true)

Để xác nhận rollback hoạt động, thực hiện **Trường hợp 1** ở trên:

1. Load extension v1.3.0 bình thường, mở `chat.google.com`, xác nhận SVG render, nút Zoom xuất hiện, và nút PNG/SVG xuất hiện trên diagram render thành công.
2. Tắt toggle extension trên `chrome://extensions`.
3. Reload tab `chat.google.com`.
4. Xác nhận: không có SVG render, không có nút Zoom, không có nút PNG/SVG, không có lỗi console từ extension, giao diện Google Chat bình thường.
5. Bật lại toggle → reload tab → SVG render trở lại, nút Zoom và nút PNG/SVG xuất hiện.

Nếu tất cả 5 bước pass, rollback được xác nhận → main thread ghi `rollback_tested: true` trong `backlog/.gate-state.json` (qua `/sdlc:deploy` hoặc `/sdlc:gono`).
