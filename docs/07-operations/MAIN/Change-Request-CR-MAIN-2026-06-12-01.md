---
version: "1.0"
date: "2026-06-12T01:48:29Z"
author: "product-owner"
status: "Approved"
---

# Change Request (CR / Modification Request) — `CR-MAIN-2026-06-12-01`

| ID | Date | Requester | Priority | Status |
|---|---|---|---|---|
| CR-MAIN-2026-06-12-01 | 2026-06-12T01:48:29Z | End user (via product-owner) | Med | Approved |

## 1. Description of Change
Thêm nút **Download** trên mỗi sơ đồ Mermaid đã render thành công để tải ảnh sơ đồ ở chất lượng tốt nhất. Phạm vi đã được human chốt ở Gate-1 (Scope+AC):
- Xuất **CẢ HAI** định dạng: **PNG độ phân giải cao** VÀ **SVG vector gốc** (lossless).
- Nền PNG **TRANSPARENT** (chấp nhận trade-off: chữ tối có thể thấp tương phản trên nền tối).
- "Best quality" = PNG rasterize ở scale cao (ví dụ 3x–4x kiểu devicePixelRatio) với font/style được inline để chữ sắc nét; SVG là vector gốc lossless.

Đây là change request giai đoạn vận hành (operations re-entry) sau khi 6 story MAIN-US-001..006 đã Done và release v1.2.0. CR re-enter per-story loop dưới dạng story mới **MAIN-US-007**.

## 2. Reason / Business Justification
Người dùng cần lưu lại / chia sẻ / nhúng sơ đồ Mermaid ra ngoài Google Chat (tài liệu, slide, ticket). Hiện chỉ có preview + zoom trong trang, không có cách lấy ảnh ra. Download nâng giá trị sử dụng mà không thay đổi luồng render lõi.

## 3. Maintenance Type
- [ ] Corrective  - [ ] Adaptive  - [ ] Perfective  - [ ] Preventive  - [x] Additive  - [ ] Emergency

## 4. Impact Analysis
| Area | Impact |
|---|---|
| Functionality | Thêm một control mới (Download) cạnh các control toggle/zoom hiện có, chỉ trên success path của `renderMermaidBlock`. Không đổi hành vi render/fallback/theme hiện tại. |
| Other systems / dependencies | Module mới `src/lib/download.ts` (song song toggle.ts/zoom.ts); wiring trong `src/lib/render.ts` (gọi attach sau attachZoom; `resetPreviews` gỡ thêm marker mới). Phụ thuộc US-003 (render SVG `data-mermaid-preview="rendered"`) và US-006 (mô hình control + reset). |
| Performance / security | PNG được tạo client-side qua SVG→canvas→toBlob; cần SVG self-contained (font/style inline) để canvas không bị "tainted" (toBlob mới chạy được). Không chèn HTML untrusted mới; chỉ thao tác node DOM do extension tạo → `securityLevel:'strict'` không bị ảnh hưởng, không tăng XSS surface. |
| Effort estimate | 5 SP (một story, một sprint). |

## 5. Risk Assessment
- **Canvas tainted / toBlob lỗi** (Med): nếu SVG tham chiếu external resource hoặc font không inline, canvas bị tainted → export PNG fail. Giảm thiểu: inline font/style, serialize SVG self-contained; nếu PNG fail vẫn cho phép tải SVG.
- **Tương phản PNG nền trong suốt** (Low, đã chấp nhận): chữ tối trên nền tối có thể khó đọc — human đã chấp nhận trade-off.
- **Control mồ côi sau re-theme** (Low): nếu không gỡ trong `resetPreviews`, nút Download bị bỏ lại. Giảm thiểu: AC-5 yêu cầu gỡ theo marker mới như zoom/toggle.

## 6. Rollback Plan
Story độc lập, additive. Rollback = revert PR của MAIN-US-007 (gỡ `src/lib/download.ts` và dòng wiring trong `render.ts`). Không có migration dữ liệu; render/fallback/zoom/theme không đổi nên revert an toàn, trở về hành vi v1.2.0.

## 7. Test Plan
Đầy đủ test plan thuộc Phase 5; ở mức CR: unit test jsdom cho `download.ts` (nút gắn đúng một lần, không gắn trên block lỗi, tên file đúng, gỡ bởi `resetPreviews`), test serialize SVG self-contained; smoke test thủ công trên chat.google.com (bấm Download → nhận file PNG độ phân giải cao nền trong suốt + file SVG vector). Tiêu chí nghiệm thu = các AC của MAIN-US-007.

## 8. Approval (Change Advisory Board)
| Name | Role | Decision | Date |
|---|---|---|---|
| Human (end user) | Requester / Approver | Approved (Gate-1 Scope+AC) | 2026-06-12T01:48:29Z |

## 9. Implementation Record
- Implemented by: TBD (developer, Phase 4 — chưa thực hiện)
- Implemented date: TBD
- Verification result: TBD — link MAIN-US-007 (docs/features/MAIN/US-007/story.md, backlog/MAIN/US-007.md).
