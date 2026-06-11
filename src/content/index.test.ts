import { describe, expect, it, vi } from 'vitest';
import { CONTENT_LOADED_MESSAGE, initContentScript } from './index';

describe('initContentScript', () => {
  it('logs the loaded message exactly once per page load (AC-3)', () => {
    const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    initContentScript(logger);
    expect(logger.info).toHaveBeenCalledTimes(1);
    expect(logger.info).toHaveBeenCalledWith(CONTENT_LOADED_MESSAGE);
  });
});
