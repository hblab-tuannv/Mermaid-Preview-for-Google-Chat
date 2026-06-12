---
name: overlay-and-control-cleanup-patterns
description: Established MAIN-epic design patterns for in-page overlay (vs Fullscreen API), per-block control attach/cleanup, and the resetPreviews removal contract
metadata:
  type: project
---

Design patterns adopted in epic MAIN (Chrome MV3 Mermaid-in-Google-Chat extension), to reuse instead of re-deriving.

**In-page overlay over native Fullscreen API** (ADR-MAIN-007).
**Why:** Fullscreen needs user-gesture + can be blocked by host-page policy in an embedded context (Google Chat), and is untestable in jsdom. A `position:fixed inset:0` extension-created `<div>` overlay is self-contained, doesn't couple to Chat's fragile DOM (the INC-MAIN-2026-06-11-02 lesson), and is fully jsdom-testable.
**How to apply:** for any "expand/zoom/lightbox" UX in this extension, default to a DOM overlay, not browser fullscreen APIs.

**Clone, never move, rendered SVG into transient UI.**
**Why:** the rendered SVG (`data-mermaid-preview="rendered"`) lives in the message and powers the US-004 toggle; moving it empties the preview and breaks toggle. Use `svg.cloneNode(true)`.
**How to apply:** any feature that needs the SVG elsewhere clones it; keep `securityLevel:'strict'` and never `innerHTML` untrusted — clone/createElement only, no new XSS surface.

**Zoom/pan via CSS `transform` (scale+translate), not SVG viewBox** (ADR-MAIN-007). View-only transform, reversible, doesn't touch Mermaid's baked SVG; jsdom tests assert `style.transform` string changes, not pixels.

**Per-block controls are created once *by structure*, not by a marker.** `attachToggle` (ADR-MAIN-004) and `attachZoom` (ADR-MAIN-007) are both called from the already-idempotent success path of `renderMermaidBlock`, so each runs exactly once per block — no separate idempotency attribute needed. Error blocks (`data-mermaid-preview="error"`) skip these calls, so they get no controls. Controls placed AFTER the preview container (`preview.after(button)`) so they stay visible in both preview/source states.

**Listener-leak contract: total teardown, not just keydown.** A teardown handle `() => void` (mirrors observe.ts `disconnect` model) must remove EVERY document-level listener. Catalogue them explicitly in the ADR: `keydown` (Esc) is document-level → must remove; `wheel`/`mousedown`/clicks scoped to the overlay node → GC'd on `.remove()`; drag `mousemove`/`mouseup` are document-level → removed on mouseup AND in close. One single `close` path serves all dismiss routes (Esc/backdrop/X) and returns focus to the opener.

**`resetPreviews` (US-005) is the real work when adding a per-block control.** It removes the container + following control siblings. Adding a new control means: (1) extend the removal to strip ALL following control siblings by marker (`TOGGLE_ATTR` OR `ZOOM_ATTR` ...), not a fixed single sibling, or you strand an orphan; (2) if the control opens transient global UI (an overlay), `resetPreviews` has no teardown reference — expose a module-level singleton handle + a no-op-safe `closeActiveOverlay()` that resetPreviews calls before DOM cleanup. Adjacency after US-006: `source → container → zoom → toggle` (attachZoom is called after attachToggle but both use `preview.after()`, so zoom lands as the container's immediate next sibling, before toggle — removal is marker-scan so order-independent).

**Small-mode gate note:** an overlay/interaction-model decision is significant + hard-to-reverse → the CONDITIONAL design gate FIRES (not skipped).
