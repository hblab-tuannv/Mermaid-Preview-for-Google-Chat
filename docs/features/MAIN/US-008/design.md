---
version: "1.0"
date: "2026-06-12T04:06:20Z"
author: "architect"
status: "Accepted"
---

# Design Note — MAIN-US-008: Phát hành công khai lần đầu lên Chrome Web Store (v1.0.0)

> Phạm vi US-008 là **đóng gói (packaging) + chỉnh cosmetic (`icons`, version) + artifact tài liệu** — KHÔNG đổi logic render lõi (US-001..007). Note này chốt một quyết định kỹ thuật thật (cơ chế packaging), một sửa build-chain (copy icons), và xác định không cần ADR.

## 1. Quyết định ADR có cần không? — **KHÔNG cần ADR**

Tiêu chí ADR = quyết định **significant / expensive / hard-to-reverse**. Đối chiếu từng AC:

- **AC-1 (version reset 1.0.0), AC-2 (`icons` + bỏ `action`), AC-4/5/6 (Deployment-Plan, asset listing, Runbook §7):** thuần cosmetic / metadata / tài liệu. Không có quyết định kiến trúc, không đụng contract code, không khó đảo. → **trivial, design inline, không ADR.**
- **AC-3 (cơ chế packaging):** đây là quyết định kỹ thuật duy nhất có thật (xem §2). Nhưng nó vẫn **KHÔNG đạt ngưỡng ADR**: đổi cơ chế zip = sửa **một dòng build-script**, không có data migration, không ảnh hưởng code ship trong `dist/`, không thay đổi API/contract người dùng hay developer. Đảo ngược tầm thường (gỡ devDependency + đổi script). → fail cả ba tiêu chí (significant/expensive/hard-to-reverse).

**Kết luận:** US-008 **không tạo ADR**. `next_adr` của epic MAIN giữ nguyên ở **9** (không tiêu thụ). Trong `backlog/MAIN/US-008.md`, trường `adr` đặt **`N/A`** (kèm ghi chú), không để `TBD`.

**Gate-3 (Design) — CONDITIONAL design gate KHÔNG fire** ở small mode: gate này chỉ fire khi có ADR ghi nhận quyết định significant/hard-to-reverse. US-008 không có ADR ⇒ **không cần human design gate**; bàn giao thẳng Phase 4 (developer).

> Lưu ý phân biệt với trí nhớ kiến trúc epic MAIN: ghi chú "CONDITIONAL gate FIRES" gắn với quyết định **mô hình tương tác** (overlay/zoom/download — ADR-MAIN-007/008), KHÔNG áp cho lựa chọn công cụ build như đây.

## 2. Cơ chế packaging (AC-3) — **chọn (b): thư viện zip dev-only tối thiểu (`archiver`)**

**Yêu cầu mà cơ chế phải thoả:** `npm run package` **build trước** rồi tạo `mermaid-preview-google-chat-v1.0.0.zip` từ **nội dung** thư mục `dist/` — các entry (`manifest.json`, `content.js`, `background.js`, `icons/{16,48,128}.png`) nằm ở **gốc archive**, KHÔNG lồng dưới `dist/`; **phải giữ subdir `icons/`**; ≤ 2GB; chạy được trên mọi nền (macOS/Windows/Linux + CI tương lai — hiện chưa có `.github/workflows`).

### Lựa chọn: (b) một dev-dependency zip tối thiểu — **`archiver`**
- **Lý do quyết định (lấy thẳng từ quy ước sẵn có của repo):** `package.json` hiện làm file-op bằng **node**, KHÔNG bằng shell CLI — `clean` dùng `node -e "fs.rmSync(...)"` (không `rm -rf`), `copy:manifest` dùng `node -e "fs.copyFileSync(...)"` (không `cp`). Đây là quy ước **có chủ đích, ưu tiên cross-platform**. Thêm `zip` CLI vào đường packaging sẽ **phá quy ước** và tái nhập đúng sự mong manh Windows/CI mà tác giả đã tránh ở mọi chỗ khác. `archiver` là thư viện node thuần ⇒ đồng nhất quy ước, **tất định**, chạy được mọi nơi không phụ thuộc binary hệ thống.
- **Cơ chế (mức thiết kế — KHÔNG viết script, là việc Phase 4):** script `package` = `npm run build` rồi một bước node tạo `archiver('zip')`, ghi `dist/**` vào archive với base = `dist/` (entry ở gốc), tên file đọc `version` từ `package.json` → `mermaid-preview-google-chat-v<version>.zip`. `archiver` ghi đệ quy nên `icons/` được giữ nguyên (giải quyết bẫy `zip -j` làm phẳng mất subdir).
- **Vì sao `archiver` chứ không `adm-zip`/`jszip`:** `archiver` là chuẩn de-facto cho đóng gói build trong hệ sinh thái node, streaming (không nạp toàn bộ vào RAM), API glob/directory sẵn cho "zip nội dung thư mục ở gốc", maintenance tốt. `adm-zip`/`jszip` cũng dùng được nhưng nghiêng về thao tác zip in-memory / browser; `archiver` hợp ngữ cảnh dist→file nhất.

### Phương án bị loại
| Option | Vì sao loại |
|---|---|
| (a) `zip` CLI hệ thống (`cd dist && zip -r ../out.zip .`) | `zip` **không bảo đảm có** trên Windows / một số image CI; `zip -r -j` làm **phẳng** mất `icons/`. Phá quy ước "file-op bằng node" của repo (`clean`/`copy:manifest`). Zero-dep nhưng đánh đổi tính tất định + portability — đúng thứ repo đã tránh. |
| (c) Node built-in / tự cuộn ZIP từ `zlib` | Node **không có** trình ghi ZIP built-in (`zlib` chỉ gzip/deflate **stream**, không phải container ZIP). Tự cuộn định dạng ZIP (local headers, central directory, CRC32) dễ lỗi, không đáng so với một dev-dep nhỏ. Loại. |

## 3. Sửa build-chain: copy icons vào `dist/` trước khi zip (load-bearing)

`build` hiện chỉ chạy `copy:manifest` (chỉ copy `manifest.json`). Khi AC-2 thêm `icons` trỏ `icons/{16,48,128}.png`, nếu **không** copy `public/icons/*.png` → `dist/icons/` thì zip ship manifest trỏ file thiếu ⇒ **Chrome lỗi load / Store reject**.

**Mức thiết kế (Phase 4 hiện thực):** thêm một bước `copy:icons` theo **đúng pattern node** của `copy:manifest` — `fs.cpSync('public/icons','dist/icons',{recursive:true})` (có sẵn từ node>=20, repo đã `engines.node>=20`) — và đưa vào chuỗi `build` **trước** bước `package`. Như vậy `dist/icons/` tồn tại trước khi `archiver` đọc `dist/**`. (Không bắt buộc gộp hay tách khỏi `copy:manifest`; tách `copy:icons` riêng cho rõ ràng là gợi ý, không ràng buộc cứng.)

## 4. NFR

- **Portability / CI (NFR chính của AC-3):** `archiver` thuần node ⇒ không phụ thuộc binary `zip` hệ thống; chạy giống nhau trên macOS/Windows/Linux và CI tương lai. Test AC-3 (`npm run package` → assert zip tồn tại đúng tên, giải nén kiểm entry ở gốc) pass bất kể host. Đồng nhất quy ước "file-op bằng node" sẵn có.
- **Security / supply-chain:** `archiver` là **devDependency, KHÔNG bao giờ bundle vào `dist/`** (chỉ chạy lúc đóng gói). ⇒ bề mặt supply-chain với **người dùng cuối = 0** (không vào extension ship). Rủi ro chỉ ở môi trường build của maintainer; giảm thiểu bằng cách chọn lib phổ biến, ít phụ thuộc, bảo trì tốt. So với zero-dep (a) đánh đổi portability — chấp nhận một dev-dep nhỏ là cân bằng đúng. Không thêm permission manifest, không đổi `content_scripts.matches`, không tăng bề mặt runtime/XSS.
- **Performance:** không ảnh hưởng runtime extension (chỉ là bước build). `archiver` streaming ⇒ rẻ bộ nhớ; zip ≤ 2GB không phải ràng buộc thực tế (dist vài chục KB).
- **Determinism / reliability:** archive nội dung `dist/` cố định, entry ở gốc, `icons/` giữ subdir — kết quả lặp lại được, không phụ thuộc môi trường.

## 5. Liên kết
- Story: `docs/features/MAIN/US-008/story.md` (AC-1..AC-6)
- CR: `docs/07-operations/MAIN/Change-Request-CR-MAIN-2026-06-12-02.md`
- ADR: **N/A** (không quyết định nào đạt ngưỡng ADR — xem §1)
