---
version: "1.0"
date: "2026-06-12T03:53:41Z"
author: "product-owner"
status: "Approved"
---

# Change Request (CR / Modification Request) — `CR-MAIN-2026-06-12-02`

| ID | Date | Requester | Priority | Status |
|---|---|---|---|---|
| CR-MAIN-2026-06-12-02 | 2026-06-12T03:53:41Z | End user (via product-owner) | High | Approved |

## 1. Description of Change
Chuẩn bị **phát hành công khai lần đầu lên Chrome Web Store** (CWS) cho extension "Mermaid Preview for Google Chat". Tất cả các bản v0.1.0 → v1.3.0 trước đây chỉ là build nội bộ / load-unpacked (SDLC per-story artifacts), **CHƯA bao giờ publish công khai**; `package.json` có `private: true` nên việc đặt lại version là vô hại.

Human đã chọn **Path B (polish rồi publish)** và quyết định **phiên bản công khai đầu tiên trên Store = 1.0.0**. Đây là change request giai đoạn vận hành (operations re-entry) sau khi 7 story MAIN-US-001..007 đã Done và release nội bộ REL-MAIN-2026-06-12-1 (v1.3.0). CR re-enter per-story loop dưới dạng story mới **MAIN-US-008**.

Phạm vi (mỗi mục được mã hoá thành AC test được trong MAIN-US-008):
- **Đặt lại version = 1.0.0** trong CẢ `public/manifest.json` VÀ `package.json`.
- Thêm trường **`icons`** (16/48/128) vào manifest, trỏ tới các PNG placeholder hợp lệ dưới `public/icons/`. **KHÔNG** thêm toolbar `action` (YAGNI — không được yêu cầu).
- **Script đóng gói** `npm run package`: build rồi tạo file zip có version từ **nội dung** thư mục `dist/` (ví dụ `mermaid-preview-google-chat-v1.0.0.zip`); icons phải được copy vào `dist/icons/` trước khi zip.
- **Quy trình publish / Deployment-Plan**: đăng ký CWS developer + đóng phí, đóng gói, upload zip, điền Store Listing và Privacy, upload ảnh bắt buộc, submit review, publish.
- **Bản nháp asset Store Listing**: tiêu đề/summary/mô tả, category, single-purpose, justification từng permission, checklist ảnh bắt buộc đúng kích thước.
- **Viết lại mục Rollback cho ngữ cảnh Store**: bản Store đầu tiên không có phiên bản công khai cũ để roll back → rollback = unpublish/disable item trên Dashboard, hoặc đẩy hotfix.

## 2. Reason / Business Justification
Extension đã hoàn thiện chức năng (US-001..007) và chạy ổn định ở dạng load-unpacked, nhưng người dùng thật **không cài được** nếu chưa lên Chrome Web Store (load-unpacked yêu cầu Developer Mode + thao tác kỹ thuật). Publish lên Store mở phân phối công khai một-click, tăng độ tin cậy (review của Google) và cho phép cập nhật tự động. Đây là bước "đưa ra thị trường" còn thiếu duy nhất; không thay đổi logic render lõi.

## 3. Maintenance Type
- [ ] Corrective  - [ ] Adaptive  - [x] Perfective  - [ ] Preventive  - [x] Additive  - [ ] Emergency

> Additive: thêm trường `icons`, script `package`, asset/quy trình publish mới. Perfective: chỉnh sửa packaging/docs/version cho đạt chuẩn Store (không thêm chức năng người dùng cuối).

## 4. Impact Analysis
| Area | Impact |
|---|---|
| Functionality | Không đổi hành vi render/toggle/zoom/theme/download. Bổ sung **icons** trong manifest (placeholder) và metadata phát hành. Không có toolbar action, không thêm permission, không đổi `content_scripts.matches` (`https://chat.google.com/*`). |
| Other systems / dependencies | Source bị chạm (gated tới khi human duyệt scope): `public/manifest.json` (version + icons), `package.json` (version + script `package`). Build chain phải copy `public/icons/*.png` → `dist/icons/` (hiện `build` chỉ copy `manifest.json`). Asset Store (ảnh 128×128, screenshot 1280×800, promo 440×280) upload trên **Developer Dashboard**, KHÔNG nằm trong zip. |
| Performance / security | Không ảnh hưởng runtime. Phí đăng ký developer một lần (~$5 USD). Privacy: khai single purpose + justify permission `https://chat.google.com/*` content-script + data-usage = không lưu/không truyền dữ liệu. Gói upload = zip nội dung `dist/`, ≤ 2GB. |
| Effort estimate | 3 SP (một story, một sprint — chủ yếu packaging + docs + asset placeholder, không có logic render mới). |

## 5. Risk Assessment
- **Store review từ chối** (Med): thiếu/không nhất quán metadata (single purpose, permission justification, mô tả mơ hồ) là nguyên nhân reject phổ biến. Giảm thiểu: AC yêu cầu bản nháp listing đầy đủ (single-purpose + justify từng permission + data-usage) trước khi submit.
- **Manifest `icons` trỏ tới file không có trong zip** (Med): nếu thêm `icons` mà không copy `public/icons/*.png` vào `dist/icons/`, Chrome báo lỗi load / Store reject. Giảm thiểu: AC-3 bắt buộc build copy icons vào `dist/icons/` trước khi zip.
- **Asset ảnh sai kích thước** (Low): screenshot/promo sai pixel bị Dashboard từ chối. Giảm thiểu: AC-5 chốt checklist kích thước chính xác (128×128 icon, 1280×800 hoặc 640×400 screenshot, 440×280 promo).
- **Hiểu nhầm rollback** (Low): bản Store đầu tiên không có version cũ để roll back. Giảm thiểu: AC-6 viết lại Runbook §7 phân biệt rollback load-unpacked với rollback Store (unpublish/disable / hotfix).

## 6. Rollback Plan
Story độc lập, additive/perfective. Rollback trong giai đoạn dev = revert PR của MAIN-US-008 (gỡ trường `icons`, script `package`, đặt version về trạng thái trước) — không có migration dữ liệu, không đổi logic render. Rollback **sau khi đã publish Store** thuộc về chính deliverable của story (AC-6): bản Store đầu tiên KHÔNG có phiên bản công khai cũ ⇒ rollback = **unpublish / disable item** trên Developer Dashboard, hoặc đẩy một **hotfix version**; KHÔNG phải checkout git tag như rollback load-unpacked.

## 7. Test Plan
Đầy đủ test plan thuộc Phase 5; ở mức CR: kiểm tra version = 1.0.0 nhất quán trong manifest + package.json + tên zip; build sinh `dist/icons/{16,48,128}.png` là PNG hợp lệ đúng kích thước và `dist/manifest.json` có trường `icons` tham chiếu đúng; `npm run package` tạo `mermaid-preview-google-chat-v1.0.0.zip` từ nội dung `dist/`; review bản nháp Store Listing + Privacy đủ trường; review Deployment-Plan publish; review Runbook §7 đã phân biệt hai loại rollback. Tiêu chí nghiệm thu = các AC của MAIN-US-008.

## 8. Approval (Change Advisory Board)
| Name | Role | Decision | Date |
|---|---|---|---|
| Human (end user) | Requester / Approver | **Approved (Gate-1 Scope + Acceptance Criteria)** | 2026-06-12T03:53:41Z |

## 9. Implementation Record
- Implemented by: TBD (developer, Phase 4 — chưa thực hiện; scope chưa được human duyệt)
- Implemented date: TBD
- Verification result: TBD — link MAIN-US-008 (docs/features/MAIN/US-008/story.md, backlog/MAIN/US-008.md).
