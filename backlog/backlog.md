# Product Backlog — Mermaid Preview for Google Chat (epic: MAIN)

> Small mode — danh sách ưu tiên, sống và liên tục cập nhật. Source of truth chi tiết: các claim `backlog/MAIN/US-*.md`.

| # | ID | Story | Trạng thái | Phụ thuộc |
|---|----|-------|-----------|-----------|
| 1 | MAIN-US-001 | Scaffold MV3 extension + inject content-script vào Google Chat | Done | — |
| 2 | MAIN-US-002 | Phát hiện code block Mermaid trong tin nhắn | Done | US-001 |
| 3 | MAIN-US-003 | Render Mermaid thành SVG inline + fallback an toàn | Done | US-002 |
| 4 | MAIN-US-004 | Toggle preview/source + xử lý tin nhắn tải động | Done | US-003 |
| 5 | MAIN-US-005 | Tự động theme sáng/tối theo giao diện Google Chat | Done | US-004 |
| 6 | MAIN-US-006 | Nút zoom phóng to sơ đồ toàn màn hình (overlay) | Done | US-003, US-004 |
| 7 | MAIN-US-007 | Nút tải sơ đồ — Download PNG chất lượng cao (nền trong suốt) + SVG vector | Done | US-003, US-006 |
| 8 | MAIN-US-008 | Chrome Web Store publish readiness — v1.0.0 + brand icons + packaging | Done | US-001..007 |
| 9 | MAIN-US-009 | Mở rộng độ phủ loại sơ đồ Mermaid (tin fence + mở rộng keyword) | Done | US-002, US-003 |
| 10 | MAIN-US-010 | Sửa preview lỗi với label `<br>` và sơ đồ C4 (parse SVG bằng text/html) | Done | US-003 |
| 11 | MAIN-US-011 | Hỗ trợ thêm domain mail.google.com (Google Chat nhúng trong Gmail) | Done | US-001, US-002, US-003 |
