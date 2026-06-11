---
status: "Accepted"
date: "2026-06-11T11:02:15Z"
deciders: "architect"
---

# ADR-MAIN-001: Build toolchain và kiến trúc Manifest V3 cho extension

## Context
MAIN-US-001 dựng nền cho toàn extension; các story sau (phát hiện, render, toggle) đều xây trên cấu trúc và pipeline build được chốt ở đây, nên đây là quyết định khó đảo ngược. Các ràng buộc:

- **Manifest V3 bắt buộc:** Chrome đã ngừng MV2; MV3 cấm remote code, dùng service worker thay background page, và content-script phải được bundle sẵn lúc build.
- **TypeScript strict** đã chốt ở Coding-Standards; cần một bundler biên dịch TS → JS chạy được trong content-script (môi trường không có module loader của trang).
- **Mermaid** (sẽ thêm ở US-003) là dependency nặng, phải bundle được — bundler phải xử lý được cây phụ thuộc lớn.
- **Bảo trì bền:** Google Chat đổi DOM bất kỳ lúc nào; ta muốn tối thiểu hoá phụ thuộc vào tooling bên thứ ba dễ bỏ rơi.
- 1 developer (small mode) — ưu tiên cấu hình đơn giản, ít "magic".

## Decision
We will dùng **Vite (multi-entry library build) + TypeScript strict** làm pipeline, và author **`manifest.json` thủ công** trong `public/`:

- Vite build nhiều entry độc lập: `src/content/index.ts` và `src/background/index.ts`, output **IIFE** (không phải ESM) vào `dist/` để chạy trực tiếp trong content-script/service-worker MV3.
- `manifest.json` viết tay trong `public/`, Vite copy nguyên trạng sang `dist/`. **Không** dùng `@crxjs/vite-plugin` — tránh phụ thuộc một plugin có rủi ro bảo trì cho phần manifest vốn ổn định và hiếm đổi.
- Cấu trúc thư mục: `src/content/` (inject DOM), `src/background/` (service worker), `src/lib/` (logic thuần, framework-agnostic, testable bằng Vitest).
- Manifest khai báo host permission tối thiểu `https://chat.google.com/*`, content-script match đúng origin đó, không `<all_urls>`.

## Consequences
- **Positive:** Pipeline tối giản, ít phụ thuộc tooling bên thứ ba; IIFE chạy thẳng trong content-script không cần loader; `src/lib/` tách bạch nên unit-test dễ đạt coverage 80%; Vite xử lý tốt bundle nặng như Mermaid sau này.
- **Negative / trade-offs:** Mất HMR/auto-reload tiện lợi mà `@crxjs` cung cấp — phải reload extension thủ công khi dev; manifest viết tay phải tự giữ đồng bộ với entry output.
- **Neutral / follow-ups:** Nếu sau này cần HMR mạnh có thể cân nhắc lại `@crxjs` ở một ADR mới (supersede). US-003 sẽ thêm Mermaid vào entry content-script.

## Alternatives Considered
| Option | Why rejected |
|---|---|
| `@crxjs/vite-plugin` | Tự sinh manifest + HMR tốt, nhưng thêm phụ thuộc plugin có lịch sử bảo trì không ổn định cho phần manifest vốn ít đổi — rủi ro khoá cứng pipeline. |
| esbuild thuần (không Vite) | Nhanh, nhưng cấu hình multi-entry + asset + dev server phải tự dựng; Vite gói sẵn các thứ này. |
| Webpack | Cấu hình nặng nề, build chậm hơn, overkill cho extension nhỏ 1 developer. |
| JS thuần, không build step | Không hợp TS strict đã chốt; không bundle được Mermaid (US-003). |

## NFR Coverage
- **Security (AC-4, AC-5):** Manifest chỉ khai báo host permission `https://chat.google.com/*`, content-script match đúng origin, không `<all_urls>`, không permission thừa. MV3 cấm remote code → toàn bộ bundle lúc build, không tải script ngoài runtime. Đáp ứng §7 Coding-Standards.
- **Performance (AC-3):** Content-script ở story này chỉ log nhận diện, footprint không đáng kể; build IIFE tách entry để chỉ nạp đúng script cần. Ngân sách render <300ms được giải quyết ở US-003 (Mermaid).
- **Reliability:** Service worker MV3 stateless; lỗi nạp content-script không ảnh hưởng trang chat (chỉ là script injected). Fallback render thuộc US-003.
- **Maintainability:** Tách `src/lib/` thuần để unit-test; manifest viết tay đơn giản, dễ audit permission.
