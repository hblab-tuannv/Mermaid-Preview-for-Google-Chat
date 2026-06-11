---
version: "1.1.0"
date: "2026-06-11T15:25:45Z"
author: release-manager
status: Draft
release_id: REL-MAIN-2026-06-11
epic: MAIN
---

# Release Notes — Mermaid Preview for Google Chat v1.1.0

**Ngày phát hành:** `2026-06-11T15:25:45Z`

> v1.0.0 không khả dụng khi nạp thực tế (xem INC-01/INC-02); v1.1.0 là bản hoạt động đầu tiên đã xác nhận trên chat.google.com, kèm tính năng auto theme.

## Added

- **Tự động theme sáng/tối theo giao diện Google Chat** — Sơ đồ render theo theme `dark`/`default` khớp độ sáng nền thật của Chat (không bám class), và tự render lại toàn bộ khi đổi theme giữa phiên. US: `MAIN-US-005` / PR: `PR-MAIN-US-005` / ADR: `ADR-MAIN-006`

- **Scaffold MV3 extension + inject content-script vào Google Chat** — Dựng project Chrome Extension Manifest V3 (TypeScript + Vite), build ra `dist/`, load unpacked, inject content-script chạy trên `https://chat.google.com/*`. US: `MAIN-US-001` / PR: `PR-MAIN-US-001`

- **Phát hiện code block Mermaid trong tin nhắn Google Chat** — Quét DOM cửa sổ chat để nhận diện các code block chứa mã Mermaid, trích xuất source text, không nhận nhầm code block ngôn ngữ khác. US: `MAIN-US-002` / PR: `PR-MAIN-US-002`

- **Render mã Mermaid thành SVG inline với fallback an toàn** — Dùng thư viện Mermaid (`securityLevel: 'strict'`) render source đã phát hiện thành SVG chèn inline cạnh code block. Khi parse lỗi, fallback hiển thị mã gốc, không làm vỡ giao diện chat. US: `MAIN-US-003` / PR: `PR-MAIN-US-003`

- **Toggle preview/source + xử lý tin nhắn tải động** — Thêm control toggle để chuyển giữa sơ đồ SVG đã render và mã Mermaid gốc (không render lại), gắn MutationObserver để tự render các block Mermaid trong tin nhắn tải động trong phiên chat. Idempotent, không vỡ giao diện, observer tháo gỡ được. US: `MAIN-US-004` / PR: `PR-MAIN-US-004`

## Fixed

- **Chrome không nạp được `content.js` ("isn't UTF-8 encoded")** — bundle chứa ký tự non-character U+FFFF; build giờ ép output ASCII-only. INC-MAIN-2026-06-11-01 / ADR-MAIN-005.
- **Sơ đồ render trong khung soạn + message gửi không preview** — bỏ qua vùng `contenteditable`; trích source message gửi đúng (`<br>`→newline, bỏ nhãn ```mermaid). INC-MAIN-2026-06-11-02 / revise ADR-MAIN-002.

## Known Issues

- **Bundle size lớn do Mermaid được bundle eagerly:** Thư viện Mermaid được bundle trực tiếp vào `content.js` (không lazy-load) theo quyết định ADR-MAIN-003 để đơn giản hoá kiến trúc MV3. Kích thước `content.js` sẽ lớn hơn đáng kể so với không bundle. Đây là đánh đổi có chủ ý; cải thiện có thể xem xét ở phiên bản sau.

- **Hai test case cần xác nhận thủ công trên trình duyệt thật:** TC liên quan đến render SVG thực tế (US-003) và toggle/live-render trong phiên chat thật (US-004) được đánh dấu "Pass-logic, Blocked-manual" trong test spec — chưa thể tự động hoá hoàn toàn. Cần thực hiện **manual smoke test** trên `chat.google.com` trước khi đưa lên production (xem Runbook, mục 3.2).

## Upgrade Notes

Đây là phiên bản phát hành đầu tiên (v1.0.0). Không có phiên bản cũ cần nâng cấp. Cài đặt theo hướng dẫn trong Runbook (load unpacked từ `dist/`).

## Go/No-Go Decision

- **Quyết định:** **GO** — phê duyệt bởi human (product owner) ngày `2026-06-11`.
- **Cơ sở:** Test tự động xanh 50/50, coverage 100% stmt/func/line (97.87% branches), 0 defect critical/major; code review Approve cho cả 4 story.
- **⚠️ Waiver (rủi ro đã chấp nhận):** Human chọn Go **bỏ qua** manual smoke test (Runbook §3.2) và rollback test (Runbook §7.2). Do đó `rollback_tested` được giữ ở **`false`** — rollback **chưa** được kiểm chứng thực tế. Trước/ngay khi phân phối production, nên thực hiện §3.2 + §7.2 và cập nhật cờ này. Đây là quyết định có chủ ý, không phải thiếu sót quy trình.
