## Summary
Detect **every** Mermaid diagram type — current and future — by trusting the explicit ` ```mermaid ` fence, and expand the keyword allowlist for unfenced blocks.

## What & Why
Implements US-009 per ADR-MAIN-009 (supersedes ADR-MAIN-002). `render` already uses the full `mermaid` library; the only gate blocking new diagram types (e.g. `xychart-beta`) was the hand-maintained keyword allowlist in detection. Two-tier fix, all in `src/lib/detect.ts`:

- **`stripLanguageTag(source)`** now returns `{ source, hadTag }` instead of a bare string (no external callers — only `detectMermaidBlocks` consumes it). `hadTag` reports whether an exact first-line `mermaid` tag was stripped (still case-insensitive, exact-match so `mindmap` is never touched).
- **`detectMermaidBlocks`** branches on `hadTag`:
  - **Fenced (`hadTag === true`)** → any non-empty body is a candidate, **skipping the keyword gate**. Google Chat preserves the `mermaid` tag as the first text line regardless of body (proven by INC-MAIN-2026-06-11-02 from real DOM), so this auto-covers all present and future diagram types. An unparseable body is caught by the existing render error-fallback. A bare `mermaid` tag with empty body is still ignored (nothing to render).
  - **Unfenced (`hadTag === false`)** → unchanged keyword heuristic `isMermaid`, to keep false positives off ordinary code.
- **`MERMAID_KEYWORDS`** extended with the missing types for the unfenced path: `xychart-beta`, `sankey-beta`, `block-beta`, `packet-beta`, `requirementDiagram`, `C4Context/Container/Component/Dynamic/Deployment`, `kanban`, `architecture-beta`, `radar-beta`, `treemap`. **`zenuml` deliberately excluded** from the unfenced list: it is an external (non-bundled) Mermaid diagram that `mermaid.render` cannot render in core (verified via `mermaid.detectType` post-`initialize`, mermaid 11.15.0), so adding it would turn a clean code block into a render-error marker. A fenced `zenuml` is still detected (fence-trust → AC-4 fallback).

No change to render/observe/theme/zoom/download.

## Related
- US: MAIN-US-009
- ADR: ADR-MAIN-009-detect-coverage (supersedes ADR-MAIN-002-mermaid-detection)
- Source: CR-MAIN-2026-06-12-03

## Type of change
- [x] New feature
- [ ] Bug fix
- [x] Breaking change
- [ ] Refactor / chore
- [ ] Documentation

> Breaking/behavior change (accepted, ADR-MAIN-009 + Gate-1): a block fenced ` ```mermaid ` with an unparseable body now shows the "could not render" marker instead of staying inert. Internal API: `stripLanguageTag` return type changed (no external callers).

## How to test
1. `npx vitest run --coverage` → 188 tests pass; `detect.ts` 100% stmt / 95.45% branch; overall ≥80% branch.
2. `npm run typecheck`, `npm run lint`, `npm run build` → exit 0.

New tests in `detect.test.ts`: fenced type outside the allowlist is detected (AC-1); newly added types detected unfenced (AC-2); fenced-but-invalid body is detected so render can fall back (AC-4); unfenced non-Mermaid still ignored (AC-3); `mindmap` not stripped (AC-5); idempotency unchanged (AC-6). Real light/dark and live-DOM behavior in Google Chat verified manually (Phase 5).

## Checklist (Definition of Done)
- [x] Follows Coding Standards
- [x] Added/updated tests; CI passes
- [x] Documentation updated (ADR-MAIN-009 + registry; ADR-MAIN-002 → Superseded; CR-03)
- [x] No secrets/PII logged; security considered (no mermaid lib in detect path; no innerHTML; invalid fenced bodies caught by render fallback under securityLevel 'strict')
- [x] Self-reviewed my own diff

## Screenshots / Notes
AC coverage — AC-1 (fence-trust, type outside allowlist), AC-2 (expanded keywords unfenced), AC-3 (no false positive on unfenced non-Mermaid), AC-4 (fenced invalid → detected → render fallback), AC-5 (`mermaid` exact-match strip, `mindmap` preserved), AC-6 (idempotent marker unchanged).

**Trade-off (per ADR-MAIN-009):** the unfenced keyword allowlist still needs manual extension for new types pasted without a fence; the fenced (canonical) path is future-proof. Slightly larger false-positive surface on self-fenced blocks, bounded safely by the render error-fallback.
