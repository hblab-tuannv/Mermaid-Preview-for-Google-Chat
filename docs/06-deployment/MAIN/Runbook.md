---
version: "1.0.0"
date: "2026-06-12T04:45:56Z"
author: release-manager
status: Draft
epic: MAIN
---

# Runbook — Mermaid Preview for Google Chat (MV3 Extension)

| Service | Owner team | On-call | Last updated |
|---|---|---|---|
| Mermaid Preview for Google Chat | TuanNV | famaxlevel1997@gmail.com | `2026-06-12T04:45:56Z` |

## 1. Overview

- **Mục đích:** Hướng dẫn cài đặt, smoke-test, theo dõi, xử lý sự cố và rollback cho Chrome Extension "Mermaid Preview for Google Chat" v1.0.0 (phiên bản công khai đầu tiên trên Chrome Web Store) trên môi trường production (trình duyệt Chrome của người dùng).
- **Mô tả service:** Extension Chrome MV3 inject content-script vào `https://chat.google.com/*`, phát hiện code block Mermaid, render thành SVG inline, hỗ trợ toggle preview/source, xử lý tin nhắn tải động qua MutationObserver, overlay fullscreen-zoom với zoom in/out + drag-to-pan (US-006), và nút tải sơ đồ PNG/SVG (US-007): SVG vector lossless mọi loại diagram; PNG best-effort (sequence/class/state/er) + auto-fallback SVG khi canvas tainted (flowchart). Không có server hay backend; distribution là Chrome Web Store (v1.0.0 — phiên bản công khai) hoặc load-unpacked từ thư mục `dist/` (dev/testing).
- **Kiến trúc / phụ thuộc:** Không có backend. Phụ thuộc: Chrome ≥ 110 (MV3 support), `chat.google.com`. Xem ADR-MAIN-001 đến ADR-MAIN-008 tại `docs/03-design/adr/`.

## 2. Prerequisites

- **Quyền truy cập:** Tài khoản Google để đăng nhập `chat.google.com`. Không cần VPN hay credentials đặc biệt.
- **Công cụ:**
  - Node.js ≥ 20 + npm (để build — xem `package.json` `engines.node`)
  - Google Chrome ≥ 110
  - Quyền bật Developer Mode trên `chrome://extensions` (chỉ cần cho load-unpacked / dev)
  - Source code repository (branch `main`, commit release đã merge đủ 8 stories US-001..US-008)

## 3. Procedures

### 3.1 Build và cài đặt

**3.1.1 Cài đặt từ Chrome Web Store (người dùng cuối — khuyến nghị)**

Từ phiên bản công khai v1.0.0, cách cài đặt được khuyến nghị là từ Chrome Web Store:

1. Truy cập trang extension trên Chrome Web Store (URL được ghi trong `backlog/MAIN/US-008.md` trường `release:` sau khi publish).
2. Nhấn **"Add to Chrome"** → xác nhận permission.
3. Extension xuất hiện trong `chrome://extensions` với version `1.0.0`.

**Không cần Developer Mode** khi cài từ Store. Cập nhật tự động do Chrome quản lý.

> Để publish lần đầu hoặc submit phiên bản mới lên Store, xem quy trình chi tiết tại `docs/06-deployment/MAIN/Deployment-Plan-CWS.md`.

**3.1.2 Build và load-unpacked (dev / testing / CI)**

Dùng khi cần test local hoặc chưa có phiên bản Store:

1. Checkout branch `main` tại commit release:
   ```
   git checkout main
   git pull origin main
   ```
2. Xác nhận version đúng trước khi build:
   ```
   node -e "console.log(require('./package.json').version)"
   ```
   Kết quả phải là `1.0.0`.
3. Cài dependencies và build:
   ```
   npm ci
   npm run build
   ```
   Script `build` chạy tuần tự: `clean` → `build:content` → `build:background` → `copy:manifest` → copy icons vào `dist/icons/`. Kết quả: thư mục `dist/` chứa `manifest.json`, `content.js`, `background.js`, `icons/{16,48,128}.png`.
4. Xác nhận version trong dist:
   ```
   node -e "console.log(require('./dist/manifest.json').version)"
   ```
   Kết quả phải là `1.0.0`.
5. Mở Chrome, truy cập `chrome://extensions`.
6. Bật **Developer mode** (góc trên phải).
7. Nếu đã có extension cũ: nhấn biểu tượng **reload** (↺).
8. Nếu cài mới: nhấn **Load unpacked** → chọn thư mục `dist/`.
9. Extension xuất hiện với tên "Mermaid Preview for Google Chat" và version `1.0.0`.

**Validation:** Extension card hiển thị không có lỗi; version hiển thị là 1.0.0.

### 3.2 Smoke Test thủ công trên chat.google.com (BẮT BUỘC trước production)

> Thực hiện toàn bộ checklist này sau mỗi lần deploy/reload extension. Các bước đánh dấu **[US-007 smoke]** là bổ sung cho v1.0.0 (tương đương internal v1.3.0).

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

**Validation:** Tất cả 18 bước trên đều pass → smoke test v1.0.0 đạt.

### 3.3 Cập nhật extension (phiên bản mới)

**Từ Chrome Web Store:** Chrome tự động cập nhật (có thể mất vài giờ sau khi phiên bản mới được publish). Để buộc cập nhật ngay: `chrome://extensions` → nhấn nút **"Update"** (biểu tượng mũi tên tròn ở góc trên).

**Từ load-unpacked (dev):** Thực hiện lại bước build (mục 3.1.2), rồi trên `chrome://extensions` nhấn biểu tượng **reload** (↺). Thực hiện lại smoke test (mục 3.2).

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

> **Phân biệt hai ngữ cảnh:** Rollback cho **load-unpacked (dev)** và rollback cho **Chrome Web Store (production)** có cơ chế hoàn toàn khác nhau. Đọc đúng mục theo ngữ cảnh bạn đang dùng.

---

### 7A. Rollback — Load-Unpacked (Dev / Testing)

Áp dụng khi extension được cài qua **Developer Mode / Load unpacked** (không phải từ Chrome Web Store).

**Trường hợp 1 — Vô hiệu hoá ngay lập tức (không cần phiên bản cũ):**

1. Mở `chrome://extensions`.
2. Tắt toggle của extension "Mermaid Preview for Google Chat" (disabled nhưng không xoá).
3. Reload tab `chat.google.com`.

**Validation:** Không còn SVG render, không có nút Download/Zoom, không có lỗi từ extension trong Console.

**Trường hợp 2 — Khôi phục phiên bản dev trước (load-unpacked):**

1. Trên `chrome://extensions`, nhấn **Remove** để xoá extension hiện tại.
2. Checkout commit tương ứng với tag git mong muốn, ví dụ tag nội bộ `REL-MAIN-2026-06-12-1` (internal v1.3.0):
   ```
   git checkout REL-MAIN-2026-06-12-1
   npm ci
   npm run build
   ```
3. Nhấn **Load unpacked** → chọn thư mục `dist/` vừa build.
4. Smoke test nhanh (mục 3.2).

**Validation:** Extension card hiển thị version của tag đã checkout; chức năng hoạt động đúng như kỳ vọng của phiên bản đó.

**Trường hợp 3 — Revert git và rebuild:**

```
git revert <merge-commit-cần-revert>
npm ci
npm run build
```

Thay thế `dist/` đã load (reload extension trên `chrome://extensions`). Smoke test nhanh.

---

### 7B. Rollback — Chrome Web Store (Production)

Áp dụng khi extension được phân phối qua **Chrome Web Store** (người dùng cài từ Store).

> **QUAN TRỌNG:** v1.0.0 là **phiên bản công khai đầu tiên** — không có phiên bản Store trước đó để "roll back về". Không thể dùng git tag để rollback trên Store. Các phương án dưới đây là tất cả những gì có thể làm.

**Phương án A — Unpublish / Disable item trên Developer Dashboard (áp dụng khi cần dừng phân phối ngay):**

1. Đăng nhập [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole).
2. Chọn item "Mermaid Preview for Google Chat".
3. Nhấn **"Unpublish"** hoặc chuyển trạng thái item sang **Unlisted / Disabled**.
4. Sau khi unpublish: người dùng mới không thể tìm/cài từ Store. Người dùng đã cài: extension vẫn còn trên máy họ cho đến khi họ tự gỡ.
5. Thông báo cho người dùng hiện có (nếu có kênh liên lạc) về việc tạm dừng và hướng dẫn tắt extension thủ công trên `chrome://extensions`.

**Validation:** Item không còn xuất hiện khi tìm kiếm trên Chrome Web Store (sau một thời gian propagation). Dashboard hiển thị trạng thái "Unpublished" hoặc tương đương.

**Phương án B — Hotfix: push phiên bản mới cao hơn (áp dụng khi có fix sẵn sàng):**

> Đây là cách duy nhất để "rollback" chức năng cho người dùng đã cài — bằng cách push một phiên bản mới cao hơn (ví dụ `1.0.1`) chứa fix. Chrome Web Store **không cho phép** upload lại cùng version number.

1. Tạo branch hotfix từ `main`:
   ```
   git checkout -b hotfix/1.0.1 main
   ```
2. Apply fix (revert commit hoặc patch cụ thể).
3. Bump version lên `1.0.1` trong `package.json` và `public/manifest.json`.
4. Build và đóng gói:
   ```
   npm ci
   npm run package
   ```
   → tạo `mermaid-preview-google-chat-v1.0.1.zip`.
5. Trên Developer Dashboard: nhấn **"Upload new package"** → upload zip v1.0.1.
6. Xem lại Store Listing nếu cần (ghi chú về hotfix).
7. Submit for review → sau khi pass → Publish.
8. Chrome tự động cập nhật extension cho người dùng hiện có (có thể mất vài giờ).

**Validation:** Dashboard hiển thị version `1.0.1` Published. Người dùng nhận cập nhật tự động và extension hoạt động đúng với phiên bản đã fix.

> **Lưu ý:** Không có phương án "roll back về git tag" cho Store. Mọi thay đổi production Store đều phải đi qua một version number mới và qua review của Google.

---

### 7.2 Rollback test (để main thread đánh dấu rollback_tested=true)

Để xác nhận rollback hoạt động trong ngữ cảnh **load-unpacked** (dev path), thực hiện **Trường hợp 1** của mục 7A:

1. Load extension v1.0.0 bình thường, mở `chat.google.com`, xác nhận SVG render, nút Zoom xuất hiện, và nút PNG/SVG xuất hiện trên diagram render thành công.
2. Tắt toggle extension trên `chrome://extensions`.
3. Reload tab `chat.google.com`.
4. Xác nhận: không có SVG render, không có nút Zoom, không có nút PNG/SVG, không có lỗi console từ extension, giao diện Google Chat bình thường.
5. Bật lại toggle → reload tab → SVG render trở lại, nút Zoom và nút PNG/SVG xuất hiện.

Nếu tất cả 5 bước pass, rollback được xác nhận → main thread ghi `rollback_tested: true` trong `backlog/.gate-state.json` (qua `/sdlc:deploy` hoặc `/sdlc:gono`).

Đối với **Store rollback** (Phương án A — Unpublish): xác nhận bằng cách kiểm tra item không còn xuất hiện trên Store sau khi unpublish. Phương án B (hotfix) được xác nhận khi version mới Published và người dùng nhận cập nhật.
