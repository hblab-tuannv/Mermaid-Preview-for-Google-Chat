/** Shared diagnostic prefix so extension logs are easy to filter in DevTools. */
export const LOG_PREFIX = '[mermaid-preview]';

export interface Logger {
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}

type Sink = Pick<Console, 'info' | 'warn' | 'error'>;

/**
 * Build a logger that tags every line with {@link LOG_PREFIX}. The sink is
 * injectable so tests can assert on calls without touching the real console.
 * Never log message contents or PII — see Coding-Standards §6.
 */
export function createLogger(sink: Sink = console): Logger {
  return {
    info: (message) => sink.info(`${LOG_PREFIX} ${message}`),
    warn: (message) => sink.warn(`${LOG_PREFIX} ${message}`),
    error: (message) => sink.error(`${LOG_PREFIX} ${message}`),
  };
}
