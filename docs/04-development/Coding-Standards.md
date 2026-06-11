---
version: "1.0"
date: "2026-06-11T10:12:59Z"
owner: "<...>"
---

# Coding Standards — Chrome Extension for Google Chat (Mermaid Preview)

## 1. Languages & Versions
- TypeScript 5.x (strict mode) — style guide: https://google.github.io/styleguide/tsguide.html
- Chrome Extension Manifest V3 (service worker background, content scripts)
- Node 20.x LTS for the build/dev toolchain

## 2. Formatting
- **Formatter:** Prettier (runs automatically via lint-staged / CI)
- **Indentation:** 2 spaces
- **Max line length:** 100

## 3. Naming Conventions
| Element | Convention | Example |
|---|---|---|
| Variables | camelCase | `mermaidSource` |
| Functions | camelCase | `renderDiagram()` |
| Classes | PascalCase | `DiagramRenderer` |
| Constants | UPPER_SNAKE | `MAX_DIAGRAM_SIZE` |
| Files | kebab-case | `content-script.ts` |

## 4. Code Structure
- Standard MV3 layout: `src/background/` (service worker), `src/content/` (content scripts injected into chat.google.com), `src/lib/` (shared rendering/util), `src/popup/` (optional UI). `manifest.json` at project root or `public/`.
- Bundled with Vite (`vite build`) into `dist/`; load `dist/` as an unpacked extension.
- Keep functions short and single-purpose (target < 50 lines, cyclomatic complexity ≤ 10).
- DOM-mutating code lives only in content scripts; rendering logic stays framework-agnostic in `src/lib/`.

## 5. Error Handling
- Use typed exceptions; never silently swallow errors. A failed Mermaid render must fall back to showing the original code block, not break the page.
- Wrap all `chrome.*` async API calls in try/catch and surface failures via `console.warn` with a clear prefix.

## 6. Logging
- Levels via `console.debug/info/warn/error`, prefixed with `[mermaid-preview]`.
- Never log message contents, user identifiers, or any Google Chat PII. Log only diagnostic state (render success/failure, diagram byte length).

## 7. Security
- Content script must sanitize Mermaid output (Mermaid `securityLevel: 'strict'`); never inject untrusted HTML without sanitization.
- Request the minimum host permissions (`https://chat.google.com/*`) and the minimum API permissions in `manifest.json`. No `<all_urls>`.
- No remote code execution; all dependencies bundled at build time (MV3 forbids remote scripts).
- Run `npm audit` / dependency scanning in CI.

## 8. Comments & Documentation
- TSDoc comments on exported functions/classes. Comment the *why* (e.g. why a render fallback exists), not the *what*.
- Keep `README.md` load/build instructions current.

## 9. Testing Requirements
- **Min coverage:** 80%
- Unit tests (Vitest) required for all rendering/parsing logic in `src/lib/`. DOM-injection behavior covered with jsdom or Chrome DevTools MCP where feasible.

## 10. Tooling (enforced in CI)
- Linter: ESLint (`@typescript-eslint`) · Formatter: Prettier · Static analysis: `tsc --noEmit` (strict) · Security scan: `npm audit`
