---
incident_id: "INC-MAIN-2026-06-11-01"
date: "2026-06-11T14:08:15Z"
duration: "~30m"
severity: "SEV2"
authors: "sre-maintainer"
status: "Final"
---

# Incident Postmortem — Chrome từ chối nạp content.js ("isn't UTF-8 encoded")

## 1. Summary
Ngay sau release MAIN v1.0.0, smoke test thủ công phát hiện Chrome không nạp được extension: lỗi "Could not load file 'content.js' ... It isn't UTF-8 encoded". Extension hoàn toàn không dùng được cho đến khi vá build. Phát hiện trước khi phân phối rộng nên không người dùng cuối nào bị ảnh hưởng.

## 2. Impact
- **Users affected:** 0 người dùng cuối (bắt được ở smoke test trước phân phối). Extension v1.0.0 như đã build ban đầu KHÔNG load được trên bất kỳ Chrome nào.
- **Business impact:** Không có breach SLA/doanh thu; release v1.0.0 ban đầu không khả dụng (DOA) — phải vá trước khi dùng.
- **Duration:** ~30 phút từ lúc phát hiện đến khi có fix đã verify.

## 3. Timeline (UTC)
| Time | Event |
|---|---|
| 2026-06-11T13:58Z | GO ghi nhận; release-manager đề nghị smoke test (đã được waive trong gate) |
| 2026-06-11T14:00Z | Người dùng chạy `Load unpacked` trong Chrome → lỗi "isn't UTF-8 encoded" (detection) |
| 2026-06-11T14:02Z | Điều tra: `file`/Python xác nhận file UTF-8 hợp lệ về byte → nghi ngờ check nghiêm hơn của Chrome |
| 2026-06-11T14:04Z | Quét tìm thấy 1 Unicode non-character U+FFFF trong regex range của Mermaid (root cause) |
| 2026-06-11T14:06Z | Xác định Rolldown không có option ASCII; viết plugin escape ASCII-only (TDD) |
| 2026-06-11T14:08Z | Rebuild: content.js nonASCII=0, `node --check` pass, 54 test xanh (resolved, chờ xác nhận Chrome) |

## 4. Root Cause Analysis
Bundle `content.js` (Mermaid minified) chứa **đúng 1 ký tự Unicode non-character U+FFFF** nằm trong một regex range `[…豈-￿]` của dependency parse identifier. File hợp lệ UTF-8 về byte, nhưng Chrome nạp content script qua `base::IsStringUTF8()` — hàm này từ chối Unicode non-characters (U+FFFE/U+FFFF/U+FDD0–U+FDEF). 5-Whys:
1. Vì sao Chrome báo lỗi? → `IsStringUTF8` reject file.
2. Vì sao reject dù file UTF-8 hợp lệ? → có non-character U+FFFF, bị `DO_NOT_ALLOW_NONCHARACTERS`.
3. Vì sao có U+FFFF? → Mermaid bundle nhúng nó literal trong regex range.
4. Vì sao không escape thành `￿`? → Rolldown (Vite 8) không xuất ASCII; không có option charset/asciiOnly.
5. Vì sao không phát hiện sớm? → test logic chạy jsdom/Node (không qua Chrome loader); build chưa có check ASCII; smoke test thật bị waive ở Go/No-Go.

## 5. Detection
Phát hiện thủ công khi `Load unpacked` (đúng bước smoke test §3.2 mà Go đã waive). Lẽ ra phát hiện được sớm hơn nếu (a) không waive smoke test, hoặc (b) build có check ASCII tự động (xem action items).

## 6. Resolution & Recovery
Thêm Vite plugin `asciiOnlyOutput` (`generateBundle`) gọi `escapeNonAscii` (`build/ascii-escape.ts`) escape mọi UTF-16 code unit > 0x7F thành `\uXXXX` sau minify — quyết định ADR-MAIN-005. Verify: `dist/content.js` nonASCII=0, nonChar=0, `node --check` pass, 54 test xanh. Cần người dùng `Retry` load trong Chrome để xác nhận end-to-end.

## 7. What Went Well / What Went Wrong
- **Went well:** Điều tra có hệ thống, không đoán mò; root cause chính xác (đúng cơ chế Chrome); fix tối thiểu, có test + verify.
- **Went wrong:** Release v1.0.0 ban đầu DOA; pipeline test không có tầng nào mô phỏng Chrome content-script loader; Go/No-Go waive smoke test bỏ lọt lỗi chí mạng.
- **Where we got lucky:** Bắt được ở smoke test thủ công trước khi phân phối; chỉ có 1 non-character nên triệu chứng rõ.

## 8. Action Items
| Action | Type | Owner | Due | Ticket |
|---|---|---|---|---|
| Plugin ASCII-only output + unit test (đã làm) | prevent | developer | 2026-06-11T14:08:15Z | ADR-MAIN-005 |
| Thêm build-check tự động: fail build nếu chunk có non-character/non-ASCII | detect | developer | 2026-06-18T00:00:00Z | CR-MAIN-2026-06-11-01 |
| Không waive smoke test cho release production lần sau; cập nhật DoD deploy | prevent | product-owner | 2026-06-18T00:00:00Z | — |
| Cân nhắc smoke test tự động qua Chrome (load unpacked) trong CI | detect | developer | backlog | — |

## 9. Lessons Learned
"UTF-8 hợp lệ về byte" ≠ "Chrome chấp nhận": Chrome content-script loader nghiêm hơn (cấm non-characters). Bundle bên thứ ba (Mermaid) có thể nhúng ký tự lạ; build cho extension nên **ép ASCII-only** và kiểm tra tự động. Smoke test thật trên trình duyệt đích là không thể thay thế bằng test jsdom — và không nên waive cho release production.
