---
version: "1.3.0"
date: "2026-06-12T03:19:55Z"
author: release-manager
status: Draft
release_id: REL-MAIN-2026-06-12-1
epic: MAIN
---

# Release Notes — Mermaid Preview for Google Chat v1.3.0

**Ngày phát hành:** `2026-06-12T03:19:55Z`

---

## v1.3.0 — PNG + SVG download buttons cho mỗi sơ đồ Mermaid

**Release ID:** `REL-MAIN-2026-06-12-1`
**Version bump:** v1.2.0 → v1.3.0 — tính năng mới additive (download control); không phá vỡ tương thích ngược; minor-bump theo SemVer phù hợp.

### Added

- **Nút tải sơ đồ PNG và SVG ("PNG" / "SVG") trên mỗi sơ đồ render thành công** — Mỗi sơ đồ Mermaid render thành công giờ có thêm hai nút "PNG" và "SVG" đặt cạnh nút Toggle và Zoom (cùng hàng control hiện có). Bấm "SVG" tải ngay file vector gốc lossless (`mermaid-diagram-<n>.svg`) — đường chất lượng phổ quát, đúng mọi loại diagram (flowchart, sequence, class, state, ER, …). Bấm "PNG" tải ảnh PNG độ phân giải cao, nền trong suốt, scale 2x–4x theo DPI màn hình — hoạt động đầy đủ với diagram nhãn `<text>` SVG native (sequence, class, state, ER, …). Nút Download không xuất hiện trên block lỗi. Tên file có nghĩa và duy nhất theo thứ tự diagram: `mermaid-diagram-<n>.png` / `mermaid-diagram-<n>.svg`. Khi `resetPreviews` chạy (đổi theme), nút Download bị gỡ cùng preview container — không để lại nút mồ côi. US: `MAIN-US-007` / PR: `PR-MAIN-US-007` / ADR: `ADR-MAIN-008` / CR: `CR-MAIN-2026-06-12-01`

### Known Limitation (v1.3.0) — PNG unavailable for flowchart/foreignObject diagrams

**PNG là best-effort, không phổ quát.** Flowchart và các diagram dùng `<foreignObject>` HTML (nhãn HTML — ca mặc định của Mermaid 11.15.0 cho flowchart) làm canvas bị tainted khi raster hoá qua `img → canvas`, khiến `toBlob` ném `SecurityError`. Điều này **không thể sửa được bằng config** trong Mermaid 11.15.0 (đã kiểm chứng thực nghiệm trên Chrome thật; xem ADR-MAIN-008 và CR-MAIN-2026-06-12-01).

**Hành vi khi bấm "PNG" trên diagram flowchart/foreignObject:** Thay vì PNG, extension **tự động tải SVG thay thế** (`mermaid-diagram-<n>.svg`) và hiển thị một **notice nhẹ, không chặn** thông báo đã tải SVG thay PNG. Không bao giờ là no-op im lặng hay file rỗng — người dùng luôn nhận được một file dùng được.

**SVG là định dạng chất lượng chính:** SVG vector lossless mở đúng mọi loại diagram, không có giới hạn foreignObject, phù hợp cho tài liệu, slide, ticket — và là file đích của fallback tự động.

### Verified behavior (Chrome smoke — ADR-MAIN-008 gate PASS)

Smoke gate thực tế trên Chrome thật, Mermaid 11.15.0:
- **Flowchart (foreignObject):** bấm "PNG" → auto-fallback → `mermaid-diagram-1.svg` (14840 B) tải thành công + notice "Đã tải SVG thay PNG cho sơ đồ này" hiện đúng một lần.
- **Sequence diagram (native text):** bấm "PNG" → `mermaid-diagram-2.png` (26676 B, PNG thật, nền trong suốt, chữ sắc nét) tải thành công, không notice.
- **SVG button (cả hai loại):** vector gốc lossless tải thành công (`mermaid-diagram-1.svg` 14840 B, `mermaid-diagram-2.svg` 22875 B).
- **AC-1 button presence:** cả flowchart và sequence đều có container `data-mermaid-download` với hai nút "PNG" và "SVG".

### Go/No-Go Checklist (v1.3.0)

| Hạng mục | Trạng thái | Ghi chú |
|---|---|---|
| Gate 1 (Planning) | PASS | |
| Gate 2 (Requirements) | PASS | AC-1..AC-8 đầy đủ; CR-MAIN-2026-06-12-01 (Option A) human-approved |
| Gate 3 (Design) | PASS | ADR-MAIN-008 Accepted (human-approved conditional gate 2026-06-12) |
| Gate 4 (Development) | PASS | PR: `PR-MAIN-US-007`; review: `REVIEW-MAIN-US-007` |
| Gate 5 (Testing) | PASS | 156/156 tests pass; 81.11% branch (≥80% threshold); 0 critical / 0 major defects; 1 minor D-01 (non-blocking); smoke gate ADR-MAIN-008 PASS |
| Open critical/major defects | 0 | D-01 minor: serializeSvg viewBox branch untested — non-blocking |
| Browser smoke test | PASS | Flowchart SecurityError→SVG+notice; sequence PNG 3x transparent; SVG both types — xác nhận thực tế Chrome (SMOKE-EVIDENCE-US-007) |
| Known limitation documented | YES | PNG unavailable for foreignObject/flowchart → auto-fallback SVG + notice; human-approved (CR-MAIN-2026-06-12-01) |
| Version bumped | YES | package.json: 0.1.0 → 1.3.0; public/manifest.json: 0.1.0 → 1.3.0 |
| Rollback documented | YES | Runbook §7 — inline rollback section updated for v1.3.0 |
| rollback_tested | PENDING | Phải được main thread ghi `rollback_tested: true` trước Go (qua `/sdlc:gono`) |

**AWAITING HUMAN GO/NO-GO**

---

---

## v1.2.0 — Fullscreen-zoom overlay for Mermaid diagrams

**Release ID:** `REL-MAIN-2026-06-11-2`
**Version bump:** v1.1.0 → v1.2.0 — đây là tính năng mới đáng kể dành cho người dùng (overlay + zoom/pan hoàn chỉnh), không chỉ là bugfix; minor-bump (1.2.0) theo SemVer phù hợp cho bổ sung feature tương thích ngược.

### Added

- **Nút zoom phóng to sơ đồ toàn màn hình (fullscreen-zoom overlay)** — Mỗi sơ đồ Mermaid render thành công có thêm nút "Zoom" cạnh nút toggle. Bấm vào mở overlay full-viewport chứa bản clone SVG (SVG gốc trong tin nhắn không bị di chuyển). Trong overlay: zoom in/out qua nút hoặc con lăn chuột, kéo SVG để pan. Đóng bằng Esc, click backdrop, hoặc nút X — overlay bị gỡ khỏi DOM, listener document được tháo sạch, focus trả về nút zoom. Idempotent: mỗi block chỉ có đúng một nút zoom; không gắn trên block lỗi. Khi `resetPreviews` chạy (đổi theme — US-005), zoom button bị gỡ cùng preview container và toggle; overlay đang mở được đóng an toàn. US: `MAIN-US-006` / PR: `PR-MAIN-US-006` / ADR: `ADR-MAIN-007`

### Known Issues (v1.2.0)

- **Drag UX thật trên Chrome chưa xác nhận (TC-04 bước 7, manual-pending):** Logic zoom/pan đã Pass đầy đủ qua jsdom (`zoom.test.ts` 28 tests). Trải nghiệm kéo chuột thực tế bên trong overlay chưa được verify trên Chrome thật — cần thực hiện manual smoke test (Runbook §3.2, bước "US-006 smoke").
- **Live theme switch chưa xác nhận (TC-07 bước 7, manual-pending):** Logic `resetPreviews` đóng overlay khi reset đã Pass jsdom. Hành vi trên Chrome thật khi đổi theme Chat cần xác nhận thủ công (Runbook §3.2, bước "US-006 smoke").

### Go/No-Go Decision (v1.2.0)

**GO — phê duyệt deploy production bởi human (product owner) ngày `2026-06-11T17:40:44Z`.**

Gate evidence:

| Hạng mục | Trạng thái | Ghi chú |
|---|---|---|
| Gate 1 (Planning) | PASS `2026-06-11T10:58:36Z` | |
| Gate 2 (Requirements) | PASS `2026-06-11T12:32:33Z` | |
| Gate 3 (Design) | PASS `2026-06-11T12:41:23Z` | ADR-MAIN-007 |
| Gate 4 (Development) | PASS — review Approve | REVIEW-MAIN-US-006: Approve, 0 must-fix, 4 nits non-blocking |
| Gate 5 (Testing) | PASS `2026-06-11T17:35:37Z` | 115/115 tests pass; 99.1% stmt / 88.88% branch / 100% func / 99.37% lines; 0 critical/major defects (5 minor/trivial D-01..D-05 smoke fixed) |
| Code review | Approve | `REVIEW-MAIN-US-006`, code-reviewer, `2026-06-11T16:57:47Z` |
| PR | `PR-MAIN-US-006` | Linked from backlog claim |
| Open critical/major defects | 0 | `gate-state.json` `open_defects.critical=0, major=0` |
| Manual smoke test | **PASS** | Icon/fit/spacing/control-position/blur confirmed sau reload (TC-08). Drag UX (TC-04) + live theme switch (TC-07) còn pending — theo dõi hậu deploy như smoke step Runbook §3.2 |
| rollback_tested | **true** | `gate-state.json`; rollback approved bởi human cùng quyết định GO |

**Quyết định:** **GO** — phê duyệt bởi human (product owner) ngày `2026-06-11T17:40:44Z`. Smoke test UI đã pass sau reload; rollback approved. Hai mục manual còn lại (drag UX, live theme switch) là kiểm tra runtime trên Chrome, theo dõi hậu-deploy, không chặn release.

---

---

## v1.1.0 — Auto light/dark theme + core features

**Release ID:** `REL-MAIN-2026-06-11`
**Ngày phát hành:** `2026-06-11T15:25:45Z`

> v1.0.0 không khả dụng khi nạp thực tế (xem INC-01/INC-02); v1.1.0 là bản hoạt động đầu tiên đã xác nhận trên chat.google.com, kèm tính năng auto theme.

### Added

- **Tự động theme sáng/tối theo giao diện Google Chat** — Sơ đồ render theo theme `dark`/`default` khớp độ sáng nền thật của Chat (không bám class), và tự render lại toàn bộ khi đổi theme giữa phiên. US: `MAIN-US-005` / PR: `PR-MAIN-US-005` / ADR: `ADR-MAIN-006`

- **Scaffold MV3 extension + inject content-script vào Google Chat** — Dựng project Chrome Extension Manifest V3 (TypeScript + Vite), build ra `dist/`, load unpacked, inject content-script chạy trên `https://chat.google.com/*`. US: `MAIN-US-001` / PR: `PR-MAIN-US-001`

- **Phát hiện code block Mermaid trong tin nhắn Google Chat** — Quét DOM cửa sổ chat để nhận diện các code block chứa mã Mermaid, trích xuất source text, không nhận nhầm code block ngôn ngữ khác. US: `MAIN-US-002` / PR: `PR-MAIN-US-002`

- **Render mã Mermaid thành SVG inline với fallback an toàn** — Dùng thư viện Mermaid (`securityLevel: 'strict'`) render source đã phát hiện thành SVG chèn inline cạnh code block. Khi parse lỗi, fallback hiển thị mã gốc, không làm vỡ giao diện chat. US: `MAIN-US-003` / PR: `PR-MAIN-US-003`

- **Toggle preview/source + xử lý tin nhắn tải động** — Thêm control toggle để chuyển giữa sơ đồ SVG đã render và mã Mermaid gốc (không render lại), gắn MutationObserver để tự render các block Mermaid trong tin nhắn tải động trong phiên chat. Idempotent, không vỡ giao diện, observer tháo gỡ được. US: `MAIN-US-004` / PR: `PR-MAIN-US-004`

### Fixed

- **Chrome không nạp được `content.js` ("isn't UTF-8 encoded")** — bundle chứa ký tự non-character U+FFFF; build giờ ép output ASCII-only. INC-MAIN-2026-06-11-01 / ADR-MAIN-005.
- **Sơ đồ render trong khung soạn + message gửi không preview** — bỏ qua vùng `contenteditable`; trích source message gửi đúng (`<br>`→newline, bỏ nhãn ```mermaid). INC-MAIN-2026-06-11-02 / revise ADR-MAIN-002.

### Known Issues

- **Bundle size lớn do Mermaid được bundle eagerly:** Thư viện Mermaid được bundle trực tiếp vào `content.js` (không lazy-load) theo quyết định ADR-MAIN-003 để đơn giản hoá kiến trúc MV3. Kích thước `content.js` sẽ lớn hơn đáng kể so với không bundle. Đây là đánh đổi có chủ ý; cải thiện có thể xem xét ở phiên bản sau.

- **Hai test case cần xác nhận thủ công trên trình duyệt thật:** TC liên quan đến render SVG thực tế (US-003) và toggle/live-render trong phiên chat thật (US-004) được đánh dấu "Pass-logic, Blocked-manual" trong test spec — chưa thể tự động hoá hoàn toàn. Cần thực hiện **manual smoke test** trên `chat.google.com` trước khi đưa lên production (xem Runbook, mục 3.2).

### Go/No-Go Decision (v1.1.0)

- **Quyết định:** **GO** — phê duyệt bởi human (product owner) ngày `2026-06-11`.
- **Cơ sở:** Test tự động xanh 50/50, coverage 100% stmt/func/line (97.87% branches), 0 defect critical/major; code review Approve cho cả 4 story.
- **Waiver (rủi ro đã chấp nhận):** Human chọn Go **bỏ qua** manual smoke test (Runbook §3.2) và rollback test (Runbook §7.2). Do đó `rollback_tested` được giữ ở **`false`** — rollback **chưa** được kiểm chứng thực tế. Trước/ngay khi phân phối production, nên thực hiện §3.2 + §7.2 và cập nhật cờ này. Đây là quyết định có chủ ý, không phải thiếu sót quy trình.
