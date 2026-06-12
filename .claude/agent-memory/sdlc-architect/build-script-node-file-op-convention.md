---
name: build-script-node-file-op-convention
description: MAIN-epic build scripts do file-ops via node (-e fs.*), NOT shell CLIs — portability-conscious convention; packaging chose archiver dev-dep over zip CLI
metadata:
  type: project
---

`package.json` của epic MAIN cố ý làm file-operation bằng **node**, KHÔNG bằng shell CLI: `clean` = `node -e "fs.rmSync('dist',...)"` (không `rm -rf`), `copy:manifest` = `node -e "fs.copyFileSync(...)"` (không `cp`).

**Why:** quy ước cross-platform có chủ đích (chạy giống nhau macOS/Windows/Linux + CI tương lai; repo `engines.node>=20`, chưa có `.github/workflows`).

**How to apply:** mọi quyết định build-tooling mới phải tôn trọng quy ước này. Cụ thể ở US-008 (AC-3 packaging): chọn **`archiver`** (dev-dep zip lib thuần node) thay vì `zip` CLI hệ thống — CLI phá quy ước, không bảo đảm có trên Windows/CI, và `zip -j` làm phẳng mất subdir `icons/`. Icons-copy fix dùng `fs.cpSync(...,{recursive:true})` (node>=20), cùng pattern `copy:manifest`.

**Ngưỡng ADR cho build-tooling:** lựa chọn cơ chế zip / build-script **KHÔNG đạt ngưỡng ADR** (sửa một dòng script, không data migration, không đụng code ship `dist/`, đảo ngược tầm thường). Design-note item, không ADR ⇒ CONDITIONAL design gate KHÔNG fire. Phân biệt với [[overlay-and-control-cleanup-patterns]]: ghi chú "gate FIRES" ở đó chỉ áp cho quyết định **mô hình tương tác**, không phải build tooling.

**Supply-chain:** dev-dep dùng-lúc-build (archiver) KHÔNG bundle vào `dist/` ⇒ bề mặt với người dùng cuối = 0.
