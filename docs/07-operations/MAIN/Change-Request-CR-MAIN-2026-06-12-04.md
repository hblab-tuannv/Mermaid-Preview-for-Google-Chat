---
version: "1.0"
date: "2026-06-12T07:50:03Z"
author: "sre-maintainer"
status: "Approved"
---

# Change Request (CR / Modification Request) — `CR-MAIN-2026-06-12-04`

| ID | Date | Requester | Priority | Status |
|---|---|---|---|---|
| CR-MAIN-2026-06-12-04 | 2026-06-12T07:50:03Z | End user (via sre-maintainer) | High | Approved |

## 1. Description of Change
Sửa lỗi **không preview được** với hai lớp nội dung Mermaid hoàn toàn hợp lệ:

1. **Label có xuống dòng `<br>` / `<br/>`** (ví dụ `A["Dòng 1<br/>Dòng 2"]`).
2. **Sơ đồ C4** (`C4Context`, `C4Container`, …) — đã được detect (US-009) nhưng vẫn rơi vào marker "could not render diagram".

**Root cause (một điểm chung):** Trong `src/lib/render.ts`, hàm `parseSvg` parse chuỗi SVG do mermaid sinh ra bằng MIME **`image/svg+xml`** — tức XML nghiêm ngặt. Mermaid nhúng HTML vào trong `<foreignObject>` cho label xuống dòng (`<br>`) và cho các box mô tả của sơ đồ C4. Đây là HTML-trong-SVG hợp lệ nhưng **không phải XML well-formed** (thẻ void `<br>` không đóng). Parser XML gặp `<br>` chưa đóng sẽ trả về node gốc `<parsererror>` thay vì `<svg>` → `parseSvg` trả `null` → `renderMermaidBlock` rơi vào nhánh error-fallback. Đã kiểm chứng thực nghiệm: XML parse SVG-chứa-`<br>` → `parsererror`; HTML parse cùng chuỗi → tìm thấy `<svg>` đúng namespace, `foreignObject` còn nguyên. Chunk C4 của mermaid (`c4Diagram-*.mjs`) cũng dùng `foreignObject`, nên cùng cơ chế lỗi.

**Hướng sửa:** đổi `parseSvg` sang parse bằng **`text/html`** (khoan dung với void tag, vẫn đặt `<svg>`/con vào đúng SVG namespace, `foreignObject` vào XHTML namespace) rồi `querySelector('svg')` + `importNode`. Giữ nguyên mọi đảm bảo bảo mật (DOMParser tạo document trơ — script không thực thi; lớp phòng thủ chính vẫn là mermaid `securityLevel: 'strict'`).

Đây là CR giai đoạn vận hành (operations re-entry) sau khi MAIN-US-001..009 đã Done, publish. CR re-enter per-story loop dưới dạng story mới **MAIN-US-010**.

## 2. Reason / Business Justification
Hai lỗi này khiến những sơ đồ phổ biến và hợp lệ (nhãn nhiều dòng — rất thông dụng; toàn bộ họ sơ đồ C4) **không bao giờ** preview được, người dùng chỉ thấy marker lỗi dù cú pháp của họ đúng. Đây là lỗi **corrective** chạm tới chất lượng cốt lõi của extension (render đúng), nên ưu tiên cao.

## 3. Maintenance Type
- [x] Corrective  - [ ] Adaptive  - [ ] Perfective  - [ ] Preventive  - [ ] Additive  - [ ] Emergency

> Corrective: sửa khiếm khuyết khiến SVG hợp lệ bị từ chối ở khâu parse.

## 4. Impact Analysis
| Area | Impact |
|---|---|
| Functionality | Các sơ đồ có label `<br>`/`<br/>` và toàn bộ họ C4 nay preview được thay vì hiện marker lỗi. Không đổi toggle/zoom/theme/download. Sơ đồ thực sự không hợp lệ vẫn rơi vào error-fallback như cũ (parse không ra `<svg>` → `null`). |
| Other systems / dependencies | Source bị chạm: `src/lib/render.ts` (chỉ hàm `parseSvg`) và `src/lib/render.test.ts`. Không đụng detect/observe/theme/zoom/download. **Không cần ADR mới** — không có quyết định kiến trúc đắt/khó đảo; chỉ sửa cơ chế parse cho đúng bản chất HTML-trong-SVG của output mermaid. |
| Performance / security | Vẫn không `innerHTML`, không thực thi nội dung (DOMParser tạo document trơ; node `<script>` import vào vẫn inert). Phòng thủ XSS chính giữ nguyên (`securityLevel: 'strict'`). Không nạp thêm thư viện. |
| Effort estimate | 1 SP (sửa một hàm + test, không UI mới). |

## 5. Risk Assessment
- **Khác biệt namespace khi parse `text/html`** (Low): HTML parser của trình duyệt đặt `<svg>` và con vào SVG namespace, `foreignObject` vào XHTML — đúng như render cần. Giảm thiểu: test khẳng định `svg.namespaceURI === 'http://www.w3.org/2000/svg'` và `foreignObject` tồn tại sau import.
- **Hồi quy chống-XSS** (Low): `text/html` vẫn là DOMParser inert — script không chạy. Giảm thiểu: giữ test AC-5 (script nhúng không set `__pwned`), pass.
- **Non-SVG bị nhận nhầm** (Low): `querySelector('svg')` trả `null` cho `<div>not an svg</div>` → fallback đúng. Giảm thiểu: test AC-2 giữ nguyên, pass.

## 6. Rollback Plan
Story độc lập, corrective một-hàm. Rollback giai đoạn dev = revert PR của MAIN-US-010 (khôi phục `parseSvg` về `image/svg+xml`) — không migration dữ liệu, không đổi logic detect/render khác. Sau publish: đẩy hotfix version mới (giống mọi thay đổi content-script).

## 7. Test Plan
Mức CR: SVG có `<foreignObject>` chứa `<br>` chưa đóng → render thành công (`'rendered'`), có `<svg>` đúng namespace + `foreignObject`; SVG không phải gốc `<svg>` → vẫn `'error'` (AC-2); SVG nhúng `<script>` → không thực thi (AC-5). Tiêu chí nghiệm thu = các AC của MAIN-US-010.

## 8. Approval (Change Advisory Board)
| Name | Role | Decision | Date |
|---|---|---|---|
| Human (end user) | Requester / Approver | **Approved (Gate-1 Scope + Acceptance Criteria)** | 2026-06-12T07:50:03Z |

## 9. Implementation Record
- Implemented by: developer (Phase 4) — TDD: test đỏ tái hiện bug trước, fix `parseSvg`, test xanh.
- Implemented date: 2026-06-12T07:50:03Z
- Verification result: full suite `npx vitest run --coverage` → 189 pass; `typecheck` + `lint` sạch — link MAIN-US-010 (docs/features/MAIN/US-010/story.md, backlog/MAIN/US-010.md).
