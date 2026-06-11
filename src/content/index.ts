import { detectMermaidBlocks } from '../lib/detect';
import { Logger, createLogger } from '../lib/logger';
import { type ObserveOptions, observeChildList } from '../lib/observe';
import { MermaidRenderer, renderMermaidBlock } from '../lib/render';

/** Message passed to the logger; the logger adds the [mermaid-preview] prefix. */
export const CONTENT_LOADED_MESSAGE = 'content script loaded';

/**
 * Detect and render every Mermaid block under `root` (defaults to the page
 * document). Safe to call with no DOM (returns 0). US-004 will re-run this from
 * a MutationObserver for dynamically loaded messages.
 */
export async function previewMermaidIn(
  root?: ParentNode,
  opts: { renderer?: MermaidRenderer } = {},
): Promise<number> {
  const scope = root ?? (globalThis as { document?: Document }).document;
  if (!scope) {
    return 0;
  }
  const blocks = detectMermaidBlocks(scope);
  for (const block of blocks) {
    await renderMermaidBlock(block, opts);
  }
  return blocks.length;
}

/**
 * Entry point injected into chat.google.com pages: confirm injection, render
 * the Mermaid blocks already present, then keep watching for dynamically loaded
 * messages (scroll-back, incoming messages) and render those too (ADR-MAIN-004).
 * Returns a disconnect function so the observer can be torn down (AC-6); `opts`
 * lets tests inject a renderer and a controllable observer.
 */
export function initContentScript(
  logger: Logger = createLogger(),
  opts: { renderer?: MermaidRenderer; observe?: ObserveOptions } = {},
): () => void {
  logger.info(CONTENT_LOADED_MESSAGE);
  const doc = (globalThis as { document?: Document }).document;
  void previewMermaidIn(doc, { renderer: opts.renderer });
  if (!doc) {
    return () => {};
  }
  return observeChildList(
    doc.body,
    () => void previewMermaidIn(doc.body, { renderer: opts.renderer }),
    opts.observe,
  );
}

initContentScript();
