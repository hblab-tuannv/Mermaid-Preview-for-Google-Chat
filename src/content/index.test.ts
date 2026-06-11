// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LOG_PREFIX, createLogger } from '../lib/logger';
import type { MermaidRenderer } from '../lib/render';
import { CONTENT_LOADED_MESSAGE, initContentScript, previewMermaidIn } from './index';

beforeEach(() => {
  document.body.replaceChildren();
});

function okRenderer(): MermaidRenderer {
  return {
    async render(id) {
      return { svg: `<svg id="${id}"></svg>` };
    },
  };
}

function mountCode(text: string): void {
  const pre = document.createElement('pre');
  pre.textContent = text;
  document.body.appendChild(pre);
}

describe('initContentScript', () => {
  it('logs the loaded message exactly once per page load (AC-3 of US-001)', () => {
    const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    initContentScript(logger);
    expect(logger.info).toHaveBeenCalledTimes(1);
    expect(logger.info).toHaveBeenCalledWith(CONTENT_LOADED_MESSAGE);
  });

  it('emits the prefixed line end-to-end through a real logger', () => {
    const sink = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    initContentScript(createLogger(sink));
    expect(sink.info).toHaveBeenCalledWith(`${LOG_PREFIX} ${CONTENT_LOADED_MESSAGE}`);
  });
});

describe('previewMermaidIn', () => {
  it('renders only the Mermaid blocks under the root (US-003 wiring)', async () => {
    mountCode('function foo(){}');
    mountCode('graph TD\nA-->B');
    const count = await previewMermaidIn(document, { renderer: okRenderer() });
    expect(count).toBe(1); // only the Mermaid block is detected and rendered
    expect(document.querySelectorAll('[data-mermaid-preview="rendered"]')).toHaveLength(1);
  });

  it('returns 0 when there is no document scope', async () => {
    vi.stubGlobal('document', undefined);
    try {
      expect(await previewMermaidIn(undefined)).toBe(0);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
