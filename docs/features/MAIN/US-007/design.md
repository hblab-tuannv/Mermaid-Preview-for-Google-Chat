---
status: "Accepted"
date: "2026-06-12T02:01:05Z"
author: "architect"
---

# MAIN-US-007 — Design note: nút Download (PNG + SVG)

Quyết định kiến trúc đầy đủ: **ADR-MAIN-008-download** (`docs/03-design/adr/ADR-MAIN-008-download.md`). Đây là tóm tắt hình dạng module để developer TDD.

## Module shape
Module mới `src/lib/download.ts` (song song `zoom.ts`/`toggle.ts`):

- `export const DOWNLOAD_ATTR = 'data-mermaid-download';` — marker mới cho cleanup/detect/test.
- `export function attachDownload(preview: HTMLElement, doc: Document, opts?: DownloadOptions): HTMLElement;`
  - Tạo container 2 nút **"PNG"** và **"SVG"** (hai nút riêng — UX khoá Gate-1), mang `DOWNLOAD_ATTR`, đặt **sau** preview container bằng `preview.after(...)` (cạnh zoom/toggle, sống qua toggle preview/source). Trả container để caller/test điều khiển.
- `export function pngScale(dpr: number): number;` — **hàm thuần** (test được không cần canvas): `clamp(round(dpr) || 3, 2, 4)`.
- Seam tiêm (mirror `MermaidRenderer`): `interface PngRasterizer { toPng(svg, w, h, scale): Promise<Blob> }`, `interface BlobSaver { save(blob, filename): void }`, `interface Notifier { notify(message): void }`. `DownloadOptions = { rasterizer?, saver?, notifier? }`.

## Hai đường export (Option A — human-approved 2026-06-12, CR-MAIN-2026-06-12-01)
- **SVG (mục 1 ADR):** clone `<svg>` trên-màn-hình → đảm bảo `xmlns` + `width/height` → `XMLSerializer` → Blob `image/svg+xml` → save. Lossless, **phổ quát** (không canvas/taint/foreignObject), đúng mọi loại diagram — **đường chất lượng chính**.
- **PNG (mục 2 ADR):** **best-effort high-res**, raster clone trên-màn-hình (KHÔNG re-render). `blob:` URL → `<img>` → `<canvas w*scale h*scale>` → **KHÔNG fill nền** (transparent) → `toBlob('image/png')` → save. **Foreignobject (flowchart) ⇒ canvas tainted ⇒ `toBlob` ném `SecurityError`** (kiểm chứng Chrome thật; KHÔNG sửa được bằng config Mermaid 11.15.0) ⇒ **AUTO-FALLBACK tải SVG + `notifier.notify(...)`** (notice nhẹ không chặn). `revokeObjectURL` dọn mọi đường. PNG đúng cho diagram nhãn `<text>` native (sequence/class/…). (Re-render `htmlLabels:false` bị loại — xem Alternatives ADR.)

## Filename
`mermaid-diagram-<n>.{png,svg}`. `<n>` **parse từ id svg** `mermaid-preview-(\d+)` (id tuần tự US-003), fallback đếm cục bộ.

## Plug vào render.ts
- Success path của `renderMermaidBlock`: gọi `attachDownload(container, doc)` **ngay sau `attachZoom(container, doc)`** ⇒ tạo đúng-một-lần theo cấu trúc (không marker idempotency riêng). Đường lỗi KHÔNG gọi ⇒ block lỗi không có nút (AC-1/AC-2).
- `resetPreviews`: thêm `DOWNLOAD_ATTR` vào điều kiện vòng quét control-siblings (`TOGGLE_ATTR || ZOOM_ATTR || DOWNLOAD_ATTR`) ⇒ nút download gỡ cùng container, không mồ côi (AC-6).

## Error handling (fallback xác định)
Export chạy trong **click handler async** của nút; KHÔNG ném vào render path. PNG handler: `toBlob` `SecurityError`/null-blob ⇒ **auto-fallback `saver.save(svgBlob, '...svg')` + `notifier.notify(...)`** (không no-op im lặng); lỗi khác ⇒ no-op an toàn.

## Test boundary
jsdom phủ: nút một-lần trên `rendered`, không nút trên `error`, `resetPreviews` gỡ nút, `pngScale` clamp, filename `<n>`, SVG blob chứa `xmlns`; **rasterizer resolve ⇒ PNG saved, không notice**; **rasterizer ném `SecurityError` ⇒ SVG saved + notice gọi đúng một lần** (fallback Option A); null-blob ⇒ cùng fallback. **KHÔNG** phủ jsdom (⇒ smoke gate ADR): pixel raster, taint thật, render foreignObject.

## Gate
CONDITIONAL design gate **SATISFIED → GREEN** — human gate đã quyết Option A (2026-06-12, CR-MAIN-2026-06-12-01): SVG là đường chất lượng chính; PNG best-effort + auto-fallback SVG + notice. ADR-MAIN-008 (Accepted, human-approved) đã cập nhật theo Option A. Smoke gate bắt buộc vẫn liệt trong ADR.

## Related
- ADR-MAIN-008-download — quyết định rasterization + cơ chế tải.
- Phụ thuộc US-003 (ADR-MAIN-003 render/`MermaidRenderer` seam), US-006 (ADR-MAIN-007 mô hình control + `resetPreviews`).
