---
version: "1.0.0"
date: "2026-06-12T04:45:56Z"
author: release-manager
status: Draft
epic: MAIN
release_id: REL-MAIN-2026-06-12-2
---

# Deployment Plan — Chrome Web Store First Publish (v1.0.0)

**Extension:** Mermaid Preview for Google Chat
**Phiên bản công khai đầu tiên:** 1.0.0
**Release ID:** `REL-MAIN-2026-06-12-2`
**Ngày soạn:** `2026-06-12T04:45:56Z`

> Tài liệu này dành cho lần publish đầu tiên lên Chrome Web Store (CWS). Người thực hiện (operator) cần: Node.js ≥ 20, npm, tài khoản Google, và quyền truy cập Chrome Web Store Developer Dashboard.

---

## Điều kiện tiên quyết (Pre-flight)

- [ ] Gate 5 đã PASS: 181 tests pass, ≥ 80% branch coverage, 0 critical / 0 major defect.
- [ ] `public/manifest.json` version = `1.0.0`, có trường `icons` trỏ đúng 3 file PNG (16/48/128).
- [ ] `package.json` version = `1.0.0`, có script `package`.
- [ ] Rollback được tài liệu hoá (Runbook §7).
- [ ] **Human Go/No-Go đã được phê duyệt** (BƯỚC BẮT BUỘC — xem Release-Notes AWAITING GO/NO-GO).

---

## Bước 1 — Đăng ký tài khoản Chrome Web Store Developer

**Hành động:**
1. Truy cập [https://chrome.google.com/webstore/devconsole](https://chrome.google.com/webstore/devconsole) bằng tài khoản Google.
2. Chấp nhận Developer Agreement.
3. Thanh toán **phí đăng ký một lần ~$5 USD** (bắt buộc, không hoàn lại).
4. Tài khoản được kích hoạt (thường ngay lập tức sau khi thanh toán).

**Kiểm chứng:** Sau khi đăng ký, Developer Dashboard hiển thị "Items" với trạng thái "No items". Không còn thông báo yêu cầu đăng ký.

---

## Bước 2 — Build và đóng gói extension

**Hành động:**
```
# Đảm bảo đang ở branch main, commit release đã merge
git checkout main
git pull origin main

# Xác nhận version trước khi build
node -e "console.log(require('./package.json').version)"
# Kết quả phải là: 1.0.0

node -e "console.log(require('./public/manifest.json').version)"
# Kết quả phải là: 1.0.0

# Build và đóng gói
npm ci
npm run package
```

Script `npm run package` sẽ: build (`npm run build`) → copy `public/icons/*.png` vào `dist/icons/` → tạo file zip từ nội dung `dist/` (không lồng thư mục `dist/`).

**Kiểm chứng:**
- File `mermaid-preview-google-chat-v1.0.0.zip` tồn tại ở gốc project.
- Giải nén kiểm tra: zip phải chứa `manifest.json`, `content.js`, `background.js`, `icons/16.png`, `icons/48.png`, `icons/128.png` ở gốc (không có thư mục `dist/` bọc ngoài).
- `manifest.json` trong zip có `"version": "1.0.0"` và trường `"icons"`.
- Kích thước zip << 2 GB.

---

## Bước 3 — Tạo item mới trên Developer Dashboard và upload zip

**Hành động:**
1. Mở [https://chrome.google.com/webstore/devconsole](https://chrome.google.com/webstore/devconsole).
2. Nhấn **"New Item"**.
3. Kéo thả hoặc chọn file `mermaid-preview-google-chat-v1.0.0.zip` → nhấn **Upload**.
4. Dashboard phân tích manifest và tạo item với tên từ `manifest.json`.

**Kiểm chứng:** Item xuất hiện trong Dashboard với tên "Mermaid Preview for Google Chat", version "1.0.0", trạng thái "Draft". Không có lỗi parse manifest hay lỗi về icon thiếu.

---

## Bước 4 — Điền Store Listing

**Hành động:** Trong tab **"Store Listing"** của item:

| Trường | Giá trị |
|---|---|
| **Name** | Mermaid Preview for Google Chat |
| **Summary** | Render sơ đồ Mermaid inline trong Google Chat — toggle, zoom toàn màn hình, tải PNG/SVG. |
| **Detailed description** | Xem bản nháp đầy đủ trong `docs/06-deployment/MAIN/Store-Listing.md` |
| **Category** | Productivity |
| **Language** | Tiếng Việt (vi) — thêm English (en) nếu muốn tiếp cận rộng hơn |

**Kiểm chứng:** Không có trường bắt buộc nào bị bỏ trống. Summary ≤ 132 ký tự. Detailed description mô tả đúng chức năng extension.

---

## Bước 5 — Điền tab Privacy

**Hành động:** Trong tab **"Privacy practices"**:

1. **Single purpose statement:** "Extension phát hiện và render code block Mermaid trong Google Chat thành sơ đồ SVG inline."
2. **Permission justification — Host match `https://chat.google.com/*`:**
   Content-script cần quyền truy cập trang `https://chat.google.com/*` để đọc DOM và phát hiện code block Mermaid, render SVG inline, gắn MutationObserver theo dõi tin nhắn mới. Extension không truy cập bất kỳ trang nào khác ngoài Google Chat.
3. **Data usage disclosure:**
   - Extension **không thu thập** bất kỳ dữ liệu người dùng nào.
   - Extension **không lưu trữ** dữ liệu ra ngoài tab (không dùng `storage` API).
   - Extension **không truyền** dữ liệu đến server nào.
   - Toàn bộ xử lý là client-side trong tab trình duyệt.
   - Không có remote code execution.

**Kiểm chứng:** Tất cả trường Privacy bắt buộc được điền. Dashboard không còn cảnh báo về justification thiếu.

---

## Bước 6 — Upload ảnh bắt buộc lên Developer Dashboard

> **LƯU Ý QUAN TRỌNG:** Tất cả ảnh upload trực tiếp trên Developer Dashboard — KHÔNG bundle trong file zip.

**Hành động — upload từng loại ảnh:**

| Loại ảnh | Kích thước | Bắt buộc? | Ghi chú |
|---|---|---|---|
| **Store icon** | 128×128 PNG | **Bắt buộc** | Icon đại diện extension trên Store |
| **Screenshot** | 1280×800 hoặc 640×400 PNG/JPG | **Bắt buộc** (≥ 1, tối đa 5) | Ảnh chụp màn hình extension đang hoạt động trong Google Chat |
| **Small promo tile** | 440×280 PNG/JPG | Tùy chọn (khuyến nghị) | Tăng khả năng hiển thị trên Store |
| **Marquee** | 1400×560 PNG/JPG | Tùy chọn | Banner lớn, dùng khi được feature |

Xem checklist ảnh đầy đủ và hướng dẫn nội dung tại `docs/06-deployment/MAIN/Store-Listing.md`.

**Kiểm chứng:** Dashboard hiển thị ảnh preview đúng, không có cảnh báo "required image missing". Ít nhất 1 screenshot và store icon 128×128 đã được upload.

---

## Bước 7 — Submit for review

**Hành động:**
1. Xem lại toàn bộ preview Store Listing — kiểm tra title, summary, description, ảnh.
2. Xác nhận Privacy tab không còn cảnh báo.
3. Nhấn **"Submit for review"**.

**Kiểm chứng:** Dashboard hiển thị trạng thái item chuyển sang "Pending review" hoặc "In review". Nhận email xác nhận từ Google về việc submit thành công.

> **Lưu ý thời gian:** Review thường mất **từ vài giờ đến vài ngày làm việc**. Sau khi review pass, có **30 ngày** để publish trước khi cần submit lại. Không publish tự động — cần bước tiếp theo.

---

## Bước 8 — Sau khi review pass → Publish

**Hành động:**
1. Nhận thông báo email "Your item has been approved".
2. Truy cập Developer Dashboard → item "Mermaid Preview for Google Chat".
3. Kiểm tra lại Store Listing lần cuối.
4. Nhấn **"Publish"** để đưa extension lên Store công khai.

**Kiểm chứng:**
- Trạng thái item chuyển sang "Published".
- Extension xuất hiện trên Chrome Web Store tại URL dạng `https://chrome.google.com/webstore/detail/mermaid-preview-for-googl/<extension-id>`.
- Người dùng có thể tìm kiếm và cài đặt mà không cần Developer Mode.
- Ghi lại extension ID và Store URL vào `backlog/MAIN/US-008.md` (trường `release:`).

---

## Post-deploy Checklist

- [ ] Extension xuất hiện trên Store với đúng tên và version 1.0.0.
- [ ] Cài extension từ Store (không dùng load-unpacked) và chạy smoke test (Runbook §3.2).
- [ ] Ghi lại extension ID và Store URL.
- [ ] Thông báo cho người dùng / stakeholders.
- [ ] Handoff sang SRE/maintainer cho Operations.
