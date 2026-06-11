import { Logger, createLogger } from '../lib/logger';

/** Message passed to the logger; the logger adds the [mermaid-preview] prefix. */
export const SW_STARTED_MESSAGE = 'service worker started';

/**
 * MV3 service worker entry. Stateless for US-001 — it only confirms the worker
 * registered. Message routing arrives with later stories.
 */
export function initBackground(logger: Logger = createLogger()): void {
  logger.info(SW_STARTED_MESSAGE);
}

initBackground();
