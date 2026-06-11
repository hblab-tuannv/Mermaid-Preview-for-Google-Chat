import { describe, expect, it, vi } from 'vitest';
import { SW_STARTED_MESSAGE, initBackground } from './index';

describe('initBackground', () => {
  it('logs that the service worker started exactly once (AC-2)', () => {
    const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    initBackground(logger);
    expect(logger.info).toHaveBeenCalledTimes(1);
    expect(logger.info).toHaveBeenCalledWith(SW_STARTED_MESSAGE);
  });
});
