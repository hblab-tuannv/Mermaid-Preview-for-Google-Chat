---
version: "1.1.0"
date: "2026-06-12T06:40:17Z"
author: release-manager
status: Pending Go/No-Go
release_id: REL-MAIN-2026-06-12-3
epic: MAIN
---

# Release Notes — Mermaid Preview for Google Chat

**Cập nhật lần cuối:** `2026-06-12T06:40:17Z`

---

## v1.1.0 — Mở rộng độ phủ loại sơ đồ Mermaid (Chrome Web Store)

**Release ID:** `REL-MAIN-2026-06-12-3`
**Version bump:** v1.0.0 → v1.1.0 — bổ sung năng lực người dùng (preview nhiều loại sơ đồ hơn), tương thích ngược; minor-bump theo SemVer phù hợp.
**Kênh phân phối:** Chrome Web Store (cập nhật phiên bản công khai thứ hai).

### Added / Changed (US-009 — ADR-MAIN-009)

- **Preview được MỌI loại sơ đồ Mermaid core — hiện tại và tương lai.** Trước đây phát hiện chỉ chấp nhận block có token đầu nằm trong allowlist 14 từ khoá cứng, nên các loại như **XY Chart, Sankey, Block, C4, Requirement, Packet, Kanban, Architecture, Radar, Treemap** không hiện preview dù thư viện Mermaid thừa sức vẽ. Giờ:
  - **Tin nhãn fence ```mermaid:** Khi block đã gửi mang nhãn ngôn ngữ `mermaid` (Google Chat giữ ở dòng đầu — xác nhận từ DOM thật, INC-MAIN-2026-06-11-02), extension nhận diện ngay **bất kể loại sơ đồ**, để parser Mermaid + fallback an toàn quyết định. Tự phủ mọi loại mới Mermaid thêm về sau, không cần cập nhật danh sách.
  - **Mở rộng allowlist cho block dán thô (không nhãn):** thêm `xychart-beta`, `sankey-beta`, `block-beta`, `packet-beta`, `requirementDiagram`, `C4Context/Container/Component/Dynamic/Deployment`, `kanban`, `architecture-beta`, `radar-beta`, `treemap` (tên đối chiếu detector Mermaid 11.15.0; mỗi loại đã verify render được bằng `mermaid.detectType`). **`zenuml`** chỉ hỗ trợ qua fence ```mermaid (là external diagram không bundled trong core — render lỗi nếu dán thô).
  - US: `MAIN-US-009` / PR: `PR-MAIN-US-009` / ADR: `ADR-MAIN-009` (supersedes ADR-MAIN-002) / CR: `CR-MAIN-2026-06-12-03`

### Behavior change (chủ đích, human-approved Gate-1 + ADR-MAIN-009)

- Một block người dùng **chủ động gắn nhãn ```mermaid** nhưng nội dung KHÔNG parse được giờ hiện marker "Mermaid: could not render diagram" (đường error-fallback sẵn có) thay vì nằm im như trước. Code block gốc vẫn hiển thị; không vỡ trang. Đây là đánh đổi đã chấp nhận: người dùng đã tường minh đánh dấu "đây là mermaid".

### Packaging hygiene

- `scripts/package.mjs` chuyển sang `archive.glob('**/*', { dot: false })` để **loại bỏ `.DS_Store`/`Thumbs.db`** khỏi gói zip (trước đây macOS Finder có thể chèn `.DS_Store` vào `dist/` giữa build và package, lọt vào gói upload Store). Gói `mermaid-preview-google-chat-v1.1.0.zip` xác nhận 7 file, không có OS cruft.

### Không đổi

Render/toggle/zoom/theme/download, `content_scripts.matches` (`https://chat.google.com/*`), permission, không thêm `action`. Không thêm thư viện vào đường detect (giữ ràng buộc hiệu năng ADR-MAIN-002/009).

### Go/No-Go Checklist (v1.1.0 — REL-MAIN-2026-06-12-3)

| Hạng mục | Trạng thái | Ghi chú |
|---|---|---|
| Gate 1 (Requirements / Scope+AC) | PASS | CR-MAIN-2026-06-12-03 + US-009 AC-1..AC-6 human-approved `2026-06-12T06:40:17Z` |
| Gate ◆ (Design / ADR) | PASS | ADR-MAIN-009 Accepted (human-approved); ADR-MAIN-002 → Superseded |
| Gate 4 (Development) | PASS | PR-MAIN-US-009; REVIEW-MAIN-US-009 Approve, 0 must-fix (2 nit đã sửa: radar-beta, JSDoc header) |
| Gate 5 (Testing) | PASS | 188/188 tests pass; detect.ts 100% stmt / 95.45% branch; tổng ≥80% branch; 0 critical / 0 major; TC-MAIN-US-009-01..06 |
| Render verification (offline) | PASS | `mermaid.detectType` (post-`initialize`, mermaid 11.15.0) xác nhận 11/12 loại bổ sung render được; `zenuml` loại khỏi unfenced allowlist (external diagram) |
| Browser smoke (real Chat) | **OUTSTANDING** | Chưa chạy trên chat.google.com thật (cần auth). INC-02 action-item coi smoke là bắt buộc cho release — human cân nhắc waive có chủ đích hay chạy trước GO |
| Open critical/major defects | 0 | |
| Version consistency | YES | manifest.json = 1.1.0; package.json = 1.1.0; tên zip = v1.1.0 |
| Packaging verified | YES | `npm run package` → `mermaid-preview-google-chat-v1.1.0.zip` (859554 B, 7 file, không `.DS_Store`) |
| Rollback documented | YES | Runbook §7 — dev: revert PR-MAIN-US-009; Store: hotfix v1.1.1 hoặc unpublish/disable (giống §7B) |
| rollback_tested | PENDING | Main thread ghi qua `/sdlc:gono` trước GO |
| Images on Dashboard | N/A | Không đổi asset (đã upload ở v1.0.0); cập nhật version không yêu cầu ảnh mới |
| Quyết định Go/No-Go | **PENDING — chờ human** | Chưa phê duyệt; không deploy tự động |

> Đây là bản nháp release chờ Go/No-Go. Thao tác submit bản cập nhật lên Chrome Web Store do human/operator thực hiện thủ công trên Developer Dashboard (upload zip mới, tăng version) sau khi GO. Không deploy tự động.

---

## v1.0.0 — First Public Chrome Web Store Release

**Release ID:** `REL-MAIN-2026-06-12-2`
**Ngày chuẩn bị:** `2026-06-12T04:45:56Z`
**Kênh phân phối:** Chrome Web Store (phiên bản công khai đầu tiên)

### Lịch sử phiên bản — Bối cảnh

Các phiên bản nội bộ `0.1.0` → `1.3.0` là các build dev-only, phân phối bằng **load-unpacked** (Developer Mode), **chưa bao giờ được phát hành công khai**. `package.json` có `"private": true` trong suốt giai đoạn đó. Phiên bản công khai **bắt đầu từ 1.0.0** — đây là lần đầu tiên extension xuất hiện trên Chrome Web Store và người dùng có thể cài một-click không cần Developer Mode.

### Tính năng ra mắt (US-001 → US-007, shipped together)

Toàn bộ tính năng đã hoàn thiện qua 7 user story nội bộ được ship cùng nhau trong lần phát hành đầu tiên này:

- **Scaffold MV3 + inject content-script** vào `https://chat.google.com/*` (US-001 / `PR-MAIN-US-001`)
- **Phát hiện code block Mermaid** trong DOM tin nhắn Google Chat (US-002 / `PR-MAIN-US-002`)
- **Render Mermaid thành SVG inline** với fallback an toàn khi parse lỗi (US-003 / `PR-MAIN-US-003`)
- **Toggle preview/source + MutationObserver** cho tin nhắn tải động (US-004 / `PR-MAIN-US-004`)
- **Auto theme sáng/tối** khớp giao diện Google Chat, render lại khi đổi theme (US-005 / `PR-MAIN-US-005`)
- **Fullscreen-zoom overlay** — zoom in/out (nút + scroll wheel), drag-to-pan, đóng bằng Esc/backdrop/X (US-006 / `PR-MAIN-US-006` / ADR-MAIN-007)
- **Nút tải PNG và SVG** trên mỗi sơ đồ render thành công; PNG best-effort (sequence/class/state/ER) + auto-fallback SVG + notice khi flowchart/foreignObject (US-007 / `PR-MAIN-US-007` / ADR-MAIN-008)

### Packaging (US-008 — AC-1, AC-2, AC-3)

- Version reset về **1.0.0** (cả `manifest.json` và `package.json`) — phiên bản công khai đầu tiên.
- `manifest.json` bổ sung trường `icons` (16/48/128 PNG) — không có trường `action`.
- `npm run package` tạo `mermaid-preview-google-chat-v1.0.0.zip` từ nội dung `dist/` (icons được copy vào `dist/icons/` trước khi zip).

### Known Limitation

**PNG là best-effort, không phổ quát.** Flowchart và diagram dùng `<foreignObject>` HTML làm canvas bị tainted → extension tự động fallback về SVG + notice. SVG là định dạng chất lượng chính, lossless, phổ quát. Xem ADR-MAIN-008 và release notes v1.3.0 (internal) để biết chi tiết kỹ thuật.

### Tài liệu Deployment (US-008 — AC-4, AC-5, AC-6)

| Tài liệu | Đường dẫn |
|---|---|
| Deployment Plan (CWS first publish) | `docs/06-deployment/MAIN/Deployment-Plan-CWS.md` |
| Store Listing Draft | `docs/06-deployment/MAIN/Store-Listing.md` |
| Runbook (bao gồm §7 Rollback CWS) | `docs/06-deployment/MAIN/Runbook.md` |

### Go/No-Go Checklist (v1.0.0 — REL-MAIN-2026-06-12-2)

| Hạng mục | Trạng thái | Ghi chú |
|---|---|---|
| Gate 1 (Planning) | PASS | CR-MAIN-2026-06-12-02 human-approved; Path B, v1.0.0 |
| Gate 2 (Requirements) | PASS | AC-1..AC-6 đầy đủ; scope phê duyệt `2026-06-12T03:53:41Z` |
| Gate 3 (Design) | PASS | ADR không cần cho phase này (docs-only AC-4..AC-6); AC-1..AC-3 không thay đổi logic render |
| Gate 4 (Development) | PASS | PR: `PR-MAIN-US-008`; AC-1/AC-2/AC-3 reviewed Approve |
| Gate 5 (Testing) | PASS | 181/181 tests pass; 81.11% branch (≥ 80% threshold); 0 critical / 0 major defect; TC-MAIN-US-008 |
| Open critical/major defects | 0 | 0 critical, 0 major — không có defect chặn release |
| Packaging verified | YES | `npm run package` → `mermaid-preview-google-chat-v1.0.0.zip`; zip chứa manifest, content.js, background.js, icons/ |
| Version consistency | YES | `manifest.json` = 1.0.0; `package.json` = 1.0.0; tên zip = v1.0.0 |
| Rollback documented | YES | Runbook §7A (load-unpacked) và §7B (CWS: unpublish hoặc hotfix v1.0.1); phân biệt rõ hai ngữ cảnh |
| Store Listing draft sẵn sàng | YES | `docs/06-deployment/MAIN/Store-Listing.md` — title, summary, description (VI+EN), category, privacy, permission justification |
| Deployment Plan sẵn sàng | YES | `docs/06-deployment/MAIN/Deployment-Plan-CWS.md` — 8 bước từng bước có validation |
| Images pending on Dashboard | PENDING | 128×128 store icon + ≥1 screenshot (1280×800) chưa upload — operator thực hiện trên Dashboard trước khi submit |
| rollback_tested | N/A (waived) | Bản Store công khai đầu KHÔNG có version cũ để rollback; Store rollback = unpublish/disable hoặc hotfix v1.0.1 (Runbook §7B) — không thể pre-test trước khi publish. Human GO bao trùm rủi ro này. |

### Quyết định Go/No-Go (v1.0.0)

**GO — phê duyệt phát hành công khai Chrome Web Store bởi human (product owner) ngày `2026-06-12T04:45:56Z`.**

- **Cơ sở:** Toàn bộ Gate 1–5 PASS; 0 defect critical/major; 181 test pass, branch 81.11%; packaging verified (`mermaid-preview-google-chat-v1.0.0.zip`, 859 KB, không lọt asset thừa); version nhất quán 1.0.0; rollback documented (Runbook §7A/§7B).
- **Icon:** 16/48/128 PNG sinh từ icon thương hiệu gốc `assets/icon-raw.png` (1024×1024) bằng `sips`; script sinh icon placeholder tạm (`scripts/gen-icons.mjs`) đã gỡ bỏ; raw giữ ở `assets/` (không ship trong gói).
- **Việc operator còn lại (thủ công, ngoài phạm vi tự động):** đăng ký CWS developer + phí ~$5, upload `mermaid-diagram-...zip`, upload ảnh Dashboard (128×128 store icon + ≥1 screenshot 1280×800 + promo 440×280), điền Listing + Privacy, submit review. Theo `Deployment-Plan-CWS.md`.

> Đây là quyết định phát hành; thao tác submit thực tế lên Chrome Web Store do human/operator thực hiện thủ công trên Developer Dashboard (Claude không thể tự upload). Không deploy tự động.

---

---

## v1.3.0 — PNG + SVG download buttons cho mỗi sơ đồ Mermaid (internal build)

**Release ID:** `REL-MAIN-2026-06-12-1`
**Version bump:** v1.2.0 → v1.3.0 — tính năng mới additive (download control); không phá vỡ tương thích ngược; minor-bump theo SemVer phù hợp.
**Kênh phân phối:** Load-unpacked (internal — chưa bao giờ public).

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

### Go/No-Go Decision (v1.3.0)

**GO — phê duyệt deploy production (load-unpacked) bởi human ngày `2026-06-12T03:19:55Z`.**

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

---

---

## v1.2.0 — Fullscreen-zoom overlay for Mermaid diagrams (internal build)

**Release ID:** `REL-MAIN-2026-06-11-2`
**Version bump:** v1.1.0 → v1.2.0 — đây là tính năng mới đáng kể dành cho người dùng (overlay + zoom/pan hoàn chỉnh), không chỉ là bugfix; minor-bump (1.2.0) theo SemVer phù hợp cho bổ sung feature tương thích ngược.
**Kênh phân phối:** Load-unpacked (internal — chưa bao giờ public).

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

## v1.1.0 — Auto light/dark theme + core features (internal build)

**Release ID:** `REL-MAIN-2026-06-11`
**Ngày phát hành:** `2026-06-11T15:25:45Z`
**Kênh phân phối:** Load-unpacked (internal — chưa bao giờ public).

> v1.0.0 nội bộ không khả dụng khi nạp thực tế (xem INC-01/INC-02); v1.1.0 là bản hoạt động đầu tiên đã xác nhận trên chat.google.com, kèm tính năng auto theme.

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
