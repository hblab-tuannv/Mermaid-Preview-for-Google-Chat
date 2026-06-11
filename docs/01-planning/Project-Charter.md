---
version: "1.0"
date: "2026-06-11T10:16:01Z"
project_name: "Mermaid Preview for Google Chat"
project_number: "MAIN"
sponsor: "tuannv (Project Sponsor / Owner)"
project_manager: "product-owner"
status: "Approved"
managing_org: "tuannv"
---

# Project Charter — Mermaid Preview for Google Chat

## 1. Overview
Người dùng Google Chat thường chia sẻ sơ đồ dưới dạng mã Mermaid (flowchart, sequence, ERD…) trong code block, nhưng Google Chat chỉ hiển thị mã thô, không render thành hình. Dự án xây dựng một Chrome Extension (Manifest V3) tự động phát hiện các code block Mermaid trong cửa sổ chat tại `chat.google.com` và render chúng thành sơ đồ SVG ngay trong dòng tin nhắn, giúp đọc hiểu nhanh mà không phải copy mã sang công cụ ngoài.

## 2. Objectives
- Tự động phát hiện và render ≥ 95% code block Mermaid hợp lệ thành SVG inline trong Google Chat web.
- Thời gian render mỗi sơ đồ < 300ms (sơ đồ kích thước trung bình) sau khi tin nhắn xuất hiện.
- Render an toàn: Mermaid chạy ở `securityLevel: 'strict'`; sơ đồ lỗi tự fallback về hiển thị mã gốc, không bao giờ làm vỡ giao diện chat.
- Cho phép người dùng bật/tắt giữa preview và mã nguồn ở mỗi sơ đồ.
- Hoạt động với tin nhắn tải động (lazy-load / cuộn) qua MutationObserver.

## 3. Scope
**In scope:** Chrome Extension MV3 cho `chat.google.com` web; phát hiện code block Mermaid; render SVG inline; toggle preview/source; xử lý tin nhắn tải động; load dưới dạng unpacked extension.
**Out of scope:** Mobile app Google Chat; các trình duyệt không phải Chromium (Firefox/Safari); chỉnh sửa/biên tập sơ đồ; render các định dạng diagram khác Mermaid (PlantUML, Graphviz); đăng tải lên Chrome Web Store (giai đoạn sau).

## 4. Milestones, Risks & Constraints
| Milestone | Target date |
|---|---|
| Scaffold + content-script inject (US-001) | 2026-06-13T00:00:00Z |
| Phát hiện code block Mermaid (US-002) | 2026-06-16T00:00:00Z |
| Render SVG inline + fallback (US-003) | 2026-06-19T00:00:00Z |
| Toggle UI + tin nhắn tải động (US-004) | 2026-06-23T00:00:00Z |

**Key risks:** DOM của Google Chat không có API ổn định, có thể đổi cấu trúc bất kỳ lúc nào → selector dễ vỡ; CSP của trang có thể chặn inject SVG/style; Mermaid là dependency nặng, ảnh hưởng kích thước bundle.
**Constraints (budget/time/tech/legal):** Manifest V3 (cấm remote code, dùng service worker); chỉ host permission tối thiểu `https://chat.google.com/*`; toàn bộ dependency bundle lúc build; 1 developer (small mode).

## 5. Assumptions
- Người dùng dùng Google Chat trên trình duyệt Chromium desktop.
- Cấu trúc DOM của code block trong Google Chat đủ ổn định để bám selector trong vòng đời dự án.
- Mermaid (npm) có thể bundle và chạy được trong môi trường content-script MV3.

## 6. Preliminary Budget
| Item | Estimate |
|---|---|
| Công sức phát triển (4 story, small mode) | ~ 2 tuần, 1 developer |
| Chi phí hạ tầng | 0 (chạy hoàn toàn client-side) |

## 7. Project Manager Responsibility & Authority
Product-owner có quyền quyết định phạm vi story, thứ tự ưu tiên backlog, và chấp nhận story theo Definition of Done. Mọi thay đổi mở rộng phạm vi (ví dụ thêm browser, thêm loại diagram) cần ghi nhận và sponsor phê duyệt.

## 8. Stakeholders
| Stakeholder | Role | Interest |
|---|---|---|
| Người dùng Google Chat | End user | Đọc sơ đồ Mermaid nhanh ngay trong chat |
| Developer / maintainer | Builder | Code bám sát DOM, dễ bảo trì khi Google đổi giao diện |
| Sponsor | Approver | Giá trị cho team, ưu tiên đầu tư |

## 9. Approvals
| Name | Role | Signature | Date |
|---|---|---|---|
| tuannv | Sponsor | Approved (small-mode fold, Gate 2) | 2026-06-11T10:51:29Z |
