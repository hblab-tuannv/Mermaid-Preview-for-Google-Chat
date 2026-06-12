---
version: "1.0"
date: "2026-06-12T06:40:17Z"
author: "product-owner"
status: "Approved"
---

# Change Request (CR / Modification Request) — `CR-MAIN-2026-06-12-03`

| ID | Date | Requester | Priority | Status |
|---|---|---|---|---|
| CR-MAIN-2026-06-12-03 | 2026-06-12T06:40:17Z | End user (via product-owner) | Medium | Approved |

## 1. Description of Change
Mở rộng **độ phủ loại sơ đồ Mermaid** mà extension phát hiện và preview. Hiện `render` đã dùng **toàn bộ** thư viện `mermaid` (vẽ được mọi loại), nhưng `detect` (`src/lib/detect.ts`) lại chặn ở một **allowlist từ khoá viết tay** (`MERMAID_KEYWORDS`, 14 từ) — bất kỳ loại nào không có trong danh sách thì không bao giờ tới được render, dù mermaid thừa sức vẽ. Người dùng phản ánh nhiều loại (ví dụ XY Chart / `xychart-beta`) không hiện preview.

Human đã chọn hướng **"Tin fence + mở rộng keyword"** (hai tầng):

- **Tầng 1 — Tin fence (`mermaid` language tag):** Khi code block đã gửi có **nhãn ngôn ngữ `mermaid` ở dòng text đầu** (Google Chat giữ nguyên nhãn này — đã xác nhận trong sự cố **INC-MAIN-2026-06-11-02** Bug B, từ DOM thật do người dùng cung cấp, và là lý do hàm `stripLanguageTag` ra đời ở commit `436e394` "revises ADR-MAIN-002"), thì coi block là **ứng viên Mermaid ngay**, BỎ QUA cổng keyword, để parser của mermaid + cơ chế error-fallback hiện có (`render.ts`) tự quyết. Vì Chat giữ fence **bất kể nội dung phía sau**, tầng này **tự hỗ trợ mọi loại diagram hiện tại và tương lai** mà không phải bảo trì danh sách.
- **Tầng 2 — Mở rộng keyword (cho block KHÔNG có fence):** Giữ heuristic so khớp token đầu cho block dán thô không nhãn, nhưng bổ sung các loại đang thiếu mà core mermaid render được: `xychart-beta`, `sankey-beta`, `block-beta`, `packet-beta`, `requirementDiagram`, `C4Context`/`C4Container`/`C4Component`/`C4Dynamic`/`C4Deployment`, `kanban`, `architecture-beta`, `radar-beta`, `treemap`. (`zenuml` bị loại khỏi allowlist unfenced — external diagram không bundled, render lỗi; chỉ detect qua fence.)

Đây là CR giai đoạn vận hành (operations re-entry) sau khi MAIN-US-001..008 đã Done. CR re-enter per-story loop dưới dạng story mới **MAIN-US-009**.

## 2. Reason / Business Justification
Khoảng cách giữa năng lực render (toàn bộ mermaid) và phạm vi detect (14 từ khoá) khiến nhiều sơ đồ hợp lệ không được preview, gây cảm giác "extension không hỗ trợ". Allowlist tay là **treadmill**: mermaid liên tục thêm/đổi tên loại sơ đồ nên danh sách luôn tụt lại. Tin vào fence `mermaid` (tín hiệu tường minh, đáng tin cậy đã được kiểm chứng) cắt đứt treadmill và khớp với cách dùng chuẩn (người dùng gõ ```mermaid).

## 3. Maintenance Type
- [ ] Corrective  - [x] Adaptive  - [x] Perfective  - [ ] Preventive  - [ ] Additive  - [ ] Emergency

> Adaptive: bám theo việc Mermaid mở rộng tập loại sơ đồ. Perfective: cải thiện độ phủ detect mà không thêm bề mặt tính năng mới cho người dùng (vẫn là preview).

## 4. Impact Analysis
| Area | Impact |
|---|---|
| Functionality | Tăng số loại sơ đồ được preview. **Behavior change nhỏ (chấp nhận):** một block fence ```mermaid nhưng nội dung KHÔNG parse được — hiện tại nằm im (không detect) — sau thay đổi sẽ được detect và hiện marker "Mermaid: could not render diagram" (đường error-fallback sẵn có); code block gốc vẫn hiển thị. Không đổi toggle/zoom/theme/download. |
| Other systems / dependencies | Source bị chạm (gated tới khi human duyệt scope): `src/lib/detect.ts` (chủ yếu — `stripLanguageTag` cần báo "đã có tag", `detectMermaidBlocks` rẽ nhánh fence-vs-keyword, mở rộng `MERMAID_KEYWORDS`) và `src/lib/detect.test.ts`. Không đụng render/observe/theme/zoom/download. Cần **ADR amend/supersede ADR-MAIN-002** (đảo quyết định "không dựa vào language marker"). |
| Performance / security | Không nạp thêm thư viện vào đường detect (vẫn chỉ thao tác chuỗi/DOM) — giữ đúng ràng buộc hiệu năng của ADR-MAIN-002. Không `innerHTML`, không thực thi nội dung. Bề mặt false-positive nhỉnh lên một chút (block tự gắn nhãn ```mermaid) nhưng được error-fallback chặn an toàn. |
| Effort estimate | 3 SP (một story, một sprint — logic detect + test, không có UI mới). |

## 5. Risk Assessment
- **False positive do tin fence** (Low): block fence ```mermaid chứa rác → hiện marker lỗi thay vì im lặng. Giảm thiểu: error-fallback hiện có giữ code gốc; AC ghi rõ hành vi này là chủ đích.
- **Strip nhầm keyword thật** (Low): chỉ strip khi dòng đầu **đúng bằng** `mermaid` (không phải `mindmap`/`mermaidjs`...). Giảm thiểu: AC kiểm tra exact-first-line.
- **Keyword mới sai chính tả / lệch tên mermaid** (Low): ví dụ `xychart-beta` vs `xychart`. Giảm thiểu: AC liệt kê từ khoá theo đúng tên mermaid hiện hành; test phủ từng từ.

## 6. Rollback Plan
Story độc lập, adaptive/perfective. Rollback giai đoạn dev = revert PR của MAIN-US-009 (khôi phục `detect.ts`/`MERMAID_KEYWORDS` về trạng thái trước, bỏ nhánh tin-fence) — không migration dữ liệu, không đổi logic render. Sau publish: đẩy hotfix version mới (giống mọi thay đổi content-script).

## 7. Test Plan
Đầy đủ ở Phase 5; mức CR: block fence ```mermaid + loại ngoài allowlist (vd `xychart-beta`) → detect; block fence ```mermaid + rác → detect rồi error-fallback; block không fence + keyword mới → detect; block không fence + không keyword (JS/JSON/prose) → KHÔNG detect; dòng đầu `mindmap` không bị strip nhầm; idempotent giữ nguyên. Tiêu chí nghiệm thu = các AC của MAIN-US-009.

## 8. Approval (Change Advisory Board)
| Name | Role | Decision | Date |
|---|---|---|---|
| Human (end user) | Requester / Approver | **Approved (Gate-1 Scope + Acceptance Criteria)** | 2026-06-12T06:40:17Z |

## 9. Implementation Record
- Implemented by: TBD (developer, Phase 4 — chưa thực hiện; scope chưa được human duyệt)
- Implemented date: TBD
- Verification result: TBD — link MAIN-US-009 (docs/features/MAIN/US-009/story.md, backlog/MAIN/US-009.md).
