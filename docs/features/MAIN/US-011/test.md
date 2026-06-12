---
us: "MAIN-US-011"
suite: "Hỗ trợ thêm domain mail.google.com (Google Chat nhúng trong Gmail)"
version: "1.0"
author: "qa-engineer"
---

# Test Case Specification

> Thay đổi giới hạn ở `public/manifest.json` (config tĩnh). Test tự động: `npx vitest run tests/manifest.test.ts` (4 test, pass) — đọc trực tiếp `public/manifest.json`. Full suite `npx vitest run` → 190 pass, không hồi quy. Hành vi inject vào iframe Chat thật trong Gmail không kiểm được bằng test tĩnh manifest ⇒ xác minh thủ công ở TC-03.

## Test Cases

### TC-MAIN-US-011-01: `matches` phủ cả chat.google.com và mail.google.com
| Field | Value |
|---|---|
| **Requirement / AC** | AC-1, AC-3 |
| **Priority** | High |
| **Type** | Functional |
| **Preconditions** | `public/manifest.json` đã sửa |
| **Steps** | Đọc `content_scripts[0].matches`; kiểm tra độ dài `content_scripts` và `js` |
| **Expected** | `matches === ['https://chat.google.com/*', 'https://mail.google.com/*']`; đúng 1 mục content_scripts; `js === ['content.js']` |
| **Result** | Pass |

### TC-MAIN-US-011-02: `all_frames: true` để phủ iframe con
| Field | Value |
|---|---|
| **Requirement / AC** | AC-2 |
| **Priority** | High |
| **Type** | Functional |
| **Preconditions** | `public/manifest.json` đã sửa |
| **Steps** | Đọc `content_scripts[0].all_frames` |
| **Expected** | `all_frames === true` |
| **Result** | Pass |

### TC-MAIN-US-011-03: Render Mermaid trong panel Chat của Gmail (thủ công)
| Field | Value |
|---|---|
| **Requirement / AC** | AC-1, AC-2 (xác nhận runtime) |
| **Priority** | High |
| **Type** | Functional / Manual smoke |
| **Preconditions** | Build `npm run build`, load `dist/` (unpacked) vào Chrome, đăng nhập Gmail có panel Chat |
| **Steps** | Mở `https://mail.google.com`, mở panel Chat/Spaces, mở một space chứa tin nhắn có code block ` ```mermaid `; quan sát |
| **Expected** | Sơ đồ Mermaid được render inline trong iframe Chat của Gmail (giống trên chat.google.com); không lỗi console |
| **Result** | Chưa chạy — chờ xác nhận thủ công của người dùng sau khi load build (giới hạn đã ghi ở story.md) |

### TC-MAIN-US-011-04: Least-privilege giữ nguyên (không quyền thừa)
| Field | Value |
|---|---|
| **Requirement / AC** | AC-4 |
| **Priority** | High |
| **Type** | Security |
| **Preconditions** | `public/manifest.json` đã sửa |
| **Steps** | Serialize manifest; kiểm tra `<all_urls>`, `permissions`, `host_permissions` |
| **Expected** | Không chứa `<all_urls>`; `permissions` và `host_permissions` đều `undefined`; `matches` chỉ 2 host Google |
| **Result** | Pass |

### TC-MAIN-US-011-05: Không hồi quy logic DOM
| Field | Value |
|---|---|
| **Requirement / AC** | AC-5 |
| **Priority** | Medium |
| **Type** | Regression |
| **Preconditions** | Toàn bộ suite |
| **Steps** | `npx vitest run`; `git diff --name-only` |
| **Expected** | 190 pass; chỉ `public/manifest.json` + `tests/manifest.test.ts` đổi trong src/test logic; `src/lib/*`, `src/content/*` không đổi |
| **Result** | Pass |

## Defect summary
| Severity | Count |
|---|---|
| Critical | 0 |
| Major | 0 |
| Minor | 0 |

Không có defect mở. TC-03 là smoke test thủ công deferred (không phải defect) — đã ghi nhận là giới hạn của test tĩnh manifest. Gate 5 (no open critical/major) — pass.
