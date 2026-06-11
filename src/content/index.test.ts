import { describe, expect, it, vi } from 'vitest';
import { LOG_PREFIX, createLogger } from '../lib/logger';
import { CONTENT_LOADED_MESSAGE, initContentScript } from './index';

describe('initContentScript', () => {
  it('logs the loaded message exactly once per page load (AC-3)', () => {
    const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    initContentScript(logger);
    expect(logger.info).toHaveBeenCalledTimes(1);
    expect(logger.info).toHaveBeenCalledWith(CONTENT_LOADED_MESSAGE);
  });

  it('emits the prefixed line end-to-end through a real logger (AC-3)', () => {
    const sink = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    initContentScript(createLogger(sink));
    expect(sink.info).toHaveBeenCalledWith(`${LOG_PREFIX} ${CONTENT_LOADED_MESSAGE}`);
  });
});
