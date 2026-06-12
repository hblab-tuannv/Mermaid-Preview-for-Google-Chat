# Mermaid Preview for Google Chat

Chrome extension (Manifest V3) that renders Mermaid code blocks inline in Google Chat web.

## Screenshots

Inline rendering of a Mermaid code block in a Google Chat message:

![Mermaid diagram rendered inline in Google Chat](docs/screenshots/inline-render.png)

Click a diagram to open it in a full-screen zoom view:

![Diagram opened in full-screen zoom](docs/screenshots/fullscreen-zoom.png)

## Develop

```bash
npm install        # install toolchain
npm test           # run Vitest with coverage
npm run build      # build dist/ (content.js, background.js, manifest.json)
```

## Load the extension

1. `npm run build`
2. Open `chrome://extensions`, enable **Developer mode**.
3. **Load unpacked** → select the `dist/` folder.
4. Open https://chat.google.com — the content script logs `[mermaid-preview] content script loaded`.

## Architecture

See `docs/features/MAIN/US-001/design.md` (ADR-MAIN-001): Vite multi-entry IIFE build,
TypeScript strict, hand-authored `public/manifest.json`. Rendering logic lives in
`src/lib/` (framework-agnostic, unit-tested); DOM injection in `src/content/`.
