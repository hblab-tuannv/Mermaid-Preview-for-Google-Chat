import { describe, expect, it, vi } from 'vitest';
import { LOG_PREFIX, createLogger } from './logger';

describe('createLogger', () => {
  it('prefixes info messages with the extension tag (AC-3)', () => {
    const sink = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    createLogger(sink).info('content script loaded');
    expect(sink.info).toHaveBeenCalledTimes(1);
    expect(sink.info).toHaveBeenCalledWith(`${LOG_PREFIX} content script loaded`);
  });

  it('prefixes warn and error messages too', () => {
    const sink = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const logger = createLogger(sink);
    logger.warn('heads up');
    logger.error('boom');
    expect(sink.warn).toHaveBeenCalledWith(`${LOG_PREFIX} heads up`);
    expect(sink.error).toHaveBeenCalledWith(`${LOG_PREFIX} boom`);
  });

  it('defaults to the global console sink', () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    createLogger().info('default sink');
    expect(spy).toHaveBeenCalledWith(`${LOG_PREFIX} default sink`);
    spy.mockRestore();
  });
});
