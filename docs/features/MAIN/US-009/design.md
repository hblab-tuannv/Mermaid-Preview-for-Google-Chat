---
status: "Accepted"
date: "2026-06-12T06:40:17Z"
deciders: "architect"
supersedes: "ADR-MAIN-002-mermaid-detection"
---

# ADR-MAIN-009: Tin nhãn fence `mermaid` + mở rộng allowlist để phủ toàn bộ loại sơ đồ

> Supersedes **ADR-MAIN-002** (chiến lược phát hiện chỉ-bằng-allowlist). Giữ nguyên hai trụ cột của MAIN-002 (tách "tìm element" khỏi "nhận diện nội dung"; KHÔNG nạp thư viện mermaid vào đường detect) và chỉ đảo đúng MỘT quyết định: việc dùng nhãn ngôn ngữ làm tín hiệu.

## Context
`render` (US-003) dùng **toàn bộ** thư viện `mermaid`, vẽ được mọi loại sơ đồ. Nhưng `detect` (US-002, ADR-MAIN-002) chặn ở một **allowlist từ khoá viết tay** (`MERMAID_KEYWORDS`, 14 từ): loại nào không có trong danh sách thì không bao giờ tới được render. Mermaid liên tục thêm/đổi tên loại (`xychart-beta`, `sankey-beta`, `block-beta`, `packet-beta`, `requirementDiagram`, `C4*`, `zenuml`, `kanban`, `architecture-beta`, `radar`, `treemap`, ...) → danh sách tay là **treadmill**, luôn tụt lại.

Quyết định cốt lõi của ADR-MAIN-002 cần xem lại:

> *"Google Chat có thể không giữ ngôn ngữ của fenced block ... → không thể dựa vào marker ngôn ngữ."* — ADR-MAIN-002 đã **bác** hướng dựa vào language marker, dựa trên giả định về class `language-mermaid`.

Giả định đó đã được **chứng minh sai một phần** bởi bằng chứng production:

- **INC-MAIN-2026-06-11-02 (Bug B):** từ DOM Chat THẬT do người dùng cung cấp, message đã gửi là **một `<pre>`** với **nhãn ngôn ngữ `mermaid` là dòng text đầu** (không phải class — Chat giữ nó dưới dạng *text*). Đây chính là lý do `stripLanguageTag` ra đời (commit `436e394`, mô tả "revises ADR-MAIN-002").
- Chat giữ nhãn `mermaid` **bất kể nội dung phía sau** (content-agnostic). Nếu nó giữ cho `graph` thì cũng giữ cho `xychart-beta`.

Forces (kế thừa MAIN-002): selector DOM dễ vỡ; KHÔNG được nạp mermaid (nặng) vào đường detect; idempotent cho MutationObserver (US-004); ít false positive; test được bằng jsdom. Bổ sung: phải bắt kịp các loại mới **mà không** phải bảo trì danh sách mãi.

## Decision
Giữ kiến trúc tách `findCodeBlocks` / nhận-diện-nội-dung của MAIN-002, và đổi bước nhận diện thành **hai tầng**:

1. **Tầng 1 — Tin fence (`mermaid` language tag).** Refactor `stripLanguageTag(source) → { source, hadTag }` để báo nhãn `mermaid` (so khớp **đúng** dòng đầu, không phân biệt hoa thường) có bị bóc hay không. Trong `detectMermaidBlocks`: nếu `hadTag === true` → coi block là **ứng viên Mermaid ngay**, BỎ QUA `isMermaid`. Parser của mermaid + đường **error-fallback hiện có** trong `render.ts` (marker "could not render", giữ code gốc) chịu trách nhiệm với nội dung không hợp lệ. → tự phủ **mọi loại hiện tại và tương lai**.
2. **Tầng 2 — Allowlist mở rộng (block KHÔNG có nhãn).** Khi `hadTag === false`, vẫn dùng `isMermaid` (so token đầu, case-insensitive) cho block dán thô không nhãn — nhưng bổ sung `MERMAID_KEYWORDS`: `xychart-beta`, `sankey-beta`, `block-beta`, `packet-beta`, `requirementDiagram`, `C4Context`, `C4Container`, `C4Component`, `C4Dynamic`, `C4Deployment`, `kanban`, `architecture-beta`, `radar-beta`, `treemap` (đúng tên mermaid, gồm hậu tố `-beta` khi detector yêu cầu — vd `radar-beta` cần `-beta`, nhưng `treemap` thì không, đã đối chiếu detector mermaid 11.15.0). **Loại trừ có chủ đích `zenuml`:** là external diagram không bundled trong core (`mermaid.render` ném lỗi — verify bằng `mermaid.detectType` post-`initialize` trên mermaid 11.15.0); đưa vào allowlist unfenced sẽ biến code block sạch thành error marker (regression). Đường fence vẫn detect zenuml (AC-4 fallback).
3. **KHÔNG** nạp `mermaid` vào `detect.ts` — tầng 1 chỉ dựa vào sự hiện diện của nhãn (thao tác chuỗi/DOM thuần), giữ nguyên ràng buộc hiệu năng & test-bằng-jsdom của MAIN-002. Idempotency (`data-mermaid-preview`), selector cô lập, trích `source` nguyên văn: giữ nguyên.

## Consequences
- **Positive:** Mọi sơ đồ gửi bằng ```mermaid đều preview được, kể cả loại mới — **không** phải đụng allowlist nữa (cắt treadmill). Allowlist mở rộng vẫn lo cho block dán thô không nhãn. Đường detect vẫn nhẹ, không phụ thuộc mermaid, test bằng jsdom.
- **Negative / trade-offs (chủ đích, đã được human chấp nhận ở Gate-1):** Một block fence ```mermaid nhưng nội dung KHÔNG parse được — trước đây nằm im (không detect) — nay sẽ được detect và hiện marker "could not render" (code gốc vẫn hiện). Đây là **behavior change**, không phải zero-regression; được coi là đúng hơn vì người dùng đã tường minh đánh dấu "đây là mermaid". Bề mặt false-positive nhỉnh lên nhưng bị error-fallback chặn an toàn (không vỡ trang).
- **Neutral / follow-ups:** Allowlist tầng 2 vẫn cần thêm tay cho loại mới *khi dùng không-fence* — chấp nhận, vì đường-chuẩn (có fence) đã future-proof. Có thể cân nhắc sau: dùng `mermaid.detectType` ở đường render-time để cảnh báo loại lạ (ngoài scope story này).

## Alternatives Considered
| Option | Why rejected |
|---|---|
| Giữ nguyên chỉ-allowlist, chỉ thêm từ khoá (Tầng 2 một mình) | Vẫn là treadmill; loại mới của mermaid lại lọt sổ ngay lần phát hành kế. Human chọn làm cả hai tầng. |
| Gọi `mermaid.parse()`/`detectType()` ở đường detect để xác định loại | Kéo thư viện nặng vào detect (đúng cái MAIN-002 cấm vì hiệu năng + observer quét lại liên tục); parse-fail ≠ "không phải mermaid". |
| Dựa vào class `language-mermaid` | Đúng như MAIN-002 nêu: class thường mất sau render. Khác biệt của ADR này: dựa vào **nhãn text** `mermaid` ở dòng đầu (đã chứng minh tồn tại ở INC-02), KHÔNG phải class. |

## NFR Coverage
- **Security:** Không `innerHTML`, không thực thi nội dung ở detect (giữ MAIN-002). Tin-fence chỉ mở rộng *ứng viên*; sanitization/parse an toàn vẫn ở render (US-003, `securityLevel: 'strict'`). Block rác bị error-fallback chặn, không chèn SVG.
- **Performance:** Tầng 1 là một phép so chuỗi cho dòng đầu (đã có sẵn trong `stripLanguageTag`); không nạp thêm thư viện vào detect → giữ ngân sách phản hồi nhanh khi observer chạy liên tục (US-004).
- **Reliability:** Rỗng/malformed vẫn trả false/không ném (giữ AC-4 cũ); fence + rác đi vào error-fallback đã kiểm thử, không vỡ trang chat.
- **Maintainability / Testability:** `detect.ts` vẫn thuần, test đầy đủ bằng jsdom với DOM-shape thật (nhãn `mermaid` + `<br>` như INC-02). Đường-chuẩn (fence) hết phụ thuộc vào việc cập nhật hằng số.
