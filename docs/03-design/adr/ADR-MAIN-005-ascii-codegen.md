---
status: "Accepted"
date: "2026-06-11T14:08:15Z"
deciders: "architect"
---

# ADR-MAIN-005: Ép output bundle thành ASCII-only để Chrome nạp được content script

## Context
Sau khi release MAIN v1.0.0, smoke test thật phát hiện Chrome **từ chối nạp** extension:

> Could not load file 'content.js' for content script. It isn't UTF-8 encoded.

Điều tra (Incident INC-MAIN-2026-06-11-01) cho thấy:

- `dist/content.js` **hợp lệ UTF-8 về byte** (`file`, Python `.decode('utf-8')` đều pass) — không có byte sai, không BOM.
- Nhưng Chrome nạp content script qua `base::IsStringUTF8()`, hàm này **nghiêm hơn** chuẩn UTF-8: nó từ chối cả **Unicode non-characters** (U+FFFE, U+FFFF, U+FDD0–U+FDEF).
- Bundle Mermaid (minified) chứa **đúng 1 ký tự non-character U+FFFF** (offset 266866) nằm trong một regex range `[…豈-￿]` của một dependency parse CSS/identifier. Đây là thủ phạm.
- **Rolldown** (bundler/minifier của Vite 8) **không có** option xuất ASCII (`CodegenOptions` chỉ có `removeWhitespace`/`legalComments`); `config.esbuild.charset` bị bỏ qua (oxc là engine — Vite cảnh báo rõ).

## Decision
We will **post-process mọi JS chunk thành ASCII-only** sau minify, bằng một Vite plugin (`generateBundle` hook) gọi `escapeNonAscii` (`build/ascii-escape.ts`):

- Escape **theo từng UTF-16 code unit** > `0x7F` thành `\uXXXX` (astral char → cặp surrogate `\uD8XX\uDCXX`).
- Escape theo code unit (không theo code point) giữ nguyên ngữ nghĩa trong **cả** string literal **và** regex literal, có hay không có cờ `u` — đúng cách esbuild `charset:'ascii'` và terser `ascii_only` làm.
- An toàn vì các ký tự non-ASCII trong bundle đã minify chỉ nằm trong string/regex/template literal, không bao giờ ở vị trí identifier. Kiểm chứng: `node --check dist/content.js` pass sau escape; round-trip test trong `tests/ascii-escape.test.ts`.

## Consequences
- **Positive:** content.js thuần ASCII (nonASCII=0, nonChar=0) → Chrome nạp được; fix độc lập với minifier (không phụ thuộc rolldown có thêm option hay không); chặn luôn mọi non-character tương lai từ bản Mermaid mới.
- **Negative / trade-offs:** kích thước tăng nhẹ (~+7KB do escape giãn ký tự, gzip gần như không đổi); thêm một bước post-process trong build.
- **Neutral:** `build/ascii-escape.ts` nằm ngoài `src/` nên không tính vào coverage runtime; có unit test riêng ở `tests/`.

## Alternatives Considered
| Option | Why rejected |
|---|---|
| `config.esbuild.charset = 'ascii'` | Vite 8 dùng oxc/rolldown, không phải esbuild → option bị bỏ qua (đã thử, output không đổi, Vite cảnh báo). |
| Đổi `build.minify` sang `terser` + `format.ascii_only` | Đúng về mặt kỹ thuật nhưng thêm dependency nặng và phụ thuộc tích hợp terser của rolldown-vite (không chắc chắn); plugin post-process nhẹ hơn và tự chủ. |
| Chỉ escape riêng U+FFFF | Hẹp và giòn — bản Mermaid sau có thể sinh non-character khác; escape toàn bộ non-ASCII là giải pháp tổng quát, tất định. |
| Patch thủ công regex trong Mermaid | Sửa node_modules không bền, mất khi reinstall. |

## NFR Coverage
- **Reliability:** sửa đúng root cause (Chrome `IsStringUTF8` reject non-character), không che triệu chứng; có regression test.
- **Security:** chỉ escape biểu diễn ký tự, không đổi hành vi runtime; không thêm bề mặt tấn công.
- **Maintainability / Testability:** hàm thuần `escapeNonAscii` có test round-trip; verify build bằng `node --check` + quét non-ASCII.
