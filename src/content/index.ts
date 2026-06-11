import { Logger, createLogger } from '../lib/logger';

/** Message passed to the logger; the logger adds the [mermaid-preview] prefix. */
export const CONTENT_LOADED_MESSAGE = 'content script loaded';

/**
 * Entry point injected into chat.google.com pages. For US-001 it only confirms
 * injection; detection/rendering arrive in later stories.
 */
export function initContentScript(logger: Logger = createLogger()): void {
  logger.info(CONTENT_LOADED_MESSAGE);
}

initContentScript();
