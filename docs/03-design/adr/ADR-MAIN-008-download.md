---
status: "Accepted"
date: "2026-06-12T02:01:05Z"
deciders: "architect"
---

# ADR-MAIN-008: Tải sơ đồ — SVG vector (lossless, phổ quát) + PNG best-effort với auto-fallback SVG khi taint (Option A)

## Context
US-007 thêm khả năng **tải** mỗi diagram render thành công ra ảnh ngoài Google Chat: **PNG** độ phân giải cao nền trong suốt và **SVG** vector gốc. UX đã chốt ở Gate-1: **hai nút riêng "PNG" và "SVG"** (không menu), gia nhập hàng control hiện có (Zoom, Toggle) theo đúng mô hình control đã thiết lập (ADR-MAIN-004/007): gắn trên success path, idempotent theo cấu trúc, gỡ bởi `resetPreviews`, KHÔNG gắn trên block lỗi. Logic ở module mới `src/lib/download.ts`.

Forces / ràng buộc:

- **Quyết định sản phẩm đã KHOÁ (Gate-1, không xét lại):** hai nút PNG/SVG riêng; PNG = độ phân giải cao, **nền TRANSPARENT**, **chữ sắc nét**; SVG = vector gốc lossless.
- **Mô hình control đã thiết lập (tái dùng, không tái-suy):** controls tạo **một-lần-theo-cấu-trúc** từ success path đã-idempotent của `renderMermaidBlock`; đặt sau preview container bằng `preview.after()` để sống qua toggle preview/source; `resetPreviews` gỡ **mọi** sibling-control theo marker. (Trí nhớ kiến trúc epic MAIN; ADR-MAIN-004/006/007.)
- **`securityLevel:'strict'` (ADR-MAIN-003) không được nới:** chỉ thao tác DOM do extension tạo (`cloneNode`/`createElement`/`XMLSerializer`); KHÔNG `innerHTML` HTML untrusted; không tăng bề mặt XSS.
- **Bám DOM Chat từng gây "bỏng" (INC-MAIN-2026-06-11-02):** cơ chế tải không phụ thuộc layout/CSS Chat.
- **Testability:** đường raster (`canvas`/`Image`/`toBlob`) và `URL.createObjectURL` KHÔNG có/không đáng tin trong jsdom (như giới hạn đã ghi ở US-006). Phải có seam tiêm được (như `MermaidRenderer` của render.ts) để test serialize/filename/idempotency/cleanup/error mà không cần canvas/Image thật.

**Phát hiện then chốt — đã kiểm chứng trên source bundled, KHÔNG suy diễn:** Mermaid **11.15.0** (bản extension đang bundle) quyết định nhãn HTML qua `getEffectiveHtmlLabels(config)`:

```
getEffectiveHtmlLabels = (config) =>
  evaluate(config.htmlLabels ?? config.flowchart?.htmlLabels ?? true);
```

Hàm này **KHÔNG tham chiếu `securityLevel`**. Config của extension (`{ startOnLoad:false, securityLevel:'strict' }`, ADR-MAIN-003) **không set `htmlLabels`**, nên `htmlLabels` mặc định **`true`**. Hệ quả: **nhãn của flowchart** (loại diagram phổ biến nhất) render thành `<foreignObject>` chứa HTML, KHÔNG phải `<text>` SVG thuần. (`strict` chỉ `removeScript` nội dung HTML, vẫn phát ra foreignObject.) Đây là cái bẫy trực tiếp của AC-3:

- SVG có `<foreignObject>` HTML nạp qua `<img>` rồi vẽ lên canvas **làm canvas bị TAINTED** ⇒ `toBlob` ném `SecurityError` (xác nhận thực nghiệm dưới: lỗi **luôn được NÉM**, KHÔNG phải "thành công âm thầm với nhãn trắng"). Đây là điểm cốt yếu để Option-A fallback đáng tin: vì lỗi **quan sát được** (throw), handler key vào throw để fallback — không có ca "PNG thành công nhưng mất chữ mà không ai biết".
- Đối chiếu các loại khác: timeline `byFo` chỉ dùng khi `textPlacement==='fo'` (không mặc định) và còn bọc trong `<switch>` + fallback `byTspan` (degrade về SVG text) — không phải rủi ro mặc định. Rủi ro chính là **flowchart htmlLabels** (taint).

⇒ "PNG chữ sắc nét cho **mọi** diagram qua img→canvas" **không phải thứ giao được phổ quát** với output Mermaid hiện tại. Điều này va vào quyết định đã khoá ở Gate-1 và **phải để con người biết** (xem mục Gate sign-off cuối ADR) — không được lặng lẽ định nghĩa lại "crisp text" thành "crisp text đôi khi".

**KIỂM CHỨNG THỰC NGHIỆM trên Chrome thật (DevTools, không phải suy diễn/recall):** probe Mermaid 11.15.0, scale 3x, canvas trong suốt, đường `blob:` URL → `<img>` → `drawImage` → `toBlob`:
- **flowchart (htmlLabels):** **7 `<foreignObject>`, 0 `<text>`**. Canvas **TAINTED** ⇒ `toBlob` ném `SecurityError: Tainted canvases may not be exported`; `getImageData` cũng ném. **Không sửa được bằng config:** ngay cả khi `flowchart.htmlLabels=false` có hiệu lực (verify qua `getConfig`) VÀ thêm khối frontmatter `config:`, Mermaid 11.15.0 **vẫn** phát 7 foreignObject / 0 text ⇒ nhãn `<text>` native KHÔNG tiếp cận được qua config (xác nhận finding `getEffectiveHtmlLabels` đúng ở mức source-behavior).
- **sequenceDiagram (native text):** **0 foreignObject, 7 `<text>`**. Canvas **KHÔNG tainted** ⇒ `toBlob` OK (~60KB, 386k px không-trong-suốt); screenshot xác nhận PNG 3x **sắc nét, nền trong suốt**.
- **Kết luận:** PNG sắc nét + trong suốt **chạy được** cho diagram dùng `<text>` SVG native (sequence/class/state/er/…); PNG **hard-fail (taint)** chỉ với diagram foreignObject (flowchart/graph — ca phổ biến).

## Decision

### 1. SVG export = đường chất lượng **phổ quát, lossless** (luôn đúng cho mọi loại diagram)
"Tải sơ đồ chất lượng tốt nhất" được bảo đảm bởi **SVG**, không phải PNG. SVG export:
- Lấy node `<svg>` trong preview container đã render, **`cloneNode(true)`** (clone — không di chuyển SVG gốc; giữ message + toggle US-004 nguyên vẹn — trí nhớ kiến trúc epic MAIN).
- Đảm bảo self-contained tối thiểu cho file độc lập: set/giữ thuộc tính **`xmlns="http://www.w3.org/2000/svg"`** (và `xmlns:xhtml` nếu có foreignObject) trên root, set `width`/`height` từ viewBox/bounding nếu thiếu.
- `XMLSerializer().serializeToString(clone)` → `Blob([str], { type: 'image/svg+xml' })` → tải.
- **Không** canvas, **không** taint, **không** vấn đề foreignObject — đúng cho **mọi** loại diagram (flowchart, sequence, class, …). Đây là export "chất lượng tốt nhất" thực sự.

### 2. PNG export = **best-effort, với AUTO-FALLBACK xác định sang SVG khi taint** (Option A — human-approved)
**Quyết định con người (Option A, đã khoá tại human gate 2026-06-12, CR-MAIN-2026-06-12-01):** giữ **cả hai** nút; **SVG là đường chất lượng chính** (luôn chạy, lossless); **PNG là best-effort** — khi `toBlob` ném `SecurityError` (hoặc trả blob `null`), **TỰ ĐỘNG fallback tải SVG thay thế** + một **notice nhẹ, không chặn** cho người dùng. **KHÔNG** rewrite foreignObject→text, **KHÔNG** renderer nặng. PNG rasterize chính clone SVG trên-màn-hình (cùng nguồn với SVG export); cố ý KHÔNG re-render `htmlLabels:false` (xem mục "Đã loại re-render").

- Nguồn raster = `cloneNode(true)` của `<svg>` trên-màn-hình, đảm bảo self-contained (`xmlns`, `width/height`) y như SVG export.
- Raster: nạp chuỗi SVG self-contained qua một `<img>` từ **`blob:` URL** (`URL.createObjectURL(new Blob([svgStr],{type:'image/svg+xml'}))`) — KHÔNG `data:` URL: blob tránh giới hạn độ dài data-URL với SVG lớn và rẻ bộ nhớ hơn; **`URL.revokeObjectURL` dọn** sau khi `img.onload`/raster xong (và trên đường lỗi). Vẽ `img` lên `<canvas width=w*scale height=h*scale>` qua `ctx.scale(s,s); ctx.drawImage(...)`.
- **Transparency:** **KHÔNG** `fillRect` nền canvas — canvas mặc định trong suốt, giữ nguyên (AC-3; xác nhận thực nghiệm: sequence PNG 3x trong suốt + sắc nét).
- **Scale (hàm thuần, test được):** `pngScale(dpr) = clamp(round(dpr) || 3, 2, 4)` — làm tròn `devicePixelRatio` về số nguyên rồi kẹp `[2,4]`; fallback **3** khi `dpr` không xác định/≤0/NaN (ví dụ jsdom). Tách thành **hàm thuần** (như `computeFitScale` của zoom.ts) ⇒ unit-test được dù bước raster thì không.
- `canvas.toBlob(cb, 'image/png')` → nếu blob hợp lệ: tải PNG.
- **AUTO-FALLBACK xác định (cốt lõi Option A):** nếu raster reject với `SecurityError` (canvas tainted — flowchart, đã kiểm chứng) **hoặc** `toBlob` trả `null`, PNG handler **KHÔNG fail lặng**: nó gọi **đúng đường SVG save** (cùng `BlobSaver.save` với blob `image/svg+xml`, tên `mermaid-diagram-<n>.svg`) **VÀ** hiển thị một **notice nhẹ không chặn** ("Đã tải SVG thay PNG cho sơ đồ này"). ⇒ bấm "PNG" trên flowchart **luôn cho ra một file dùng được** (SVG), không bao giờ là no-op im lặng. Hành vi này **tất định** và test được (rasterizer stub ném ⇒ assert SVG blob đã save + notice hiện).
- **Phạm vi (xác nhận thực nghiệm Chrome):** PNG đúng đầy đủ + trong suốt cho diagram nhãn `<text>` SVG (sequence/class/state/er/…); flowchart/graph (foreignObject) ⇒ taint ⇒ auto-fallback SVG. SVG luôn là đường chất lượng phổ quát.

#### Đã loại re-render `htmlLabels:false` (vì sao KHÔNG dùng seam re-render)
Phương án "re-render `htmlLabels:false` để lấy SVG nhãn `<text>` cho raster" **bị loại** vì nó KHÔNG cô lập được và tái-rò config toàn cục:
- Mermaid `initialize` là **singleton toàn cục**; `defaultRenderer` (render.ts) cache `initializedTheme` và **bỏ qua re-init khi theme không đổi**. Nếu đường PNG `initialize({...,htmlLabels:false})`, setting đó **dính trên singleton**; lần render **trên-màn-hình** kế tiếp cùng theme trúng cache-guard, bỏ qua re-init, **kế thừa `htmlLabels:false`** ⇒ hỏng nhãn trên-màn-hình của US-003..006. Đây đúng là hồi quy mà phương án global-`htmlLabels:false` bị loại để tránh — re-render chỉ làm nó tạm thời và khó thấy hơn.
- Ngoài ra `MermaidRenderer` seam là `render(id, source, theme)` — **không có tham số `htmlLabels`**; và `attachDownload(preview, doc)` không nhận `source`/`theme`. Re-render đòi đổi cả seam lẫn chữ ký + mutate-rồi-restore global state — đánh đổi không xứng so với việc SVG đã là đường chất lượng phổ quát.
⇒ Chọn raster best-effort từ clone trên-màn-hình: **không đụng global state, không đổi seam**, đơn giản; gate vốn đã fires trên "AC-3 có thể không đạt" nên phương án này không tốn thêm gì chưa được surface.

### 3. Cơ chế tải = `<a download>` DOM thuần (KHÔNG `chrome.downloads`, KHÔNG message-passing)
Tạo `Blob` → `URL.createObjectURL` → `<a>` với `download="mermaid-diagram-<n>.<ext>"` và `href=objectURL` → `a.click()` → `URL.revokeObjectURL` (sau click, dùng `setTimeout(…,0)` hoặc microtask để revoke không cắt ngang điều hướng tải). Anchor-click trong content script MV3 tải file được mà **không cần** `chrome.downloads` permission cũng không cần đường `src/background` message-passing — giảm quyền, giảm coupling, không tăng bề mặt. (Tham chiếu: `src/background` tồn tại nhưng KHÔNG dùng cho đường này — anchor DOM thuần là đủ và đơn giản hơn.)

### 4. Tên file
`mermaid-diagram-<n>.png` / `mermaid-diagram-<n>.svg`. `<n>` lấy **từ id tuần tự của US-003**: SVG render mang id `mermaid-preview-${counter}` (render.ts `nextDiagramId`). `attachDownload(preview, doc)` **parse `<n>` từ id của node `<svg>`** trong preview (regex `mermaid-preview-(\d+)`), fallback đếm cục bộ nếu không khớp. ⇒ tên ổn định, duy nhất theo thứ tự diagram, **không nhận `<n>` như tham số** (giữ chữ ký attach đồng dạng `attachZoom`); assertion test `filename === 'mermaid-diagram-3.png'` kiểm được trên seam serialize.

### 5. Idempotency + cleanup (đồng mô hình ADR-MAIN-007)
- `download.ts` export `DOWNLOAD_ATTR = 'data-mermaid-download'` và `attachDownload(preview: HTMLElement, doc: Document): HTMLElement` (trả container 2 nút PNG/SVG để caller/test điều khiển). Đặt **sau** preview container bằng `preview.after(...)` (cạnh zoom/toggle, sống qua toggle).
- Gọi `attachDownload(container, doc)` **ngay sau `attachZoom`** trong success path đã-idempotent của `renderMermaidBlock` ⇒ tạo **đúng một lần theo cấu trúc** (không marker idempotency riêng). Đường lỗi KHÔNG gọi ⇒ block lỗi không có nút download (AC-1).
- **`resetPreviews` mở rộng tập marker:** vòng gỡ control-siblings hiện quét `TOGGLE_ATTR || ZOOM_ATTR`; thêm `|| DOWNLOAD_ATTR` để nút download bị gỡ cùng container (không mồ côi — AC-6). Logic quét-theo-marker đã order-independent nên thêm marker là đủ.

### 6. Error handling — **fallback xác định trong click handler, KHÔNG chạm render path**
Export chạy trong **click handler async của nút** (không phải success path; success path chỉ gắn nút **đồng bộ**). Lỗi raster được **bắt trong click handler**, KHÔNG ném ra (luôn `revokeObjectURL` dọn) ⇒ về cấu trúc lỗi export KHÔNG thể chạm `renderMermaidBlock`. Phân loại đường lỗi:
- **`toBlob` `SecurityError` (taint) hoặc blob `null`** ⇒ **auto-fallback SVG + notice** (Option A, mục 2) — KHÔNG no-op im lặng; người dùng luôn nhận một file dùng được.
- **Lỗi khác** (`img.onerror`, exception bất ngờ) ⇒ bắt + no-op an toàn (tuỳ chọn log debug), không ném vào render path.
- **SVG export** (không canvas) gần như không có đường lỗi này; nó cũng là đích của fallback nên là đường "luôn chạy".

## Testable seam
Bước raster (canvas/Image/toBlob) không chạy trong jsdom ⇒ tiêm qua một seam (mirror `MermaidRenderer`):

```ts
// src/lib/download.ts
export const DOWNLOAD_ATTR = 'data-mermaid-download';

/** Injectable raster seam: turns a self-contained SVG string into a PNG blob.
 *  Default impl uses blob-URL + <img> + <canvas>.toBlob; tests inject a fake.
 *  Contract for the Option-A fallback: on a tainted canvas the default impl
 *  REJECTS with a DOMException 'SecurityError' (toBlob throws), and if toBlob
 *  yields a null blob it REJECTS too — the PNG handler keys off this to fall
 *  back to SVG. A test stub that rejects must therefore drive the SVG path. */
export interface PngRasterizer {
  toPng(svgString: string, width: number, height: number, scale: number): Promise<Blob>;
}

/** Injectable file-save seam: <a download> + objectURL + revoke.
 *  Separated so filename/cleanup logic is testable without URL.createObjectURL. */
export interface BlobSaver {
  save(blob: Blob, filename: string): void;
}

/** Injectable, non-blocking user notice (Option-A fallback message).
 *  Default impl shows a light transient toast in the page; tests inject a spy
 *  to assert the fallback notice fired. Must never throw / block. */
export interface Notifier {
  notify(message: string): void;
}

export interface DownloadOptions {
  rasterizer?: PngRasterizer;   // default: real canvas path (blob-URL + <img> + canvas.toBlob)
  saver?: BlobSaver;            // default: anchor-click path
  notifier?: Notifier;          // default: light transient toast; used by PNG→SVG fallback
}

/** Pure, unit-testable (no canvas): integer scale from devicePixelRatio. */
export function pngScale(dpr: number): number; // clamp(round(dpr) || 3, 2, 4)

export function attachDownload(
  preview: HTMLElement,
  doc: Document,
  opts?: DownloadOptions,
): HTMLElement; // returns the control container (2 buttons), placed via preview.after()
```

**Fallback contract (Option A — để developer TDD):** khi nút **PNG** được bấm, handler `await rasterizer.toPng(...)`:
- **resolve blob hợp lệ** ⇒ `saver.save(pngBlob, 'mermaid-diagram-<n>.png')`.
- **reject (`SecurityError`/taint) hoặc blob null-→-reject** ⇒ `saver.save(svgBlob, 'mermaid-diagram-<n>.svg')` **VÀ** `notifier.notify('Đã tải SVG thay PNG cho sơ đồ này')`. Đường này **tất định**: cùng input taint luôn cho cùng kết quả (SVG saved + notice). Nút **SVG** luôn đi thẳng đường SVG, không qua rasterizer.

**Ba seam tách bạch** (raster + save + notice) có chủ đích: `URL.createObjectURL`/canvas thường thiếu/không đáng tin trong jsdom. **Test jsdom phủ (gồm fallback):** nút tồn tại đúng một lần trên block `rendered`; không có nút trên block `error`; `resetPreviews` gỡ nút (không mồ côi); `pngScale` clamp đúng; filename `mermaid-diagram-<n>.{png,svg}` đúng `<n>` từ svg id; SVG export gọi `saver.save` với blob `image/svg+xml` chứa `xmlns`; **rasterizer stub resolve ⇒ `saver.save` PNG, KHÔNG notice**; **rasterizer stub ném `SecurityError` ⇒ `saver.save` SVG (đúng tên `.svg`) + `notifier.notify` được gọi đúng một lần** (cốt lõi Option A); **rasterizer trả null-→reject ⇒ cùng đường fallback**. **Không** phủ được trong jsdom (⇒ smoke gate dưới): pixel raster, taint thật, render foreignObject.

## Consequences
- **Positive:** SVG là đường export chất lượng phổ quát đúng-mọi-loại (lossless, không canvas/taint/foreignObject); PNG high-res nền trong suốt cho các loại nhãn `<text>` SVG (xác nhận thực nghiệm sequence 3x); **bấm PNG luôn cho file dùng được** nhờ auto-fallback SVG xác định khi taint (không bao giờ no-op im lặng — UX Option A); **KHÔNG đụng config render trên-màn-hình và KHÔNG đụng global Mermaid `initialize` state** ⇒ không hồi quy US-003..006 (raster từ clone trên-màn-hình, không re-render); nút tạo đúng-một-lần theo cấu trúc (không marker mới); tải bằng anchor DOM thuần (không thêm permission/coupling, giữ khung an ninh strict); ba seam (raster+save+notice) + `pngScale` thuần ⇒ test đầy đủ logic kể cả fallback trong jsdom.
- **Negative / trade-offs:** **PNG là best-effort, không phổ quát** — flowchart (và loại nhãn foreignObject) taint canvas ⇒ PNG không xuất được, fallback SVG (đã human-ack: SVG là đường chất lượng chính); nền trong suốt ⇒ chữ tối thấp tương phản trên nền tối (trade-off Gate-1 đã chấp nhận); thêm seam (`PngRasterizer`,`BlobSaver`,`Notifier`) và một notice nhẹ trong trang.
- **Neutral / follow-ups:** nhãn nút "PNG"/"SVG" + chuỗi notice tĩnh (chưa i18n); jsdom không raster ⇒ chất lượng pixel PNG thực sự được gác bởi **smoke gate** (dưới), không phải unit test (logic fallback thì test được); nếu sau muốn PNG đúng cho flowchart, cần một trong hai: re-render `htmlLabels:false` AN TOÀN (phải save/restore global `htmlLabels` + bust cache `initializedTheme` của render.ts để không hỏng trên-màn-hình) hoặc serializer foreignObject-aware — **để mở, không làm bây giờ** vì SVG (qua fallback) đã phủ chất lượng flowchart.

## Alternatives Considered
| Option | Why rejected |
|---|---|
| Inline style foreignObject trong serializer để self-contained | Sai tiền đề: vấn đề không phải self-containment style mà là Chromium không render foreignObject qua img→canvas + có thể taint. Inline không sửa được. |
| Set `htmlLabels:false` **toàn cục** trong config render US-003 | Đổi rendering **trên-màn-hình** của MỌI diagram đã ship v1.2.0 (text vs HTML wrap/style khác) ⇒ hồi quy feature đã ship + sửa ADR-MAIN-003 đã Accepted ⇒ KHÔNG phải edit đơn phương của architect. |
| Re-render `htmlLabels:false` chỉ-cho-raster qua `MermaidRenderer` seam | Tưởng cô lập nhưng KHÔNG: Mermaid `initialize` là singleton toàn cục và `defaultRenderer` cache `initializedTheme` bỏ qua re-init cùng theme ⇒ `htmlLabels:false` **dính trên singleton**, render trên-màn-hình kế tiếp kế thừa ⇒ tái-rò đúng hồi quy US-003..006 (chỉ tạm thời, khó thấy hơn). Còn đòi đổi seam (`render` không có tham số `htmlLabels`) + chữ ký `attachDownload` (không có `source`/`theme`). Không xứng vì SVG đã phủ chất lượng flowchart. |
| `chrome.downloads` API | Cần thêm permission `"downloads"` trong manifest; anchor `<a download>` DOM thuần trong content script đã tải được file — ít quyền hơn, đủ dùng. |
| Message-passing qua `src/background` để tải | Thêm coupling content↔background không cần thiết; anchor DOM thuần đơn giản, đồng bộ với mô hình "DOM do extension tạo". |
| `data:` URL thay `blob:` cho `<img>` SVG | Data-URL có giới hạn độ dài và tốn bộ nhớ với SVG lớn; blob URL rẻ hơn + có `revokeObjectURL` dọn rõ ràng. |
| Nhận `<n>` filename như tham số `attachDownload` | Lệch chữ ký `attach*` (zoom/toggle nhận `(preview, doc)`); parse `<n>` từ svg id tự-chứa nguồn US-003, giữ đồng dạng. |

## NFR Coverage
- **Security:** chỉ `cloneNode`/`createElement`/`XMLSerializer`/`Blob` trên DOM do extension tạo; KHÔNG `innerHTML` untrusted; `securityLevel:'strict'` (ADR-MAIN-003) không đổi; không thêm permission (anchor DOM thuần) ⇒ không tăng bề mặt XSS.
- **Reliability / không rò rỉ:** mọi object URL `revokeObjectURL` trên cả đường thành công và lỗi; raster `SecurityError`/null-blob ⇒ **fallback xác định sang SVG + notice** (không no-op im lặng, người dùng luôn có file), lỗi khác ⇒ no-op an toàn — cả hai bắt trong click handler, KHÔNG chạm render path; nút gỡ sạch bởi `resetPreviews` (marker mới vào vòng quét).
- **Performance:** SVG export thuần serialize (rẻ); PNG raster một lượt từ clone trên-màn-hình rồi revoke khi bấm nút (không re-render, không trên render path, không tích luỹ DOM/URL).
- **Maintainability / Testability:** ba seam `PngRasterizer`/`BlobSaver`/`Notifier` + `pngScale` thuần + tiêm `doc` ⇒ logic serialize/filename/idempotency/cleanup/error **và fallback Option A** (rasterizer ném ⇒ SVG saved + notice) test bằng jsdom không cần canvas; mô hình attach-một-lần đồng dạng zoom/toggle.

---

## Gate sign-off — ĐÃ human-approved (CONDITIONAL design gate SATISFIED → GREEN)

Gate thiết kế CONDITIONAL đã fire và **đã được con người quyết** tại human gate **2026-06-12** (CR-MAIN-2026-06-12-01) — Status **Accepted** giờ là human-approved, KHÔNG còn chờ ack.

1. **Bối cảnh đã trình con người:** Gate-1 khoá "PNG: chữ sắc nét". Kiểm chứng **source + thực nghiệm Chrome thật** (Mermaid 11.15.0: flowchart 7 foreignObject/0 text ⇒ canvas tainted ⇒ `toBlob` `SecurityError`, không sửa được bằng config; sequence 0 fo/7 text ⇒ PNG 3x sắc nét trong suốt OK) cho thấy **PNG chữ sắc nét cho mọi loại diagram qua img→canvas KHÔNG giao được phổ quát** — flowchart (ca PHỔ BIẾN NHẤT) hard-fail taint.
2. **Quyết định con người (Option A, locked):** giữ **cả hai** nút; **SVG là đường chất lượng chính** (luôn chạy, lossless); **PNG best-effort** với **auto-fallback SVG xác định + notice nhẹ** khi `SecurityError`/null-blob; KHÔNG rewrite foreignObject→text, KHÔNG renderer nặng. ADR đã cập nhật theo đúng Option A (mục 2 + Testable seam). ⇒ "PNG crisp text" được định nghĩa lại **một cách công khai, có con người duyệt**, không phải lặng lẽ ⇒ **gate SATISFIED**.

### Smoke gate bắt buộc (chỗ chất lượng raster thực sự được gác — jsdom không thấy raster trắng/tainted)
Cho **mỗi loại diagram được hỗ trợ** (tối thiểu flowchart, sequence, class):
- [ ] Diagram **native text** (sequence/class/…): PNG xuất ra **chứa đủ chữ mọi nhãn**, nền **trong suốt**, `toBlob` không ném.
- [ ] Diagram **foreignObject** (flowchart/graph): bấm PNG ⇒ **auto-fallback tải SVG** + **notice hiện** (không no-op im lặng, không file rỗng).
- [ ] Nút SVG luôn xuất vector gốc lossless mở được, mọi loại diagram.
